use crate::db::Db;
use crate::models::{
    category_for_type, file_type_from_name, now_millis, Download, DownloadStatus, Segment,
    Settings,
};
use reqwest::header;
use std::collections::HashMap;
use std::io::SeekFrom;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::io::{AsyncSeekExt, AsyncWriteExt};
use tokio_util::sync::CancellationToken;

const MIN_SEGMENT_BYTES: u64 = 256 * 1024;
const TEMP_SUFFIX: &str = ".adm";
/// Windows caps a path component at 255 chars; stay well under so the
/// save dir + name + ".adm" suffix still fit (tokenized CDN URLs can put
/// 1000+ chars in the last path segment).
const MAX_NAME_CHARS: usize = 150;
pub(crate) const EVENT_CHANGED: &str = "download:changed";
const EVENT_REMOVED: &str = "download:removed";

struct ActiveHandle {
    cancel: CancellationToken,
    removing: Arc<AtomicBool>,
    join: Option<tauri::async_runtime::JoinHandle<()>>,
}

/// A browser capture held for the user to approve before it downloads.
#[derive(Clone)]
struct PendingCapture {
    id: String,
    url: String,
    file_name: Option<String>,
    request_headers: Vec<(String, String)>,
    /// Display values shown in the approval window.
    name: String,
    folder: String,
    /// Unix millis when staged; stale entries are pruned (tokenized URLs
    /// expire long before a day passes anyway).
    staged_at: i64,
    /// From the post-stage probe; 0 until (unless) the server tells us.
    size_bytes: u64,
    /// Probe found the link refused (4xx) — shown as a hint in the prompt.
    warning: String,
}

/// The page that linked the file, from the browser-captured Referer —
/// shown in the approval window so the user can tell which site asked.
fn referrer_of(headers: &[(String, String)]) -> String {
    headers
        .iter()
        .find(|(k, _)| k == "referer")
        .map(|(_, v)| v.clone())
        .unwrap_or_default()
}

/// More prompts than this means something is auto-retrying, not a user
/// clicking links; further captures are rejected so the extension hands the
/// download back to the browser instead.
const MAX_PENDING_CAPTURES: usize = 25;
const MAX_PENDING_AGE_MS: i64 = 24 * 60 * 60 * 1000;

/// Identity of a capture for dedup: pages that auto-retry a canceled
/// download mint a fresh URL each attempt (rotating token/correlationId
/// query params), so compare the URL without its query plus the file name.
fn capture_key(url: &str, name: &str) -> String {
    let base = url.split(['?', '#']).next().unwrap_or(url);
    format!("{}|{}", base, name.to_ascii_lowercase())
}

/// What a fresh capture matches among the downloads we already have.
pub enum DupStatus {
    New,
    /// Same file is queued/downloading/paused right now (name of the match).
    Active(String),
    /// Same file finished earlier and is still on disk.
    Done,
}

/// The subset of a pending capture the approval window renders.
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CaptureView {
    id: String,
    url: String,
    name: String,
    folder: String,
    /// Page that linked the file ("" when unknown).
    referrer: String,
    /// 0 while unknown.
    size_bytes: u64,
    /// "" when there is nothing to warn about.
    warning: String,
}

pub struct DownloadManager {
    app: AppHandle,
    db: Arc<Mutex<Db>>,
    active: Arc<Mutex<HashMap<String, ActiveHandle>>>,
    settings: Arc<Mutex<Settings>>,
    limiter: Arc<RateLimiter>,
    /// Per-download limiters for running tasks, so a limit change applies to
    /// an in-flight download immediately.
    task_limiters: Arc<Mutex<HashMap<String, Arc<RateLimiter>>>>,
    /// Rebuilt when the proxy setting changes; running tasks keep the client
    /// they started with, new ones pick up the fresh one.
    client: Arc<Mutex<reqwest::Client>>,
    /// Ordered so the approval window shows captures in arrival order.
    pending_captures: Arc<Mutex<Vec<PendingCapture>>>,
}

/// Default User-Agent when the browser didn't supply its own (manual adds).
/// A browser UA, not an honest product string: WAFs commonly 403 download-tool
/// UAs (verified against Cloudflare — "ApexDownloadManager/1.0" was refused
/// where this exact string passed). Captures override it with the real
/// browser's UA via request_headers.
const DEFAULT_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/// Build the shared HTTP client, optionally routed through a proxy
/// (http://, https:// or socks5://, with optional user:pass@).
///
/// rustls rather than the platform TLS: Cloudflare's bot scoring 403s the
/// schannel ClientHello outright (same request, same headers passes with
/// rustls). Native roots keep corporate/AV MITM proxies working.
fn build_client(proxy_url: &str) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .user_agent(DEFAULT_UA)
        .use_rustls_tls()
        .connect_timeout(Duration::from_secs(30));
    let proxy_url = proxy_url.trim();
    if !proxy_url.is_empty() {
        let proxy = reqwest::Proxy::all(proxy_url)
            .map_err(|e| format!("invalid proxy \"{proxy_url}\": {e}"))?;
        builder = builder.proxy(proxy);
    }
    builder.build().map_err(|e| e.to_string())
}

impl DownloadManager {
    pub fn new(app: AppHandle) -> Result<Self, String> {
        let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let db = Db::open(&data_dir.join("apex.db"))?;
        let mut settings = db.load_settings();
        if settings.capture_token.is_empty() {
            settings.capture_token = uuid::Uuid::new_v4().simple().to_string();
            db.save_settings(&settings)?;
        }
        let limiter = Arc::new(RateLimiter::new(settings.speed_limit_kbps * 1024));
        // A saved-but-now-invalid proxy must not brick startup; fall back to
        // a direct connection (Settings still shows the configured value).
        let client = build_client(&settings.proxy_url).or_else(|_| build_client(""))?;
        Ok(DownloadManager {
            app,
            db: Arc::new(Mutex::new(db)),
            active: Arc::new(Mutex::new(HashMap::new())),
            settings: Arc::new(Mutex::new(settings)),
            limiter,
            task_limiters: Arc::new(Mutex::new(HashMap::new())),
            client: Arc::new(Mutex::new(client)),
            pending_captures: Arc::new(Mutex::new(Vec::new())),
        })
    }

    pub(crate) fn clone_ref(&self) -> DownloadManager {
        DownloadManager {
            app: self.app.clone(),
            db: self.db.clone(),
            active: self.active.clone(),
            settings: self.settings.clone(),
            limiter: self.limiter.clone(),
            task_limiters: self.task_limiters.clone(),
            client: self.client.clone(),
            pending_captures: self.pending_captures.clone(),
        }
    }

    pub fn list(&self) -> Result<Vec<Download>, String> {
        self.db.lock().unwrap().list_downloads()
    }

    pub fn get(&self, id: &str) -> Result<Option<Download>, String> {
        self.db.lock().unwrap().get_download(id)
    }

    pub fn get_settings(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }

    pub fn update_settings(&self, s: Settings) -> Result<Settings, String> {
        let s = Settings {
            max_concurrent: s.max_concurrent.clamp(1, 10),
            segments_per_download: s.segments_per_download.clamp(1, 32),
            proxy_url: s.proxy_url.trim().to_string(),
            ..s
        };
        // Validate + rebuild the client before persisting, so a bad proxy URL
        // is rejected at save time instead of failing every download.
        if s.proxy_url != self.settings.lock().unwrap().proxy_url {
            *self.client.lock().unwrap() = build_client(&s.proxy_url)?;
        }
        self.db.lock().unwrap().save_settings(&s)?;
        self.limiter.set_limit(s.speed_limit_kbps * 1024);
        *self.settings.lock().unwrap() = s.clone();
        // A raised concurrency limit may allow queued items to start.
        self.promote_queued();
        Ok(s)
    }

    pub fn add(
        &self,
        url: String,
        save_dir: Option<String>,
        file_name: Option<String>,
        request_headers: Vec<(String, String)>,
    ) -> Result<Download, String> {
        let url = url.trim().to_string();
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err("Only http(s) URLs are supported".into());
        }
        let mut request_headers = request_headers;
        ensure_referer(&url, &mut request_headers);
        let settings = self.get_settings();
        let explicit_dir = save_dir.filter(|d| !d.trim().is_empty());
        let name = file_name
            .filter(|n| !n.trim().is_empty())
            .map(|n| sanitize_filename(&n))
            .unwrap_or_else(|| filename_from_url(&url));
        let dir = match explicit_dir {
            Some(d) => d,
            None if settings.auto_organize => {
                let category = category_for_type(&file_type_from_name(&name));
                Path::new(&settings.download_dir)
                    .join(category)
                    .to_string_lossy()
                    .to_string()
            }
            None => settings.download_dir,
        };
        let now = now_millis();
        let d = Download {
            id: uuid::Uuid::new_v4().to_string(),
            file_type: file_type_from_name(&name),
            name,
            url,
            size_bytes: 0,
            downloaded_bytes: 0,
            progress: 0.0,
            speed_bytes_per_sec: 0,
            eta_seconds: 0,
            status: DownloadStatus::Queued,
            segments: 1,
            modified_at: now,
            save_path: dir,
            supports_ranges: false,
            error: None,
            created_at: now,
            start_at: None,
            kind: crate::models::default_kind(),
            speed_limit_kbps: 0,
            video_format: None,
            etag: None,
            last_modified: None,
            segment_states: Vec::new(),
            request_headers,
        };
        self.db.lock().unwrap().upsert_download(&d)?;
        self.emit_changed(&d);
        self.try_start(&d.id)?;
        self.db
            .lock()
            .unwrap()
            .get_download(&d.id)?
            .ok_or_else(|| "download vanished".to_string())
    }

    /// Queue a video for yt-dlp. `title`/`ext` name the file; `selector` is the
    /// -f format string picked in the quality dialog.
    pub fn add_video(
        &self,
        url: String,
        title: String,
        ext: String,
        selector: String,
        save_dir: Option<String>,
    ) -> Result<Download, String> {
        let url = url.trim().to_string();
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err("Only http(s) URLs are supported".into());
        }
        let settings = self.get_settings();
        let ext = ext.trim().trim_matches('.').to_string();
        let title = if title.trim().is_empty() { "video".to_string() } else { title };
        let name = sanitize_filename(&format!("{}.{}", title.trim(), ext));
        let dir = match save_dir.filter(|d| !d.trim().is_empty()) {
            Some(d) => d,
            None if settings.auto_organize => {
                let category = category_for_type(&file_type_from_name(&name));
                Path::new(&settings.download_dir)
                    .join(category)
                    .to_string_lossy()
                    .to_string()
            }
            None => settings.download_dir,
        };
        let now = now_millis();
        let d = Download {
            id: uuid::Uuid::new_v4().to_string(),
            file_type: file_type_from_name(&name),
            name,
            url,
            size_bytes: 0,
            downloaded_bytes: 0,
            progress: 0.0,
            speed_bytes_per_sec: 0,
            eta_seconds: 0,
            status: DownloadStatus::Queued,
            segments: 1,
            modified_at: now,
            save_path: dir,
            supports_ranges: false,
            error: None,
            created_at: now,
            start_at: None,
            kind: "video".into(),
            speed_limit_kbps: 0,
            video_format: Some(selector),
            etag: None,
            last_modified: None,
            segment_states: Vec::new(),
            request_headers: Vec::new(),
        };
        self.db.lock().unwrap().upsert_download(&d)?;
        self.emit_changed(&d);
        self.try_start(&d.id)?;
        self.db
            .lock()
            .unwrap()
            .get_download(&d.id)?
            .ok_or_else(|| "download vanished".to_string())
    }

    /// Compare a capture against existing downloads, using the same
    /// url-minus-query + name identity as pending dedup so repeat clicks
    /// carrying fresh tokenized URLs still line up with the original.
    pub fn duplicate_status(&self, url: &str, file_name: Option<&str>) -> DupStatus {
        let name = file_name
            .filter(|n| !n.trim().is_empty())
            .map(sanitize_filename)
            .unwrap_or_else(|| filename_from_url(url));
        let key = capture_key(url, &name);
        let Ok(downloads) = self.db.lock().unwrap().list_downloads() else {
            return DupStatus::New;
        };
        for d in downloads {
            if d.url != url && capture_key(&d.url, &d.name) != key {
                continue;
            }
            match d.status {
                DownloadStatus::Downloading
                | DownloadStatus::Queued
                | DownloadStatus::Merging
                | DownloadStatus::Paused => return DupStatus::Active(d.name),
                DownloadStatus::Completed => {
                    // Deleted from disk since then → nothing to warn about.
                    if Path::new(&d.save_path).join(&d.name).exists() {
                        return DupStatus::Done;
                    }
                }
                DownloadStatus::Failed => {}
            }
        }
        DupStatus::New
    }

    /// Hold a browser capture for user approval instead of downloading it
    /// immediately. Emits `capture:pending` and brings the window forward so
    /// the prompt is seen even when Apex sits in the tray. Nothing is written
    /// to the downloads list until the user approves.
    pub fn stage_capture(
        &self,
        url: String,
        file_name: Option<String>,
        request_headers: Vec<(String, String)>,
    ) -> Result<String, String> {
        let url = url.trim().to_string();
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err("Only http(s) URLs are supported".into());
        }
        let mut request_headers = request_headers;
        ensure_referer(&url, &mut request_headers);
        let settings = self.get_settings();
        let preview_name = file_name
            .clone()
            .filter(|n| !n.trim().is_empty())
            .map(|n| sanitize_filename(&n))
            .unwrap_or_else(|| filename_from_url(&url));
        let folder = if settings.auto_organize {
            let category = category_for_type(&file_type_from_name(&preview_name));
            Path::new(&settings.download_dir)
                .join(category)
                .to_string_lossy()
                .to_string()
        } else {
            settings.download_dir.clone()
        };
        // A repeat of something already downloaded gets flagged in the prompt,
        // so approving is a conscious "yes, again" (the new copy is renamed
        // alongside the old one, never overwriting it).
        let warning = match self.duplicate_status(&url, Some(&preview_name)) {
            DupStatus::Done => {
                "you've already downloaded this file — Download saves a new copy".to_string()
            }
            _ => String::new(),
        };
        let id = uuid::Uuid::new_v4().to_string();
        {
            let mut list = self.pending_captures.lock().unwrap();
            let now = now_millis();
            list.retain(|p| now - p.staged_at < MAX_PENDING_AGE_MS);

            // Retry of something already awaiting approval? Refresh the held
            // entry (the newest URL carries the freshest access token) and
            // re-raise the window instead of stacking another prompt.
            let key = capture_key(&url, &preview_name);
            if let Some(existing) = list
                .iter_mut()
                .find(|p| capture_key(&p.url, &p.name) == key)
            {
                existing.url = url;
                if file_name.is_some() {
                    existing.file_name = file_name;
                }
                existing.request_headers = request_headers;
                existing.staged_at = now;
                let id = existing.id.clone();
                drop(list);
                self.ensure_capture_window();
                return Ok(id);
            }

            if list.len() >= MAX_PENDING_CAPTURES {
                return Err(
                    "too many downloads awaiting approval — approve or block them in Apex first"
                        .into(),
                );
            }
            list.push(PendingCapture {
                id: id.clone(),
                url: url.clone(),
                file_name,
                request_headers: request_headers.clone(),
                name: preview_name.clone(),
                folder: folder.clone(),
                staged_at: now,
                size_bytes: 0,
                warning: warning.clone(),
            });
        }
        // Pop up a small always-on-top approval window (IDM-style), separate
        // from the main app. Created hidden; it shows itself once its React
        // side has loaded the pending list. Subsequent captures reuse it.
        self.ensure_capture_window();
        let _ = self.app.emit(
            "capture:pending",
            CaptureView {
                id: id.clone(),
                url,
                name: preview_name,
                folder,
                referrer: referrer_of(&request_headers),
                size_bytes: 0,
                warning,
            },
        );
        // Probe in the background for the server's real file name and size —
        // onCreated fires before the browser resolves the filename, and
        // tokenized URLs name the file uselessly. The prompt should show
        // what the user is actually approving.
        let mgr = self.clone_ref();
        let probe_id = id.clone();
        tauri::async_runtime::spawn(async move {
            mgr.refine_capture(&probe_id).await;
        });
        Ok(id)
    }

    /// Fill in a staged capture's size and (when the URL name is garbage)
    /// its Content-Disposition file name via a 1-byte probe, then tell the
    /// approval window. Best-effort: any failure just leaves the preview.
    async fn refine_capture(&self, id: &str) {
        let (url, headers) = {
            let list = self.pending_captures.lock().unwrap();
            match list.iter().find(|p| p.id == id) {
                Some(p) => (p.url.clone(), p.request_headers.clone()),
                None => return,
            }
        };
        let client = self.client.lock().unwrap().clone();
        let probe = match tokio::time::timeout(
            Duration::from_secs(15),
            probe_url(&client, &url, &headers),
        )
        .await
        {
            Ok(Ok(p)) => p,
            // A 4xx means the link itself is bad (tokenized URLs expire fast)
            // — worth telling the user before they approve into a failure.
            // Network errors and timeouts stay silent; the engine retries
            // those on its own after approval.
            Ok(Err(e)) if e.contains("server returned 4") => {
                let view = {
                    let mut list = self.pending_captures.lock().unwrap();
                    let Some(p) = list.iter_mut().find(|p| p.id == id) else {
                        return;
                    };
                    p.warning = format!(
                        "{e} — the link may have expired; try downloading again from the page"
                    );
                    CaptureView {
                        id: p.id.clone(),
                        url: p.url.clone(),
                        name: p.name.clone(),
                        folder: p.folder.clone(),
                        referrer: referrer_of(&p.request_headers),
                        size_bytes: p.size_bytes,
                        warning: p.warning.clone(),
                    }
                };
                let _ = self.app.emit("capture:updated", view);
                return;
            }
            _ => return,
        };
        let settings = self.get_settings();
        let view = {
            let mut list = self.pending_captures.lock().unwrap();
            let Some(p) = list.iter_mut().find(|p| p.id == id) else {
                return; // resolved while we probed
            };
            p.size_bytes = probe.size;
            // Adopt the server's name by the same rule the engine applies on
            // download start, so the prompt previews the final outcome.
            if let Some(server_name) = probe.file_name {
                if p.file_name.is_none()
                    && (p.name == "download" || Path::new(&p.name).extension().is_none())
                {
                    p.name = sanitize_filename(&server_name);
                    p.file_name = Some(p.name.clone());
                    if settings.auto_organize {
                        p.folder = Path::new(&settings.download_dir)
                            .join(category_for_type(&file_type_from_name(&p.name)))
                            .to_string_lossy()
                            .to_string();
                    }
                }
            }
            CaptureView {
                id: p.id.clone(),
                url: p.url.clone(),
                name: p.name.clone(),
                folder: p.folder.clone(),
                referrer: referrer_of(&p.request_headers),
                size_bytes: p.size_bytes,
                // Keep any duplicate-download note the staging attached.
                warning: p.warning.clone(),
            }
        };
        let _ = self.app.emit("capture:updated", view);
    }

    fn ensure_capture_window(&self) {
        // Existing (hidden after a previous round): just raise it. Showing from
        // Rust is reliable here; a JS show() during the webview's initial load
        // does not stick, so visibility is driven from this side.
        if let Some(win) = self.app.get_webview_window("capture") {
            let _ = win.show();
            let _ = win.set_focus();
            return;
        }
        let app = self.app.clone();
        // Window creation must happen on the main thread on Windows. Built
        // visible (the reliable native path) — React fills it in immediately.
        let _ = app.clone().run_on_main_thread(move || {
            if let Ok(win) = tauri::WebviewWindowBuilder::new(
                &app,
                "capture",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("Apex — Approve download")
            .inner_size(440.0, 516.0)
            .resizable(false)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .center()
            .build()
            {
                let _ = win.show();
                let _ = win.set_focus();
            }
        });
    }

    /// Captures currently waiting for approval, in arrival order.
    pub fn list_pending_captures(&self) -> Vec<CaptureView> {
        let mut list = self.pending_captures.lock().unwrap();
        let now = now_millis();
        list.retain(|p| now - p.staged_at < MAX_PENDING_AGE_MS);
        list.iter()
            .map(|p| CaptureView {
                id: p.id.clone(),
                url: p.url.clone(),
                name: p.name.clone(),
                folder: p.folder.clone(),
                referrer: referrer_of(&p.request_headers),
                size_bytes: p.size_bytes,
                warning: p.warning.clone(),
            })
            .collect()
    }

    /// Approve or reject a staged capture. On approval it becomes a normal
    /// download (with the browser's headers); rejection drops it entirely.
    /// An unknown id (already resolved) is a no-op.
    pub fn resolve_capture(
        &self,
        id: &str,
        approved: bool,
        save_dir: Option<String>,
        file_name: Option<String>,
    ) -> Result<Option<Download>, String> {
        let pending = {
            let mut list = self.pending_captures.lock().unwrap();
            match list.iter().position(|p| p.id == id) {
                Some(i) => list.remove(i),
                None => return Ok(None),
            }
        };
        if !approved {
            return Ok(None);
        }
        let name = file_name
            .filter(|n| !n.trim().is_empty())
            .or(pending.file_name);
        let d = self.add(pending.url, save_dir, name, pending.request_headers)?;
        Ok(Some(d))
    }

    /// Cap one download's speed (KB/s, 0 = uncapped). Takes effect
    /// immediately when the download is running; yt-dlp downloads pick the
    /// new limit up on their next start.
    pub fn set_speed_limit(&self, id: &str, kbps: u64) -> Result<(), String> {
        let mut d = self
            .db
            .lock()
            .unwrap()
            .get_download(id)?
            .ok_or("download not found")?;
        d.speed_limit_kbps = kbps;
        d.modified_at = now_millis();
        self.db.lock().unwrap().upsert_download(&d)?;
        if let Some(l) = self.task_limiters.lock().unwrap().get(id) {
            l.set_limit(kbps * 1024);
        }
        self.emit_changed(&d);
        Ok(())
    }

    pub fn pause(&self, id: &str) -> Result<(), String> {
        let token = {
            let map = self.active.lock().unwrap();
            map.get(id).map(|h| h.cancel.clone())
        };
        if let Some(token) = token {
            token.cancel();
            return Ok(());
        }
        // Not running (e.g. queued): flip it to paused directly.
        let mut d = self
            .db
            .lock()
            .unwrap()
            .get_download(id)?
            .ok_or("download not found")?;
        if matches!(d.status, DownloadStatus::Queued | DownloadStatus::Downloading) {
            d.status = DownloadStatus::Paused;
            d.modified_at = now_millis();
            self.db.lock().unwrap().upsert_download(&d)?;
            self.emit_changed(&d);
        }
        Ok(())
    }

    pub fn resume(&self, id: &str) -> Result<(), String> {
        let d = self
            .db
            .lock()
            .unwrap()
            .get_download(id)?
            .ok_or("download not found")?;
        match d.status {
            DownloadStatus::Completed | DownloadStatus::Downloading | DownloadStatus::Merging => {
                Ok(())
            }
            _ => self.try_start(id),
        }
    }

    /// Schedule a download to start at `start_at` (unix millis), or clear the
    /// schedule (None = start as soon as a slot frees up).
    pub async fn schedule(&self, id: &str, start_at: Option<i64>) -> Result<(), String> {
        self.stop_and_join(id, false).await;
        let mut d = self
            .db
            .lock()
            .unwrap()
            .get_download(id)?
            .ok_or("download not found")?;
        if d.status == DownloadStatus::Completed {
            return Err("download already completed".into());
        }
        d.start_at = start_at;
        d.status = DownloadStatus::Queued;
        d.modified_at = now_millis();
        self.db.lock().unwrap().upsert_download(&d)?;
        self.emit_changed(&d);
        if start_at.map_or(true, |t| t <= now_millis()) {
            self.try_start(id)?;
        }
        Ok(())
    }

    pub async fn restart(&self, id: &str) -> Result<(), String> {
        self.stop_and_join(id, false).await;
        let mut d = self
            .db
            .lock()
            .unwrap()
            .get_download(id)?
            .ok_or("download not found")?;
        if d.kind == "video" {
            crate::ytdlp::remove_partials(&d);
        } else {
            let _ = std::fs::remove_file(temp_path(&d));
        }
        d.segment_states.clear();
        d.downloaded_bytes = 0;
        d.progress = 0.0;
        d.size_bytes = 0;
        d.error = None;
        d.etag = None;
        d.last_modified = None;
        d.status = DownloadStatus::Queued;
        d.modified_at = now_millis();
        self.db.lock().unwrap().upsert_download(&d)?;
        self.emit_changed(&d);
        self.try_start(id)
    }

    pub async fn remove(&self, id: &str, delete_file: bool) -> Result<(), String> {
        self.stop_and_join(id, true).await;
        let d = self.db.lock().unwrap().get_download(id)?;
        if let Some(d) = d {
            // A half-finished temp file is useless without its record.
            if d.kind == "video" {
                crate::ytdlp::remove_partials(&d);
            } else {
                let _ = std::fs::remove_file(temp_path(&d));
            }
            if delete_file {
                let _ = std::fs::remove_file(final_path(&d));
            }
            self.db.lock().unwrap().remove_download(id)?;
        }
        let _ = self.app.emit(EVENT_REMOVED, id.to_string());
        self.promote_queued();
        Ok(())
    }

    pub fn open_file(&self, id: &str) -> Result<(), String> {
        let d = self
            .db
            .lock()
            .unwrap()
            .get_download(id)?
            .ok_or("download not found")?;
        tauri_plugin_opener::open_path(final_path(&d), None::<&str>).map_err(|e| e.to_string())
    }

    pub fn show_in_folder(&self, id: &str) -> Result<(), String> {
        let d = self
            .db
            .lock()
            .unwrap()
            .get_download(id)?
            .ok_or("download not found")?;
        let path = final_path(&d);
        let target = if path.exists() { path } else { temp_path(&d) };
        tauri_plugin_opener::reveal_item_in_dir(target).map_err(|e| e.to_string())
    }

    async fn stop_and_join(&self, id: &str, removing: bool) {
        let handle = self.active.lock().unwrap().remove(id);
        if let Some(mut h) = handle {
            if removing {
                h.removing.store(true, Ordering::SeqCst);
            }
            h.cancel.cancel();
            if let Some(join) = h.join.take() {
                // Wait so the file handle is released before callers touch the file.
                let _ = tokio::time::timeout(Duration::from_secs(10), join).await;
            }
        }
    }

    /// Start `id` if a slot is free, otherwise leave it queued.
    fn try_start(&self, id: &str) -> Result<(), String> {
        let max = self.get_settings().max_concurrent as usize;
        let mut d = self
            .db
            .lock()
            .unwrap()
            .get_download(id)?
            .ok_or("download not found")?;

        let mut active = self.active.lock().unwrap();
        if active.contains_key(id) {
            return Ok(());
        }
        if active.len() >= max {
            if d.status != DownloadStatus::Queued {
                d.status = DownloadStatus::Queued;
                d.modified_at = now_millis();
                self.db.lock().unwrap().upsert_download(&d)?;
                self.emit_changed(&d);
            }
            return Ok(());
        }

        let cancel = CancellationToken::new();
        let removing = Arc::new(AtomicBool::new(false));
        let task_limiter = Arc::new(RateLimiter::new(d.speed_limit_kbps * 1024));
        self.task_limiters
            .lock()
            .unwrap()
            .insert(id.to_string(), task_limiter.clone());
        let ctx = TaskCtx {
            app: self.app.clone(),
            db: self.db.clone(),
            settings: self.settings.clone(),
            limiter: self.limiter.clone(),
            task_limiter,
            client: self.client.lock().unwrap().clone(),
            cancel: cancel.clone(),
            removing: removing.clone(),
        };
        let mgr = self.clone_ref();

        d.status = DownloadStatus::Downloading;
        d.error = None;
        d.start_at = None;
        d.modified_at = now_millis();
        self.db.lock().unwrap().upsert_download(&d)?;
        self.emit_changed(&d);

        let join = tauri::async_runtime::spawn(async move {
            run_download(ctx, mgr, d).await;
        });
        active.insert(
            id.to_string(),
            ActiveHandle {
                cancel,
                removing,
                join: Some(join),
            },
        );
        Ok(())
    }

    /// Fill any free slots with the oldest queued downloads.
    pub fn promote_queued(&self) {
        loop {
            let max = self.get_settings().max_concurrent as usize;
            let count = self.active.lock().unwrap().len();
            if count >= max {
                return;
            }
            let next = match self.db.lock().unwrap().oldest_queued(now_millis()) {
                Ok(Some(d)) => d,
                _ => return,
            };
            if self.try_start(&next.id).is_err() {
                return;
            }
        }
    }

    fn emit_changed(&self, d: &Download) {
        let _ = self.app.emit(EVENT_CHANGED, d);
    }
}

pub(crate) struct TaskCtx {
    pub(crate) app: AppHandle,
    pub(crate) db: Arc<Mutex<Db>>,
    pub(crate) settings: Arc<Mutex<Settings>>,
    pub(crate) limiter: Arc<RateLimiter>,
    /// This download's own cap, on top of the global limiter.
    pub(crate) task_limiter: Arc<RateLimiter>,
    pub(crate) client: reqwest::Client,
    pub(crate) cancel: CancellationToken,
    pub(crate) removing: Arc<AtomicBool>,
}

/// Whole-download retry attempts after a failure (on top of the per-segment
/// retries inside drive_download). Delays grow 5s → 15s → 45s.
const MAX_RETRIES: u32 = 3;

/// Errors worth retrying: transient network/server trouble. Permanent
/// conditions (bad disk path, gone/private content, missing tools) fail fast.
fn is_retryable(e: &str) -> bool {
    let e = e.to_lowercase();
    const PERMANENT: [&str; 8] = [
        "cannot create",
        "cannot allocate",
        "cannot finalize",
        "only http",
        "not installed",
        "404",
        "video unavailable",
        "private video",
    ];
    !PERMANENT.iter().any(|p| e.contains(p))
}

async fn run_download(ctx: TaskCtx, mgr: DownloadManager, mut d: Download) {
    let mut attempt: u32 = 0;
    let outcome = loop {
        let r = if d.kind == "video" {
            crate::ytdlp::drive_video(&ctx, &mut d).await
        } else {
            drive_download(&ctx, &mut d).await
        };
        match &r {
            Err(e)
                if attempt < MAX_RETRIES
                    && is_retryable(e)
                    && !ctx.cancel.is_cancelled()
                    && !ctx.removing.load(Ordering::SeqCst) =>
            {
                attempt += 1;
                let delay = Duration::from_secs(5 * 3u64.pow(attempt - 1));
                d.error = Some(format!(
                    "{e} — retrying in {}s ({attempt}/{MAX_RETRIES})",
                    delay.as_secs()
                ));
                d.speed_bytes_per_sec = 0;
                d.eta_seconds = 0;
                d.modified_at = now_millis();
                let _ = ctx.db.lock().unwrap().upsert_download(&d);
                let _ = ctx.app.emit(EVENT_CHANGED, &d);
                tokio::select! {
                    _ = ctx.cancel.cancelled() => break Ok(false),
                    _ = tokio::time::sleep(delay) => {}
                }
                d.error = None;
            }
            _ => break r,
        }
    };

    let removing = ctx.removing.load(Ordering::SeqCst);
    if !removing {
        match outcome {
            Ok(true) => {
                d.status = DownloadStatus::Completed;
                d.error = None;
                d.progress = 100.0;
                d.speed_bytes_per_sec = 0;
                d.eta_seconds = 0;
                if ctx.settings.lock().unwrap().notify_on_complete {
                    let _ = ctx
                        .app
                        .notification()
                        .builder()
                        .title("Download complete")
                        .body(&d.name)
                        .show();
                }
            }
            Ok(false) => {
                // Cancelled by the user — pause, keeping progress.
                d.status = DownloadStatus::Paused;
                d.speed_bytes_per_sec = 0;
                d.eta_seconds = 0;
            }
            Err(e) => {
                d.status = DownloadStatus::Failed;
                d.error = Some(e);
                d.speed_bytes_per_sec = 0;
                d.eta_seconds = 0;
            }
        }
        d.modified_at = now_millis();
        let _ = ctx.db.lock().unwrap().upsert_download(&d);
        let _ = ctx.app.emit(EVENT_CHANGED, &d);
    }

    // Deregister (remove()/restart() may have already taken the entry).
    mgr.active.lock().unwrap().remove(&d.id);
    mgr.task_limiters.lock().unwrap().remove(&d.id);
    if !removing {
        mgr.promote_queued();

        // If this completion drained the queue, offer the configured
        // post-queue action (frontend shows a cancellable countdown).
        if d.status == DownloadStatus::Completed {
            let action = ctx.settings.lock().unwrap().queue_done_action.clone();
            if action != "none" {
                let busy = ctx
                    .db
                    .lock()
                    .unwrap()
                    .list_downloads()
                    .unwrap_or_default()
                    .iter()
                    .any(|x| {
                        matches!(
                            x.status,
                            DownloadStatus::Downloading
                                | DownloadStatus::Queued
                                | DownloadStatus::Merging
                        )
                    });
                if !busy {
                    let _ = ctx.app.emit("queue:empty", action);
                }
            }
        }
    }
}

/// Returns Ok(true) on completion, Ok(false) when cancelled, Err on failure.
async fn drive_download(ctx: &TaskCtx, d: &mut Download) -> Result<bool, String> {
    let tmp = temp_path(d);

    // If the temp file disappeared, saved segment progress is meaningless.
    if !d.segment_states.is_empty() && d.downloaded_bytes > 0 && !tmp.exists() {
        d.segment_states.clear();
        d.downloaded_bytes = 0;
        d.progress = 0.0;
    }

    // Resuming? Verify the remote file hasn't changed since we started, or we
    // would splice fresh bytes into a stale file and corrupt it silently.
    let has_progress = d.segment_states.iter().any(|s| s.downloaded > 0);
    if has_progress {
        if let Some(validator) = d.etag.clone().or_else(|| d.last_modified.clone()) {
            let check = with_headers(ctx.client.get(&d.url), &d.request_headers)
                .header(header::RANGE, "bytes=0-0")
                .header(header::IF_RANGE, validator)
                .send()
                .await;
            let changed = tokio::select! {
                _ = ctx.cancel.cancelled() => return Ok(false),
                r = async { check } => match r {
                    // 200 to a ranged If-Range request = validator mismatch.
                    Ok(resp) => resp.status() == reqwest::StatusCode::OK,
                    Err(_) => false, // network hiccup: let segments retry normally
                },
            };
            if changed {
                d.segment_states.clear();
                d.downloaded_bytes = 0;
                d.progress = 0.0;
                d.size_bytes = 0;
                d.etag = None;
                d.last_modified = None;
                let _ = std::fs::remove_file(&tmp);
            }
        }
    }

    // 1. Probe the server if we don't yet know size/range support.
    if d.segment_states.is_empty() {
        let probe = tokio::select! {
            _ = ctx.cancel.cancelled() => return Ok(false),
            p = probe_url(&ctx.client, &d.url, &d.request_headers) => p?,
        };
        d.size_bytes = probe.size;
        d.supports_ranges = probe.supports_ranges;
        d.etag = probe.etag;
        d.last_modified = probe.last_modified;
        if let Some(name) = probe.file_name {
            // Adopt the server's name unless we already have a real one —
            // tokenized CDN URLs (Google video links etc.) put hundreds of
            // random chars and no extension in the last path segment.
            if d.name.is_empty()
                || d.name == "download"
                || Path::new(&d.name).extension().is_none()
            {
                d.name = sanitize_filename(&name);
                d.file_type = file_type_from_name(&d.name);
            }
        }
        // Still extensionless? Borrow the extension from Content-Type so the
        // file opens with the right app and the UI shows a real type.
        if Path::new(&d.name).extension().is_none() {
            if let Some(ext) = probe.content_type.as_deref().and_then(ext_for_content_type) {
                d.name = format!("{}.{ext}", d.name);
                d.file_type = file_type_from_name(&d.name);
            }
        }
        d.segment_states = plan_segments(
            d.size_bytes,
            d.supports_ranges,
            ctx.settings.lock().unwrap().segments_per_download,
        );
        d.segments = d.segment_states.len() as u32;
        let _ = ctx.db.lock().unwrap().upsert_download(d);
        let _ = ctx.app.emit(EVENT_CHANGED, &*d);
    }

    // 2. Prepare the temp file.
    std::fs::create_dir_all(&d.save_path).map_err(|e| format!("cannot create folder: {e}"))?;
    let tmp = temp_path(d);
    {
        let file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .open(&tmp)
            .map_err(|e| format!("cannot create file: {e}"))?;
        if d.size_bytes > 0 {
            file.set_len(d.size_bytes)
                .map_err(|e| format!("cannot allocate file: {e}"))?;
        }
    }

    // 3. Launch one task per segment.
    let counters: Arc<Vec<AtomicU64>> = Arc::new(
        d.segment_states
            .iter()
            .map(|s| AtomicU64::new(s.downloaded))
            .collect(),
    );
    let fail_cancel = ctx.cancel.child_token();
    let mut handles = Vec::new();
    for (i, seg) in d.segment_states.iter().enumerate() {
        let seg = seg.clone();
        let client = ctx.client.clone();
        let url = d.url.clone();
        let tmp = tmp.clone();
        let counters = counters.clone();
        let limiter = ctx.limiter.clone();
        let task_limiter = ctx.task_limiter.clone();
        let token = fail_cancel.clone();
        let supports_ranges = d.supports_ranges;
        let known_size = d.size_bytes > 0;
        let if_range = d.etag.clone().or_else(|| d.last_modified.clone());
        let request_headers = d.request_headers.clone();
        handles.push(tokio::spawn(async move {
            let res = download_segment(
                &client,
                &url,
                &tmp,
                seg,
                i,
                &counters,
                &limiter,
                &task_limiter,
                &token,
                supports_ranges,
                known_size,
                if_range,
                &request_headers,
            )
            .await;
            if res.is_err() {
                // Abort siblings; user-cancel is distinguished later.
                token.cancel();
            }
            res
        }));
    }

    // 4. Monitor progress until all segments settle.
    let mut join_all = futures_util::future::join_all(handles);
    let mut ticker = tokio::time::interval(Duration::from_millis(500));
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let mut last_bytes: u64 = d.downloaded_bytes;
    let mut last_time = Instant::now();
    let mut speed_ema: f64 = 0.0;
    let mut tick_n: u32 = 0;

    let results = loop {
        tokio::select! {
            results = &mut join_all => break results,
            _ = ticker.tick() => {
                tick_n += 1;
                let total: u64 = counters.iter().map(|c| c.load(Ordering::Relaxed)).sum();
                let now = Instant::now();
                let dt = now.duration_since(last_time).as_secs_f64();
                if dt > 0.0 {
                    let inst = (total.saturating_sub(last_bytes)) as f64 / dt;
                    speed_ema = if speed_ema == 0.0 { inst } else { 0.7 * speed_ema + 0.3 * inst };
                }
                last_bytes = total;
                last_time = now;
                sync_progress(d, &counters, total, speed_ema);
                if tick_n % 4 == 0 {
                    let _ = ctx.db.lock().unwrap().upsert_download(d);
                }
                let _ = ctx.app.emit(EVENT_CHANGED, &*d);
            }
        }
    };

    // Final state sync from counters.
    let total: u64 = counters.iter().map(|c| c.load(Ordering::Relaxed)).sum();
    sync_progress(d, &counters, total, 0.0);

    if ctx.cancel.is_cancelled() {
        // If the server can't resume, partial data is useless — start over next time.
        if !d.supports_ranges {
            for s in d.segment_states.iter_mut() {
                s.downloaded = 0;
            }
            d.downloaded_bytes = 0;
            d.progress = 0.0;
        }
        return Ok(false);
    }
    for r in results {
        match r {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(e),
            Err(e) => return Err(format!("task panicked: {e}")),
        }
    }

    // A no-range server may have served a different byte count than the
    // probe predicted (dynamic bodies); the bytes on disk are the real size.
    if !d.supports_ranges && total > 0 && d.size_bytes != total {
        d.size_bytes = total;
        d.progress = 100.0;
    }

    // 5. All segments done — move the temp file into place.
    d.status = DownloadStatus::Merging;
    let _ = ctx.app.emit(EVENT_CHANGED, &*d);
    let mut target = final_path(d);
    if target.exists() {
        target = dedupe_path(&target);
        if let Some(name) = target.file_name() {
            d.name = name.to_string_lossy().to_string();
        }
    }
    std::fs::rename(&tmp, &target).map_err(|e| format!("cannot finalize file: {e}"))?;
    if d.size_bytes == 0 {
        d.size_bytes = d.downloaded_bytes;
    }

    // Mark-of-the-Web: tag the file as internet-sourced so SmartScreen and
    // Defender apply the same scrutiny they would to a browser download.
    #[cfg(windows)]
    {
        let ads = format!("{}:Zone.Identifier", target.display());
        let content = format!("[ZoneTransfer]\r\nZoneId=3\r\nHostUrl={}\r\n", d.url);
        let _ = std::fs::write(ads, content);
    }

    Ok(true)
}

fn sync_progress(d: &mut Download, counters: &[AtomicU64], total: u64, speed: f64) {
    for (s, c) in d.segment_states.iter_mut().zip(counters.iter()) {
        s.downloaded = c.load(Ordering::Relaxed);
    }
    d.downloaded_bytes = total;
    d.progress = if d.size_bytes > 0 {
        (total as f64 / d.size_bytes as f64 * 100.0).min(100.0)
    } else {
        0.0
    };
    d.speed_bytes_per_sec = speed as u64;
    d.eta_seconds = if speed > 1.0 && d.size_bytes > total {
        ((d.size_bytes - total) as f64 / speed) as u64
    } else {
        0
    };
    d.modified_at = now_millis();
}

struct ProbeResult {
    size: u64,
    supports_ranges: bool,
    file_name: Option<String>,
    etag: Option<String>,
    last_modified: Option<String>,
    content_type: Option<String>,
}

/// Give downloads that arrived without a Referer (manual adds, direct URL
/// navigations) one matching the URL's origin. Some WAF configurations
/// (observed on Cloudflare) refuse ranged requests that carry no Referer,
/// so a bare header set would break both the probe and segmented transfer.
fn ensure_referer(url: &str, headers: &mut Vec<(String, String)>) {
    if headers
        .iter()
        .any(|(k, _)| k.eq_ignore_ascii_case("referer"))
    {
        return;
    }
    if let Ok(u) = reqwest::Url::parse(url) {
        if let Some(host) = u.host_str() {
            let port = u.port().map(|p| format!(":{p}")).unwrap_or_default();
            headers.push((
                "referer".to_string(),
                format!("{}://{host}{port}/", u.scheme()),
            ));
        }
    }
}

/// Apply browser-captured headers (Cookie, Referer, User-Agent). Invalid
/// names/values are skipped rather than failing the download; reqwest strips
/// sensitive headers itself if a redirect leaves the original host.
fn with_headers(
    mut req: reqwest::RequestBuilder,
    headers: &[(String, String)],
) -> reqwest::RequestBuilder {
    for (k, v) in headers {
        if let (Ok(name), Ok(value)) = (
            header::HeaderName::from_bytes(k.as_bytes()),
            header::HeaderValue::from_str(v),
        ) {
            req = req.header(name, value);
        }
    }
    req
}

async fn probe_url(
    client: &reqwest::Client,
    url: &str,
    request_headers: &[(String, String)],
) -> Result<ProbeResult, String> {
    let mut resp = with_headers(client.get(url), request_headers)
        .header(header::RANGE, "bytes=0-0")
        .send()
        .await
        .map_err(|e| format!("connection failed: {e}"))?;
    // Some WAFs refuse a ranged request they would serve plain. Retry without
    // Range once; range support then comes from Accept-Ranges instead of the
    // 206 (headers only — the body is never read, so no full transfer here).
    let mut via_plain_retry = false;
    if !resp.status().is_success() {
        let ranged_status = resp.status();
        match with_headers(client.get(url), request_headers).send().await {
            Ok(r) if r.status().is_success() => {
                resp = r;
                via_plain_retry = true;
            }
            _ => return Err(format!("server returned {ranged_status}")),
        }
    }
    let status = resp.status();
    let file_name = filename_from_headers(resp.headers());
    let header_str = |name: header::HeaderName| {
        resp.headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
    };
    let etag = header_str(header::ETAG);
    let last_modified = header_str(header::LAST_MODIFIED);
    let content_type = header_str(header::CONTENT_TYPE);
    if status == reqwest::StatusCode::PARTIAL_CONTENT {
        // Content-Range: bytes 0-0/123456
        let size = resp
            .headers()
            .get(header::CONTENT_RANGE)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.rsplit('/').next())
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(0);
        Ok(ProbeResult {
            size,
            supports_ranges: size > 0,
            file_name,
            etag,
            last_modified,
            content_type,
        })
    } else {
        let size = resp.content_length().unwrap_or(0);
        // On the plain retry the server never saw our Range header, so its
        // Accept-Ranges claim is the only signal. A 200 to the ranged probe,
        // by contrast, is the server demonstrating it ignores Range — don't
        // trust Accept-Ranges there.
        let supports_ranges = via_plain_retry
            && size > 0
            && resp
                .headers()
                .get(header::ACCEPT_RANGES)
                .and_then(|v| v.to_str().ok())
                .is_some_and(|v| v.eq_ignore_ascii_case("bytes"));
        Ok(ProbeResult {
            size,
            supports_ranges,
            file_name,
            etag,
            last_modified,
            content_type,
        })
    }
}

/// Map a Content-Type to a filename extension. Returns None for generic or
/// unrecognizable types (octet-stream and friends).
fn ext_for_content_type(ct: &str) -> Option<String> {
    let essence = ct.split(';').next().unwrap_or("").trim().to_ascii_lowercase();
    let (kind, sub) = essence.split_once('/')?;
    let mapped = match (kind, sub) {
        (_, "octet-stream") => return None,
        ("video", "x-matroska" | "matroska") => "mkv",
        ("video", "quicktime") => "mov",
        ("video", "x-msvideo") => "avi",
        ("audio", "mpeg") => "mp3",
        ("audio", "x-wav") => "wav",
        ("image", "jpeg") => "jpg",
        ("image", "svg+xml") => "svg",
        ("text", "plain") => "txt",
        ("text", "html") => "html",
        ("application", "x-msdownload" | "x-msdos-program") => "exe",
        ("application", "x-7z-compressed") => "7z",
        ("application", "vnd.rar" | "x-rar-compressed") => "rar",
        ("application", "gzip" | "x-gzip") => "gz",
        ("application", "x-tar") => "tar",
        ("application", "x-iso9660-image") => "iso",
        // mp4, mkv, webm, zip, pdf, png, json, … already look like extensions.
        _ => sub,
    };
    if !mapped.is_empty() && mapped.len() <= 5 && mapped.chars().all(|c| c.is_ascii_alphanumeric())
    {
        Some(mapped.to_string())
    } else {
        None
    }
}

fn plan_segments(size: u64, supports_ranges: bool, wanted: u32) -> Vec<Segment> {
    if !supports_ranges || size == 0 {
        return vec![Segment {
            start: 0,
            end: if size > 0 { size - 1 } else { 0 },
            downloaded: 0,
        }];
    }
    let max_by_size = (size / MIN_SEGMENT_BYTES).max(1);
    let n = (wanted as u64).clamp(1, 32).min(max_by_size);
    let chunk = size / n;
    (0..n)
        .map(|i| {
            let start = i * chunk;
            let end = if i == n - 1 { size - 1 } else { (i + 1) * chunk - 1 };
            Segment {
                start,
                end,
                downloaded: 0,
            }
        })
        .collect()
}

#[allow(clippy::too_many_arguments)]
async fn download_segment(
    client: &reqwest::Client,
    url: &str,
    tmp: &Path,
    seg: Segment,
    index: usize,
    counters: &[AtomicU64],
    limiter: &RateLimiter,
    task_limiter: &RateLimiter,
    token: &CancellationToken,
    supports_ranges: bool,
    known_size: bool,
    if_range: Option<String>,
    request_headers: &[(String, String)],
) -> Result<(), String> {
    let mut expected = if known_size {
        Some(seg.end - seg.start + 1)
    } else {
        None
    };
    let mut done = seg.downloaded;
    if let Some(exp) = expected {
        if done >= exp {
            return Ok(());
        }
    }

    let mut attempts: u32 = 0;
    'attempt: loop {
        if token.is_cancelled() {
            return Ok(());
        }
        if attempts > 0 {
            tokio::select! {
                _ = token.cancelled() => return Ok(()),
                _ = tokio::time::sleep(Duration::from_secs(2u64.pow(attempts.min(4)))) => {}
            }
        }
        attempts += 1;

        let mut req = with_headers(client.get(url), request_headers);
        if supports_ranges {
            req = req.header(
                header::RANGE,
                format!("bytes={}-{}", seg.start + done, seg.end),
            );
            if let Some(v) = &if_range {
                req = req.header(header::IF_RANGE, v);
            }
        } else if done > 0 {
            // Can't resume mid-stream on a no-range server: start over.
            done = 0;
            counters[index].store(0, Ordering::Relaxed);
        }

        let resp = tokio::select! {
            _ = token.cancelled() => return Ok(()),
            r = req.send() => r,
        };
        let mut resp = match resp.and_then(|r| r.error_for_status()) {
            Ok(r) => r,
            Err(e) => {
                if attempts >= 4 {
                    return Err(format!("segment {index}: {e}"));
                }
                continue 'attempt;
            }
        };
        if supports_ranges && resp.status() != reqwest::StatusCode::PARTIAL_CONTENT {
            return Err(format!("segment {index}: server ignored range request"));
        }
        if !supports_ranges {
            // A no-range server can serve a body that differs from the probe's
            // (the probe carried a Range header some servers vary on). This
            // response's own Content-Length is the real target; without one,
            // EOF is the completion signal — hyper errors on premature close,
            // so a clean EOF genuinely means the body is complete.
            expected = resp.content_length().filter(|cl| *cl > 0);
        }

        let mut file = tokio::fs::OpenOptions::new()
            .write(true)
            .open(tmp)
            .await
            .map_err(|e| format!("cannot open file: {e}"))?;
        file.seek(SeekFrom::Start(seg.start + done))
            .await
            .map_err(|e| e.to_string())?;

        loop {
            let chunk = tokio::select! {
                _ = token.cancelled() => {
                    let _ = file.flush().await;
                    return Ok(());
                }
                c = tokio::time::timeout(Duration::from_secs(60), resp.chunk()) => c,
            };
            let chunk = match chunk {
                Err(_) => {
                    // Stalled for 60s — retry from the current offset.
                    if attempts >= 4 {
                        return Err(format!("segment {index}: connection stalled"));
                    }
                    continue 'attempt;
                }
                Ok(Err(e)) => {
                    if attempts >= 4 {
                        return Err(format!("segment {index}: {e}"));
                    }
                    continue 'attempt;
                }
                Ok(Ok(c)) => c,
            };
            match chunk {
                Some(bytes) => {
                    limiter.acquire(bytes.len() as u64, token).await;
                    task_limiter.acquire(bytes.len() as u64, token).await;
                    // Never write past our range (defensive against sloppy servers).
                    let bytes = if let Some(exp) = expected {
                        let remaining = exp - done;
                        if (bytes.len() as u64) > remaining {
                            bytes.slice(0..remaining as usize)
                        } else {
                            bytes
                        }
                    } else {
                        bytes
                    };
                    if bytes.is_empty() {
                        continue;
                    }
                    file.write_all(&bytes)
                        .await
                        .map_err(|e| format!("write failed: {e}"))?;
                    done += bytes.len() as u64;
                    counters[index].store(done, Ordering::Relaxed);
                    // Data is flowing again — only consecutive dead attempts
                    // should count toward the retry limit, or multi-hour
                    // downloads die from a handful of scattered hiccups.
                    attempts = 0;
                    if let Some(exp) = expected {
                        if done >= exp {
                            let _ = file.flush().await;
                            if !supports_ranges {
                                // Preallocation used the probe's size; cut
                                // any stale tail past the real body.
                                let _ = file.set_len(done).await;
                            }
                            return Ok(());
                        }
                    }
                }
                None => {
                    let _ = file.flush().await;
                    match expected {
                        Some(exp) if done < exp => {
                            if attempts >= 4 {
                                return Err(format!("segment {index}: connection closed early"));
                            }
                            continue 'attempt;
                        }
                        _ => {
                            if !supports_ranges {
                                let _ = file.set_len(done).await;
                            }
                            return Ok(());
                        }
                    }
                }
            }
        }
    }
}

// ---------- rate limiter ----------

pub struct RateLimiter {
    limit_bps: AtomicU64,
    state: tokio::sync::Mutex<LimiterState>,
}

struct LimiterState {
    tokens: f64,
    last: Instant,
}

impl RateLimiter {
    fn new(limit_bps: u64) -> Self {
        RateLimiter {
            limit_bps: AtomicU64::new(limit_bps),
            state: tokio::sync::Mutex::new(LimiterState {
                tokens: 0.0,
                last: Instant::now(),
            }),
        }
    }

    fn set_limit(&self, limit_bps: u64) {
        self.limit_bps.store(limit_bps, Ordering::Relaxed);
    }

    async fn acquire(&self, n: u64, token: &CancellationToken) {
        loop {
            let limit = self.limit_bps.load(Ordering::Relaxed);
            if limit == 0 {
                return;
            }
            {
                let mut st = self.state.lock().await;
                let now = Instant::now();
                let dt = now.duration_since(st.last).as_secs_f64();
                st.last = now;
                // Cap the bucket at one second of budget to avoid bursts.
                st.tokens = (st.tokens + dt * limit as f64).min(limit as f64);
                if st.tokens >= n as f64 {
                    st.tokens -= n as f64;
                    return;
                }
            }
            tokio::select! {
                _ = token.cancelled() => return,
                _ = tokio::time::sleep(Duration::from_millis(50)) => {}
            }
        }
    }
}

// ---------- path & name helpers ----------

pub fn final_path(d: &Download) -> PathBuf {
    Path::new(&d.save_path).join(&d.name)
}

pub fn temp_path(d: &Download) -> PathBuf {
    Path::new(&d.save_path).join(format!("{}{}", d.name, TEMP_SUFFIX))
}

fn dedupe_path(path: &Path) -> PathBuf {
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "download".into());
    let ext = path
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    let dir = path.parent().unwrap_or_else(|| Path::new("."));
    for i in 1..1000 {
        let candidate = dir.join(format!("{stem} ({i}){ext}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    dir.join(format!("{stem} ({}){ext}", uuid::Uuid::new_v4()))
}

pub fn sanitize_filename(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| match c {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if (c as u32) < 0x20 => '_',
            c => c,
        })
        .collect();
    let mut cleaned = cleaned.trim().trim_matches('.').to_string();
    if cleaned.chars().count() > MAX_NAME_CHARS {
        let ext = Path::new(&cleaned)
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .filter(|e| e.chars().count() <= 12)
            .map(|e| format!(".{e}"))
            .unwrap_or_default();
        let stem: String = cleaned
            .chars()
            .take(MAX_NAME_CHARS - ext.chars().count())
            .collect();
        cleaned = format!("{}{ext}", stem.trim_end_matches(['.', ' ']));
    }
    if cleaned.is_empty() {
        "download".into()
    } else {
        cleaned
    }
}

fn filename_from_url(url: &str) -> String {
    let no_query = url.split(['?', '#']).next().unwrap_or(url);
    let last = no_query.rsplit('/').next().unwrap_or("");
    let decoded = percent_decode(last);
    let name = sanitize_filename(&decoded);
    if name == "download" || name.is_empty() {
        "download".into()
    } else {
        name
    }
}

fn filename_from_headers(headers: &header::HeaderMap) -> Option<String> {
    let cd = headers.get(header::CONTENT_DISPOSITION)?.to_str().ok()?;
    // filename*=UTF-8''encoded takes priority over filename="plain"
    for part in cd.split(';') {
        let part = part.trim();
        if let Some(rest) = part.strip_prefix("filename*=") {
            let rest = rest.trim_matches('"');
            let encoded = rest.splitn(2, "''").nth(1).unwrap_or(rest);
            let decoded = percent_decode(encoded);
            if !decoded.is_empty() {
                return Some(decoded);
            }
        }
    }
    for part in cd.split(';') {
        let part = part.trim();
        if let Some(rest) = part.strip_prefix("filename=") {
            let name = rest.trim_matches('"').trim();
            if !name.is_empty() {
                return Some(name.to_string());
            }
        }
    }
    None
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let h = (bytes[i + 1] as char).to_digit(16);
            let l = (bytes[i + 2] as char).to_digit(16);
            if let (Some(h), Some(l)) = (h, l) {
                out.push((h * 16 + l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}
