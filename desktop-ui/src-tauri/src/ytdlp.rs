//! yt-dlp integration: tool discovery/installation, format probing, and the
//! process-driven download path for `kind == "video"` downloads.
//!
//! yt-dlp (and optionally ffmpeg, for merging separate video+audio streams)
//! live in `<app-data>/tools/`. They can also be picked up from PATH if the
//! user already has them installed.

use crate::engine::{TaskCtx, EVENT_CHANGED};
use crate::models::{file_type_from_name, now_millis, Download};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const YTDLP_URL: &str =
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const FFMPEG_ZIP_URL: &str =
    "https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip";

#[cfg(windows)]
const YTDLP_EXE: &str = "yt-dlp.exe";
#[cfg(not(windows))]
const YTDLP_EXE: &str = "yt-dlp";
#[cfg(windows)]
const FFMPEG_EXE: &str = "ffmpeg.exe";
#[cfg(not(windows))]
const FFMPEG_EXE: &str = "ffmpeg";

pub fn tools_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir())
        .join("tools")
}

/// Locate a tool: our tools dir first, then PATH.
fn find_tool(app: &AppHandle, exe: &str) -> Option<PathBuf> {
    let local = tools_dir(app).join(exe);
    if local.exists() {
        return Some(local);
    }
    let path_var = std::env::var_os("PATH")?;
    std::env::split_paths(&path_var)
        .map(|p| p.join(exe))
        .find(|p| p.exists())
}

pub fn find_ytdlp(app: &AppHandle) -> Option<PathBuf> {
    find_tool(app, YTDLP_EXE)
}

pub fn find_ffmpeg(app: &AppHandle) -> Option<PathBuf> {
    find_tool(app, FFMPEG_EXE)
}

fn command(program: &Path) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    cmd.stdin(Stdio::null());
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ToolsStatus {
    pub ytdlp_path: Option<String>,
    pub ytdlp_version: Option<String>,
    pub ffmpeg_path: Option<String>,
}

pub async fn status(app: &AppHandle) -> ToolsStatus {
    let ytdlp = find_ytdlp(app);
    let version = match &ytdlp {
        Some(p) => command(p)
            .arg("--version")
            .output()
            .await
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()),
        None => None,
    };
    ToolsStatus {
        ytdlp_path: ytdlp.map(|p| p.to_string_lossy().to_string()),
        ytdlp_version: version,
        ffmpeg_path: find_ffmpeg(app).map(|p| p.to_string_lossy().to_string()),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
    pub current: Option<String>,
    pub latest: Option<String>,
    pub outdated: bool,
}

/// Compare the installed yt-dlp against the newest GitHub release. yt-dlp
/// breaks whenever sites change their players, so staleness is the #1 cause
/// of grabber failures.
pub async fn check_update(app: &AppHandle) -> UpdateCheck {
    let s = status(app).await;
    let latest = latest_ytdlp_version().await;
    let outdated = matches!(
        (&s.ytdlp_version, &latest),
        (Some(cur), Some(new)) if cur != new
    );
    UpdateCheck {
        current: s.ytdlp_version,
        latest,
        outdated,
    }
}

/// Latest release tag, read from the releases/latest redirect (no API quota).
async fn latest_ytdlp_version() -> Option<String> {
    let client = reqwest::Client::builder()
        .user_agent("ApexDownloadManager/1.0")
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(10))
        .build()
        .ok()?;
    let resp = client
        .get("https://github.com/yt-dlp/yt-dlp/releases/latest")
        .send()
        .await
        .ok()?;
    let loc = resp.headers().get(reqwest::header::LOCATION)?.to_str().ok()?;
    let tag = loc.trim_end_matches('/').rsplit('/').next()?.trim();
    (!tag.is_empty() && tag != "releases").then(|| tag.to_string())
}

/// Stream `url` to `dest`, emitting `tools:progress` so the UI can show a bar.
async fn fetch_to_file(app: &AppHandle, url: &str, dest: &Path, tool: &str) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("ApexDownloadManager/1.0")
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("download failed: {e}"))?;
    let total = resp.content_length().unwrap_or(0);
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("cannot create {}: {e}", dest.display()))?;
    let mut stream = resp.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_emit = Instant::now();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("download failed: {e}"))?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        if last_emit.elapsed() > Duration::from_millis(300) {
            last_emit = Instant::now();
            let _ = app.emit(
                "tools:progress",
                serde_json::json!({ "tool": tool, "downloaded": downloaded, "total": total }),
            );
        }
    }
    file.flush().await.map_err(|e| e.to_string())?;
    let _ = app.emit(
        "tools:progress",
        serde_json::json!({ "tool": tool, "downloaded": downloaded, "total": downloaded }),
    );
    Ok(())
}

pub async fn install_ytdlp(app: &AppHandle) -> Result<ToolsStatus, String> {
    #[cfg(not(windows))]
    return Err("Automatic install is only supported on Windows; install yt-dlp from your package manager".into());
    #[cfg(windows)]
    {
        let dest = tools_dir(app).join(YTDLP_EXE);
        let tmp = dest.with_extension("exe.tmp");
        fetch_to_file(app, YTDLP_URL, &tmp, "yt-dlp").await?;
        // Replace atomically so a running yt-dlp.exe never gets half a binary.
        std::fs::rename(&tmp, &dest).map_err(|e| format!("cannot install yt-dlp: {e}"))?;
        Ok(status(app).await)
    }
}

pub async fn install_ffmpeg(app: &AppHandle) -> Result<ToolsStatus, String> {
    #[cfg(not(windows))]
    return Err("Automatic install is only supported on Windows; install ffmpeg from your package manager".into());
    #[cfg(windows)]
    {
        let dir = tools_dir(app);
        let zip_path = dir.join("ffmpeg.zip.tmp");
        fetch_to_file(app, FFMPEG_ZIP_URL, &zip_path, "ffmpeg").await?;
        let dir2 = dir.clone();
        let zip2 = zip_path.clone();
        // Pull just ffmpeg.exe/ffprobe.exe out of the ~180 MB build zip.
        tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
            let file = std::fs::File::open(&zip2).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
            let mut extracted = 0;
            for i in 0..archive.len() {
                let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
                let name = entry.name().rsplit('/').next().unwrap_or("").to_string();
                if name == "ffmpeg.exe" || name == "ffprobe.exe" {
                    let mut out =
                        std::fs::File::create(dir2.join(&name)).map_err(|e| e.to_string())?;
                    std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
                    extracted += 1;
                }
            }
            if extracted == 0 {
                return Err("ffmpeg.exe not found in the downloaded archive".into());
            }
            Ok(())
        })
        .await
        .map_err(|e| e.to_string())??;
        let _ = std::fs::remove_file(&zip_path);
        Ok(status(app).await)
    }
}

// ---------------------------------------------------------------------------
// Browser cookies for sign-in-gated videos
// ---------------------------------------------------------------------------

/// One cookie handed over by the browser extension with a /grab request.
#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GrabCookie {
    pub name: String,
    pub value: String,
    #[serde(default)]
    pub domain: String,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub secure: bool,
    /// Unix seconds; 0 = session cookie.
    #[serde(default)]
    pub expires: u64,
}

pub struct JarEntry {
    host: String,
    cookies: Vec<GrabCookie>,
    /// Set once a cookie-assisted probe succeeds; same-host video downloads
    /// then run yt-dlp with the cookies too, so the queued download doesn't
    /// fail on the same sign-in wall the probe just cleared.
    armed: bool,
}

/// Cookies from the latest extension /grab, memory only. A single slot is
/// enough: the Grab Video dialog handles one page at a time, and each new
/// /grab replaces the previous entry. Nothing here ever reaches the DB; an
/// app restart simply forgets them.
#[derive(Default)]
pub struct GrabCookieJar(std::sync::Mutex<Option<JarEntry>>);

const MAX_JAR_COOKIES: usize = 200;

impl GrabCookieJar {
    /// Replace the jar with this grab's cookies (or clear it when empty).
    pub fn store(&self, host: String, mut cookies: Vec<GrabCookie>) {
        cookies.truncate(MAX_JAR_COOKIES);
        *self.0.lock().unwrap() = (!cookies.is_empty()).then_some(JarEntry {
            host,
            cookies,
            armed: false,
        });
    }

    fn for_host(&self, host: &str, armed_only: bool) -> Option<Vec<GrabCookie>> {
        self.0
            .lock()
            .unwrap()
            .as_ref()
            .filter(|e| host_matches(&e.host, host) && (!armed_only || e.armed))
            .map(|e| e.cookies.clone())
    }

    fn arm(&self, host: &str) {
        if let Some(e) = self.0.lock().unwrap().as_mut() {
            if host_matches(&e.host, host) {
                e.armed = true;
            }
        }
    }
}

/// Same site, ignoring a leading "www." (a grab from www.youtube.com must
/// cover playlist entry URLs on youtube.com and vice versa).
fn host_matches(a: &str, b: &str) -> bool {
    fn norm(h: &str) -> &str {
        h.strip_prefix("www.").unwrap_or(h)
    }
    norm(&a.to_ascii_lowercase()) == norm(&b.to_ascii_lowercase())
}

fn url_host(url: &str) -> Option<String> {
    reqwest::Url::parse(url)
        .ok()?
        .host_str()
        .map(|h| h.to_ascii_lowercase())
}

/// Netscape cookies.txt written for a single yt-dlp run; deleted on drop so
/// the cookies never outlive the process call.
struct TempCookieFile(PathBuf);

impl Drop for TempCookieFile {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

fn write_cookie_file(url: &str, cookies: &[GrabCookie]) -> Result<TempCookieFile, String> {
    fn clean(s: &str) -> String {
        s.replace(['\t', '\r', '\n'], "")
    }
    let fallback_host = url_host(url).unwrap_or_default();
    let mut out = String::from("# Netscape HTTP Cookie File\n");
    for c in cookies {
        let name = clean(&c.name);
        if name.is_empty() {
            continue;
        }
        let domain = if c.domain.is_empty() {
            fallback_host.clone()
        } else {
            clean(&c.domain)
        };
        let include_sub = if domain.starts_with('.') { "TRUE" } else { "FALSE" };
        let path = if c.path.is_empty() { "/".into() } else { clean(&c.path) };
        let secure = if c.secure { "TRUE" } else { "FALSE" };
        out.push_str(&format!(
            "{domain}\t{include_sub}\t{path}\t{secure}\t{}\t{name}\t{}\n",
            c.expires,
            clean(&c.value)
        ));
    }
    let file = std::env::temp_dir().join(format!("apex-grab-{}.txt", uuid::Uuid::new_v4()));
    std::fs::write(&file, out).map_err(|e| format!("cannot write cookie file: {e}"))?;
    Ok(TempCookieFile(file))
}

// ---------------------------------------------------------------------------
// Probing
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FormatOption {
    /// yt-dlp -f selector string.
    pub selector: String,
    pub label: String,
    pub ext: String,
    pub audio_only: bool,
    pub size_bytes: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistEntry {
    pub url: String,
    pub title: String,
    pub duration_seconds: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProbe {
    pub title: String,
    pub uploader: Option<String>,
    pub duration_seconds: Option<f64>,
    pub thumbnail: Option<String>,
    pub has_ffmpeg: bool,
    pub options: Vec<FormatOption>,
    /// Present when the URL is a playlist: its videos, in playlist order.
    /// `options` then holds generic quality ladders (per-video formats vary).
    pub playlist: Option<Vec<PlaylistEntry>>,
}

const MAX_PLAYLIST_ENTRIES: usize = 200;

pub async fn probe(
    app: &AppHandle,
    url: &str,
    use_browser_cookies: bool,
) -> Result<VideoProbe, String> {
    let ytdlp = find_ytdlp(app)
        .ok_or("yt-dlp is not installed; install it under Settings → Video Grabber")?;
    let proxy_url = app
        .try_state::<crate::engine::DownloadManager>()
        .map(|m| m.get_settings().proxy_url)
        .unwrap_or_default();
    // Opt-in only: the user clicked "Retry using your browser sign-in" after
    // a sign-in-gated failure. The cookies came in with the extension's /grab
    // and sit in the memory-only jar.
    let host = url_host(url);
    let cookie_file = if use_browser_cookies {
        let cookies = host
            .as_deref()
            .and_then(|h| app.state::<GrabCookieJar>().for_host(h, false))
            .ok_or(
                "No browser cookies are available for this site. Use Grab video from the browser extension again.",
            )?;
        Some(write_cookie_file(url, &cookies)?)
    } else {
        None
    };
    // --flat-playlist: playlist URLs list their entries without probing each
    // video (fast); plain video URLs still return full format data.
    let mut cmd = command(&ytdlp);
    cmd.args(["-J", "--flat-playlist", "--no-warnings"]);
    if !proxy_url.is_empty() {
        cmd.arg("--proxy").arg(&proxy_url);
    }
    if let Some(f) = &cookie_file {
        cmd.arg("--cookies").arg(&f.0);
    }
    cmd.arg("--").arg(url);
    let output = tokio::time::timeout(Duration::from_secs(90), cmd.output())
    .await
    .map_err(|_| "yt-dlp timed out while analyzing the URL".to_string())?
    .map_err(|e| format!("cannot run yt-dlp: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let last = err
            .lines()
            .rev()
            .find(|l| !l.trim().is_empty())
            .unwrap_or("yt-dlp failed");
        return Err(last.trim().trim_start_matches("ERROR: ").to_string());
    }

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("bad yt-dlp output: {e}"))?;
    // The cookies worked here, so the queued download for this site will hit
    // the same wall; arm the jar so drive_video runs with them too.
    if use_browser_cookies {
        if let Some(h) = &host {
            app.state::<GrabCookieJar>().arm(h);
        }
    }
    let has_ffmpeg = find_ffmpeg(app).is_some();
    if json["_type"].as_str() == Some("playlist") {
        Ok(build_playlist_probe(&json, has_ffmpeg))
    } else {
        Ok(build_probe(&json, has_ffmpeg))
    }
}

fn build_playlist_probe(json: &serde_json::Value, has_ffmpeg: bool) -> VideoProbe {
    let entries = json["entries"]
        .as_array()
        .map(|a| a.as_slice())
        .unwrap_or_default()
        .iter()
        .filter_map(|e| {
            let title = e["title"].as_str().unwrap_or("video").to_string();
            let url = e["webpage_url"]
                .as_str()
                .or_else(|| e["url"].as_str())
                .filter(|u| u.starts_with("http"))
                .map(String::from)
                .or_else(|| {
                    // Flat YouTube entries sometimes carry only the video id.
                    let id = e["id"].as_str()?;
                    let ie = e["ie_key"].as_str().unwrap_or_default().to_lowercase();
                    ie.contains("youtube")
                        .then(|| format!("https://www.youtube.com/watch?v={id}"))
                })?;
            Some(PlaylistEntry {
                url,
                title,
                duration_seconds: e["duration"].as_f64(),
            })
        })
        .take(MAX_PLAYLIST_ENTRIES)
        .collect::<Vec<_>>();

    // Generic ladder - per-video formats differ, so offer height caps.
    let sel = |h: u64| {
        if has_ffmpeg {
            format!("bv*[height<={h}]+ba/b[height<={h}]")
        } else {
            format!("b[height<={h}]")
        }
    };
    let mut options = vec![FormatOption {
        selector: if has_ffmpeg { "bv*+ba/b".into() } else { "b".into() },
        label: "Best available".into(),
        ext: "mp4".into(),
        audio_only: false,
        size_bytes: None,
    }];
    for h in [1080u64, 720, 480, 360] {
        options.push(FormatOption {
            selector: sel(h),
            label: format!("Up to {h}p"),
            ext: "mp4".into(),
            audio_only: false,
            size_bytes: None,
        });
    }
    options.push(FormatOption {
        selector: "ba[ext=m4a]/ba/b".into(),
        label: "Audio only".into(),
        ext: "m4a".into(),
        audio_only: true,
        size_bytes: None,
    });

    VideoProbe {
        title: json["title"].as_str().unwrap_or("Playlist").to_string(),
        uploader: json["uploader"]
            .as_str()
            .or_else(|| json["channel"].as_str())
            .map(String::from),
        duration_seconds: None,
        thumbnail: json["thumbnails"]
            .as_array()
            .and_then(|t| t.last())
            .and_then(|t| t["url"].as_str())
            .map(String::from),
        has_ffmpeg,
        options,
        playlist: Some(entries),
    }
}

fn build_probe(json: &serde_json::Value, has_ffmpeg: bool) -> VideoProbe {
    let title = json["title"].as_str().unwrap_or("video").to_string();
    let formats: Vec<&serde_json::Value> = json["formats"]
        .as_array()
        .map(|a| a.iter().collect())
        .unwrap_or_default();

    fn size_of(f: &serde_json::Value) -> Option<u64> {
        f["filesize"]
            .as_u64()
            .or_else(|| f["filesize_approx"].as_u64())
    }
    fn is_video(f: &serde_json::Value) -> bool {
        f["vcodec"].as_str().map_or(false, |v| v != "none") && f["height"].as_u64().is_some()
    }
    fn is_audio_only(f: &serde_json::Value) -> bool {
        f["acodec"].as_str().map_or(false, |a| a != "none")
            && f["vcodec"].as_str().map_or(true, |v| v == "none")
    }
    fn is_progressive(f: &serde_json::Value) -> bool {
        is_video(f) && f["acodec"].as_str().map_or(false, |a| a != "none")
    }

    // Best audio-stream size, used to estimate merged sizes.
    let best_audio_size = formats
        .iter()
        .copied()
        .filter(|f| is_audio_only(f))
        .filter_map(size_of)
        .max();

    // With ffmpeg any video stream can be merged with audio; without it only
    // progressive (audio+video in one file) formats play back correctly.
    let candidates: Vec<&serde_json::Value> = if has_ffmpeg {
        formats.iter().copied().filter(|f| is_video(f)).collect()
    } else {
        formats.iter().copied().filter(|f| is_progressive(f)).collect()
    };

    let mut heights: Vec<u64> = candidates
        .iter()
        .filter_map(|f| f["height"].as_u64())
        .collect();
    heights.sort_unstable();
    heights.dedup();
    heights.reverse();
    heights.truncate(8);

    let mut options = Vec::new();
    for h in &heights {
        // Size estimate: the largest stream at this height (+ audio if merging).
        let vsize = candidates
            .iter()
            .copied()
            .filter(|f| f["height"].as_u64() == Some(*h))
            .filter_map(size_of)
            .max();
        let (selector, ext, size) = if has_ffmpeg {
            (
                format!("bv*[height<={h}]+ba/b[height<={h}]"),
                "mp4".to_string(),
                vsize.map(|v| v + best_audio_size.unwrap_or(0)),
            )
        } else {
            let ext = candidates
                .iter()
                .copied()
                .filter(|f| f["height"].as_u64() == Some(*h))
                .last()
                .and_then(|f| f["ext"].as_str())
                .unwrap_or("mp4")
                .to_string();
            (format!("b[height<={h}]"), ext, vsize)
        };
        let fps = candidates
            .iter()
            .copied()
            .filter(|f| f["height"].as_u64() == Some(*h))
            .filter_map(|f| f["fps"].as_f64())
            .fold(0.0f64, f64::max);
        let fps_label = if fps > 40.0 {
            format!("{}", fps.round() as u64)
        } else {
            String::new()
        };
        options.push(FormatOption {
            selector,
            label: format!("{h}p{fps_label}"),
            ext,
            audio_only: false,
            size_bytes: size,
        });
    }

    if best_audio_size.is_some() || !formats.is_empty() {
        let audio_ext = formats
            .iter()
            .copied()
            .filter(|f| is_audio_only(f))
            .max_by_key(|f| size_of(f).unwrap_or(0))
            .and_then(|f| f["ext"].as_str())
            .unwrap_or("m4a")
            .to_string();
        options.push(FormatOption {
            selector: "ba[ext=m4a]/ba/b".into(),
            label: "Audio only".into(),
            ext: audio_ext,
            audio_only: true,
            size_bytes: best_audio_size,
        });
    }

    // No parseable formats at all (some extractors return a single URL):
    // offer plain "best".
    if options.is_empty() {
        options.push(FormatOption {
            selector: "b".into(),
            label: "Best available".into(),
            ext: json["ext"].as_str().unwrap_or("mp4").to_string(),
            audio_only: false,
            size_bytes: size_of(json),
        });
    }

    VideoProbe {
        title,
        uploader: json["uploader"]
            .as_str()
            .or_else(|| json["channel"].as_str())
            .map(String::from),
        duration_seconds: json["duration"].as_f64(),
        thumbnail: json["thumbnail"].as_str().map(String::from),
        has_ffmpeg,
        options,
        playlist: None,
    }
}

// ---------------------------------------------------------------------------
// Downloading
// ---------------------------------------------------------------------------

/// Drive a `kind == "video"` download through a yt-dlp child process.
/// Returns Ok(true) on completion, Ok(false) when cancelled, Err on failure -
/// the same contract as the HTTP engine's `drive_download`.
pub(crate) async fn drive_video(ctx: &TaskCtx, d: &mut Download) -> Result<bool, String> {
    let ytdlp = find_ytdlp(&ctx.app)
        .ok_or("yt-dlp is not installed; install it under Settings → Video Grabber")?;
    let ffmpeg = find_ffmpeg(&ctx.app);

    std::fs::create_dir_all(&d.save_path).map_err(|e| format!("cannot create folder: {e}"))?;

    // Output template: our chosen stem + yt-dlp's real extension (merging can
    // change it). Literal '%' in a title would be read as a template field.
    let stem = Path::new(&d.name)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| d.name.clone());
    // yt-dlp never overwrites - an existing "<stem>.mp4" would make it report
    // instant success without downloading. Mirror the HTTP engine: pick a
    // free " (n)" stem. Partials (.part/.ytdl) don't count, so resumes keep
    // their stem and continue.
    let stem = dedupe_stem(&d.save_path, &stem);
    if let Some(ext) = Path::new(&d.name).extension() {
        d.name = format!("{}.{}", stem, ext.to_string_lossy());
    }
    let template = format!("{}.%(ext)s", stem.replace('%', "%%"));

    let selector = d
        .video_format
        .clone()
        .unwrap_or_else(|| "bv*+ba/b".to_string());
    let (global_limit, proxy_url) = {
        let s = ctx.settings.lock().unwrap();
        (s.speed_limit_kbps, s.proxy_url.clone())
    };
    // yt-dlp takes a single -r, so honor the tighter of the two caps.
    let speed_limit = match (d.speed_limit_kbps, global_limit) {
        (0, g) => g,
        (t, 0) => t,
        (t, g) => t.min(g),
    };

    let mut cmd = command(&ytdlp);
    cmd.args([
        "--no-playlist",
        "--no-warnings",
        "--quiet",
        "--progress",
        "--newline",
        "--progress-template",
        "download:APEXP|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s",
        "--print",
        "after_move:filepath",
        "-N",
        "4",
    ]);
    cmd.arg("-f").arg(&selector);
    cmd.arg("-P").arg(&d.save_path);
    cmd.arg("-o").arg(&template);
    if let Some(ff) = &ffmpeg {
        if let Some(dir) = ff.parent() {
            cmd.arg("--ffmpeg-location").arg(dir);
        }
        if !d.video_format.as_deref().unwrap_or("").contains("ba[ext") {
            // Only meaningful when streams are merged; mp4 plays everywhere.
            cmd.arg("--merge-output-format").arg("mp4");
        }
    }
    if speed_limit > 0 {
        cmd.arg("-r").arg(format!("{speed_limit}K"));
    }
    if !proxy_url.is_empty() {
        cmd.arg("--proxy").arg(&proxy_url);
    }
    // Armed jar (the user's cookie-assisted probe succeeded for this site):
    // run the download with the same browser cookies. The temp file lives
    // only as long as this function; a restart loses the jar and the
    // download fails with the plain sign-in error instead.
    let cookie_guard = url_host(&d.url)
        .and_then(|h| ctx.app.try_state::<GrabCookieJar>()?.for_host(&h, true))
        .and_then(|cookies| write_cookie_file(&d.url, &cookies).ok());
    if let Some(f) = &cookie_guard {
        cmd.arg("--cookies").arg(&f.0);
    }
    cmd.arg("--").arg(&d.url);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    cmd.kill_on_drop(true);

    let mut child = cmd.spawn().map_err(|e| format!("cannot run yt-dlp: {e}"))?;
    let stdout = child.stdout.take().ok_or("no stdout from yt-dlp")?;
    let stderr = child.stderr.take().ok_or("no stderr from yt-dlp")?;

    // Collect stderr in the background for error reporting.
    let stderr_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        let mut tail: Vec<String> = Vec::new();
        while let Ok(Some(line)) = lines.next_line().await {
            if !line.trim().is_empty() {
                tail.push(line);
                if tail.len() > 20 {
                    tail.remove(0);
                }
            }
        }
        tail
    });

    let mut lines = BufReader::new(stdout).lines();
    let mut final_file: Option<String> = None;
    let mut last_emit = Instant::now();
    let mut last_save = Instant::now();
    let mut peak_total: u64 = 0;
    let mut phase_base: u64 = 0; // bytes finished in earlier phases (video, then audio)
    let mut prev_downloaded: u64 = 0;

    let cancelled = loop {
        let line = tokio::select! {
            _ = ctx.cancel.cancelled() => {
                let _ = child.start_kill();
                let _ = tokio::time::timeout(Duration::from_secs(5), child.wait()).await;
                break true;
            }
            l = lines.next_line() => match l {
                Ok(Some(l)) => l,
                _ => break false, // stdout closed: process is done
            },
        };
        if let Some(rest) = line.strip_prefix("APEXP|") {
            let mut it = rest.split('|');
            let num = |s: Option<&str>| s.and_then(|v| v.trim().parse::<f64>().ok());
            let downloaded = num(it.next()).unwrap_or(0.0) as u64;
            let total = num(it.next());
            let estimate = num(it.next());
            let speed = num(it.next()).unwrap_or(0.0);
            let eta = num(it.next()).unwrap_or(0.0);

            // A merged download runs as two sequential files (video then
            // audio); a new file resets downloaded_bytes. Accumulate phases so
            // the visible progress never jumps backwards.
            if downloaded < prev_downloaded {
                phase_base += prev_downloaded;
            }
            prev_downloaded = downloaded;

            let this_total = total.or(estimate).unwrap_or(0.0) as u64;
            peak_total = peak_total.max(phase_base + this_total);
            d.downloaded_bytes = phase_base + downloaded;
            d.size_bytes = peak_total.max(d.downloaded_bytes);
            d.progress = if d.size_bytes > 0 {
                (d.downloaded_bytes as f64 / d.size_bytes as f64 * 100.0).min(100.0)
            } else {
                0.0
            };
            d.speed_bytes_per_sec = speed as u64;
            d.eta_seconds = eta as u64;
            d.modified_at = now_millis();

            if last_emit.elapsed() > Duration::from_millis(400) {
                last_emit = Instant::now();
                let _ = ctx.app.emit(EVENT_CHANGED, &*d);
            }
            if last_save.elapsed() > Duration::from_secs(2) {
                last_save = Instant::now();
                let _ = ctx.db.lock().unwrap().upsert_download(d);
            }
        } else if !line.trim().is_empty() {
            // The only non-progress stdout line is --print after_move:filepath.
            final_file = Some(line.trim().to_string());
        }
    };

    if cancelled {
        // yt-dlp keeps .part files; a resume re-runs it and continues.
        return Ok(false);
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("yt-dlp did not exit cleanly: {e}"))?;
    let stderr_tail = stderr_task.await.unwrap_or_default();

    if !status.success() {
        let msg = stderr_tail
            .iter()
            .rev()
            .find(|l| l.contains("ERROR") || l.contains("error"))
            .or_else(|| stderr_tail.last())
            .cloned()
            .unwrap_or_else(|| format!("yt-dlp exited with {status}"));
        return Err(msg.trim().trim_start_matches("ERROR: ").to_string());
    }

    // Adopt the real output file (extension may differ from our guess).
    let target = final_file
        .map(PathBuf::from)
        .filter(|p| p.exists())
        .or_else(|| newest_file_with_stem(&d.save_path, &stem))
        .ok_or("yt-dlp finished but the output file was not found")?;
    if let Some(name) = target.file_name() {
        d.name = name.to_string_lossy().to_string();
        d.file_type = file_type_from_name(&d.name);
    }
    if let Ok(meta) = std::fs::metadata(&target) {
        d.size_bytes = meta.len();
        d.downloaded_bytes = meta.len();
    }

    // Mark-of-the-Web, same as engine downloads.
    #[cfg(windows)]
    crate::engine::write_motw(&target, &d.url);

    Ok(true)
}

/// First stem with no completed file ("<stem>.<ext>") in `dir`. In-flight
/// partials don't claim a stem, so a paused download resumes under its own.
fn dedupe_stem(dir: &str, stem: &str) -> String {
    let taken = |s: &str| -> bool {
        let prefix = format!("{s}.");
        std::fs::read_dir(dir).ok().is_some_and(|rd| {
            rd.flatten().any(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                name.strip_prefix(&prefix).is_some_and(|rest| {
                    !rest.contains('.') && !rest.is_empty()
                }) && !name.contains(".part")
                    && !name.ends_with(".ytdl")
            })
        })
    };
    if !taken(stem) {
        return stem.to_string();
    }
    for i in 1..1000 {
        let candidate = format!("{stem} ({i})");
        if !taken(&candidate) {
            return candidate;
        }
    }
    format!("{stem} ({})", uuid::Uuid::new_v4())
}

/// Fallback when --print gave us nothing: the most recent non-partial file in
/// the save dir whose name starts with our stem.
fn newest_file_with_stem(dir: &str, stem: &str) -> Option<PathBuf> {
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    for e in std::fs::read_dir(dir).ok()?.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if !name.starts_with(stem) || name.ends_with(".part") || name.ends_with(".ytdl") {
            continue;
        }
        let modified = e.metadata().and_then(|m| m.modified()).ok()?;
        if best.as_ref().map_or(true, |(t, _)| modified > *t) {
            best = Some((modified, e.path()));
        }
    }
    best.map(|(_, p)| p)
}

/// Delete yt-dlp working files (.part, .ytdl, fragment leftovers) for `d`.
pub fn remove_partials(d: &Download) {
    let stem = Path::new(&d.name)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| d.name.clone());
    if stem.is_empty() {
        return;
    }
    if let Ok(rd) = std::fs::read_dir(&d.save_path) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            let is_partial =
                name.contains(".part") || name.ends_with(".ytdl") || name.ends_with(".temp.mp4");
            if name.starts_with(&stem) && is_partial && name != d.name {
                let _ = std::fs::remove_file(e.path());
            }
        }
    }
}

