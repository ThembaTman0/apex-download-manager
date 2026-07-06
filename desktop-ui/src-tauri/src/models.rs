use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DownloadStatus {
    Downloading,
    Paused,
    Completed,
    Failed,
    Queued,
    Merging,
}

impl DownloadStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            DownloadStatus::Downloading => "downloading",
            DownloadStatus::Paused => "paused",
            DownloadStatus::Completed => "completed",
            DownloadStatus::Failed => "failed",
            DownloadStatus::Queued => "queued",
            DownloadStatus::Merging => "merging",
        }
    }

    pub fn from_str(s: &str) -> DownloadStatus {
        match s {
            "downloading" => DownloadStatus::Downloading,
            "completed" => DownloadStatus::Completed,
            "failed" => DownloadStatus::Failed,
            "queued" => DownloadStatus::Queued,
            "merging" => DownloadStatus::Merging,
            _ => DownloadStatus::Paused,
        }
    }
}

/// Byte range owned by one connection plus how much of it is done.
/// `end` is inclusive. A single-segment download of unknown size uses end = 0
/// together with `supports_ranges = false` on the parent download.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Segment {
    pub start: u64,
    pub end: u64,
    pub downloaded: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Download {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(rename = "type")]
    pub file_type: String,
    pub size_bytes: u64,
    pub downloaded_bytes: u64,
    pub progress: f64,
    pub speed_bytes_per_sec: u64,
    pub eta_seconds: u64,
    pub status: DownloadStatus,
    pub segments: u32,
    /// Unix millis — the frontend converts to Date.
    pub modified_at: i64,
    pub save_path: String,
    pub supports_ranges: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub created_at: i64,
    /// Unix millis; when set and in the future, the download waits until then.
    pub start_at: Option<i64>,
    #[serde(skip)]
    pub etag: Option<String>,
    #[serde(skip)]
    pub last_modified: Option<String>,
    #[serde(skip)]
    pub segment_states: Vec<Segment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub download_dir: String,
    pub max_concurrent: u32,
    pub segments_per_download: u32,
    /// 0 = unlimited
    pub speed_limit_kbps: u64,
    pub notify_on_complete: bool,
    /// Watch the clipboard for downloadable URLs and offer to grab them.
    pub watch_clipboard: bool,
    /// Save into per-category subfolders (Video, Music, Programs, …).
    pub auto_organize: bool,
    /// What to do when the queue drains: "none" | "sleep" | "hibernate" | "shutdown".
    pub queue_done_action: String,
    /// Accept downloads pushed by the browser extension.
    pub capture_enabled: bool,
    /// Localhost port the capture server listens on (change needs restart).
    pub capture_port: u16,
    /// Shared secret the extension must present; empty until first run.
    pub capture_token: String,
}

impl Default for Settings {
    fn default() -> Self {
        let download_dir = dirs_download_dir();
        Settings {
            download_dir,
            max_concurrent: 3,
            segments_per_download: 8,
            speed_limit_kbps: 0,
            notify_on_complete: true,
            watch_clipboard: true,
            auto_organize: false,
            queue_done_action: "none".into(),
            capture_enabled: true,
            capture_port: 43666,
            capture_token: String::new(),
        }
    }
}

fn dirs_download_dir() -> String {
    // %USERPROFILE%\Downloads on Windows, ~/Downloads elsewhere.
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into());
    let p = std::path::Path::new(&home).join("Downloads");
    p.to_string_lossy().to_string()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskUsage {
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub label: String,
}

pub fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn file_type_from_name(name: &str) -> String {
    std::path::Path::new(name)
        .extension()
        .map(|e| e.to_string_lossy().to_uppercase())
        .filter(|e| e.len() <= 5)
        .unwrap_or_else(|| "FILE".into())
}

/// Category folder name for an (uppercase) file type, mirrored in the frontend.
pub fn category_for_type(t: &str) -> &'static str {
    match t {
        "MP4" | "MKV" | "AVI" | "MOV" | "WEBM" | "WMV" | "FLV" | "M4V" => "Video",
        "MP3" | "FLAC" | "WAV" | "M4A" | "AAC" | "OGG" | "WMA" => "Music",
        "EXE" | "MSI" | "DMG" | "PKG" | "DEB" | "RPM" | "APK" | "ISO" | "IMG" | "MSU" => "Programs",
        "ZIP" | "RAR" | "7Z" | "TAR" | "GZ" | "BZ2" | "XZ" | "CAB" => "Archives",
        "PDF" | "DOC" | "DOCX" | "XLS" | "XLSX" | "PPT" | "PPTX" | "TXT" | "EPUB" | "CSV" | "MD" => "Documents",
        "JPG" | "JPEG" | "PNG" | "GIF" | "WEBP" | "SVG" | "BMP" | "TIFF" => "Images",
        _ => "Other",
    }
}

/// Heuristic used by the clipboard watcher: an http(s) URL whose path ends in
/// a file extension people actually download.
pub fn is_downloadable_url(text: &str) -> bool {
    let t = text.trim();
    if !(t.starts_with("http://") || t.starts_with("https://")) || t.contains(char::is_whitespace) {
        return false;
    }
    let path = t.split(['?', '#']).next().unwrap_or(t);
    let last = path.rsplit('/').next().unwrap_or("");
    let ext = match last.rsplit_once('.') {
        Some((_, e)) if !e.is_empty() && e.len() <= 5 => e.to_uppercase(),
        _ => return false,
    };
    category_for_type(&ext) != "Other" || matches!(ext.as_str(), "BIN" | "JAR" | "APPX" | "CRX" | "XPI")
}
