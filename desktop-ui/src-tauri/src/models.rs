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
    /// Unix millis - the frontend converts to Date.
    pub modified_at: i64,
    pub save_path: String,
    pub supports_ranges: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub created_at: i64,
    /// Unix millis; when set and in the future, the download waits until then.
    pub start_at: Option<i64>,
    /// "http" (segmented engine) or "video" (driven by yt-dlp).
    #[serde(default = "default_kind")]
    pub kind: String,
    /// Per-download speed cap in KB/s; 0 = no cap (the global limit still
    /// applies on top). Adjustable while the download runs.
    #[serde(default)]
    pub speed_limit_kbps: u64,
    /// Subtitle track to fetch alongside a video (kind == "video"): a yt-dlp
    /// language code, prefixed "auto:" when it is a machine transcript rather
    /// than a published track, since the two need different yt-dlp flags.
    /// None means no subtitles, which is the default.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub subtitle_lang: Option<String>,
    /// yt-dlp -f selector chosen in the quality picker (kind == "video").
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub video_format: Option<String>,
    #[serde(skip)]
    pub etag: Option<String>,
    #[serde(skip)]
    pub last_modified: Option<String>,
    /// Where this download sits in the queue - lower runs sooner. Unset on
    /// everything created before queue ordering existed, and on downloads the
    /// user has never reordered; those fall back to created_at, which is what
    /// the queue used to be sorted by, so the order people already had does
    /// not shuffle on upgrade.
    #[serde(default)]
    pub queue_order: Option<i64>,
    /// Live per-connection layout - on the wire so the UI can draw the
    /// proportional segment map without polling a second command.
    #[serde(default)]
    pub segment_states: Vec<Segment>,
    /// Extra request headers captured from the browser (Cookie, Referer,
    /// User-Agent) so downloads behind logins work. Cookies are session
    /// secrets - kept out of every UI payload via skip.
    #[serde(skip)]
    pub request_headers: Vec<(String, String)>,
}

pub fn default_kind() -> String {
    "http".into()
}

/// A user override for one auto-organize category.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct CategoryRule {
    /// One of the built-in category names ("Video", "Music", ...).
    pub category: String,
    /// Where files of this category land. Empty keeps the default
    /// "<download folder>/<category>"; a relative path is taken from the
    /// download folder; an absolute path is used as it stands, so a category
    /// can point at another drive.
    pub folder: String,
    /// Extra file types routed here (uppercase, no dot). Checked before the
    /// built-in table, so a type can be moved from the category it would
    /// otherwise land in.
    pub extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub download_dir: String,
    pub max_concurrent: u32,
    pub segments_per_download: u32,
    /// 0 = unlimited
    pub speed_limit_kbps: u64,
    /// Proxy for all downloads: "" = direct connection. Accepts
    /// http://host:port, https://host:port or socks5://host:port, with
    /// optional user:pass@ credentials. Also passed to yt-dlp.
    pub proxy_url: String,
    pub notify_on_complete: bool,
    /// Watch the clipboard for downloadable URLs and offer to grab them.
    pub watch_clipboard: bool,
    /// Save into per-category subfolders (Video, Music, Programs, …).
    pub auto_organize: bool,
    /// What to do when the queue drains: "none" | "sleep" | "hibernate" | "shutdown".
    pub queue_done_action: String,
    /// Accept downloads pushed by the browser extension.
    pub capture_enabled: bool,
    /// Prompt for approval before starting a browser-captured download, so a
    /// stray or malicious download can't begin silently.
    pub capture_confirm: bool,
    /// Localhost port the capture server listens on (change needs restart).
    pub capture_port: u16,
    /// Shared secret the extension must present; empty until first run.
    pub capture_token: String,
    /// Hosts whose captures skip the approval prompt (lowercase). Built via
    /// "Always allow downloads from this site" in the approval window.
    pub capture_allowed_hosts: Vec<String>,
    /// Launch Apex (hidden, in the tray) when the user signs in, so the
    /// browser extension can reach it before any download is clicked.
    /// Off for new installs: registering a startup entry is a system change
    /// the user opts into. Settings saved before this field existed were
    /// running with it on, so a missing value keeps it on for them.
    #[serde(default = "legacy_launch_at_startup")]
    pub launch_at_startup: bool,
    /// Bandwidth scheduler: inside the off-peak window downloads run at the
    /// normal global limit; outside it `peak_limit_kbps` caps them instead.
    pub scheduler_enabled: bool,
    /// Off-peak window bounds, minutes since local midnight. A start after
    /// the end (e.g. 23:00 to 07:00) wraps across midnight.
    pub offpeak_start_min: u32,
    pub offpeak_end_min: u32,
    /// Cap applied outside the off-peak window (KB/s); 0 disables the cap.
    pub peak_limit_kbps: u64,
    /// Per-category overrides for auto-organize. Categories with no rule keep
    /// the built-in extension table and a subfolder named after themselves.
    pub category_rules: Vec<CategoryRule>,
}

impl Default for Settings {
    fn default() -> Self {
        let download_dir = dirs_download_dir();
        Settings {
            download_dir,
            max_concurrent: 3,
            segments_per_download: 8,
            speed_limit_kbps: 0,
            proxy_url: String::new(),
            notify_on_complete: true,
            watch_clipboard: true,
            auto_organize: false,
            queue_done_action: "none".into(),
            capture_enabled: true,
            capture_confirm: true,
            capture_port: 43666,
            capture_token: String::new(),
            capture_allowed_hosts: Vec::new(),
            launch_at_startup: false,
            scheduler_enabled: false,
            offpeak_start_min: 23 * 60,
            offpeak_end_min: 7 * 60,
            peak_limit_kbps: 512,
            category_rules: Vec::new(),
        }
    }
}

impl Settings {
    /// Global speed limit that should be in force right now (KB/s, 0 =
    /// unlimited), folding in the bandwidth scheduler.
    pub fn effective_speed_limit_kbps(&self, now_min: u32) -> u64 {
        if !self.scheduler_enabled || self.peak_limit_kbps == 0 {
            return self.speed_limit_kbps;
        }
        let off_peak = if self.offpeak_start_min <= self.offpeak_end_min {
            (self.offpeak_start_min..self.offpeak_end_min).contains(&now_min)
        } else {
            now_min >= self.offpeak_start_min || now_min < self.offpeak_end_min
        };
        if off_peak {
            self.speed_limit_kbps
        } else if self.speed_limit_kbps == 0 {
            self.peak_limit_kbps
        } else {
            self.speed_limit_kbps.min(self.peak_limit_kbps)
        }
    }

    /// Category a file type belongs to, honouring the user's rules. An
    /// extension listed in a rule wins over the built-in table, so a type can
    /// be moved out of the category it would otherwise land in.
    pub fn category_for(&self, file_type: &str) -> &str {
        for rule in &self.category_rules {
            if rule
                .extensions
                .iter()
                .any(|e| e.trim().eq_ignore_ascii_case(file_type))
            {
                return &rule.category;
            }
        }
        category_for_type(&file_type.to_ascii_uppercase())
    }

    /// Where a download of this name should be saved. The single place that
    /// answers the question, so the add, video, capture-staging and
    /// capture-rename paths cannot drift apart.
    pub fn folder_for_file(&self, file_name: &str) -> String {
        if !self.auto_organize {
            return self.download_dir.clone();
        }
        let category = self.category_for(&file_type_from_name(file_name)).to_string();
        let custom = self
            .category_rules
            .iter()
            .find(|r| r.category.eq_ignore_ascii_case(&category))
            .map(|r| r.folder.trim())
            .filter(|f| !f.is_empty());
        let base = std::path::Path::new(&self.download_dir);
        match custom {
            // An absolute folder points wherever the user said, including
            // another drive; a relative one hangs off the download folder.
            Some(f) if std::path::Path::new(f).is_absolute() => f.to_string(),
            Some(f) => base.join(f).to_string_lossy().to_string(),
            None => base.join(&category).to_string_lossy().to_string(),
        }
    }
}

fn legacy_launch_at_startup() -> bool {
    true
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
/// a file extension people actually download. Takes settings so a type the
/// user routed to a category counts as downloadable too.
pub fn is_downloadable_url(text: &str, settings: &Settings) -> bool {
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
    settings.category_for(&ext) != "Other"
        || matches!(ext.as_str(), "BIN" | "JAR" | "APPX" | "CRX" | "XPI")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::{Path, PathBuf};

    fn settings() -> Settings {
        Settings {
            download_dir: PathBuf::from("C:").join("Downloads").to_string_lossy().into(),
            auto_organize: true,
            ..Settings::default()
        }
    }

    fn rule(category: &str, folder: &str, extensions: &[&str]) -> CategoryRule {
        CategoryRule {
            category: category.into(),
            folder: folder.into(),
            extensions: extensions.iter().map(|e| e.to_string()).collect(),
        }
    }

    fn under_downloads(rest: &str) -> String {
        Path::new("C:")
            .join("Downloads")
            .join(rest)
            .to_string_lossy()
            .into()
    }

    #[test]
    fn the_clipboard_watcher_offers_a_type_the_user_claimed() {
        let plain = Settings::default();
        assert!(!is_downloadable_url("https://x.example/photo.heic", &plain));
        let mut s = settings();
        s.category_rules = vec![rule("Images", "", &["HEIC"])];
        assert!(is_downloadable_url("https://x.example/photo.heic", &s));
        // Unchanged for the cases it already handled either way.
        assert!(is_downloadable_url("https://x.example/setup.exe", &plain));
        assert!(!is_downloadable_url("https://x.example/page", &plain));
    }

    #[test]
    fn without_rules_a_file_lands_in_its_built_in_category() {
        assert_eq!(
            settings().folder_for_file("holiday.mp4"),
            under_downloads("Video")
        );
    }

    #[test]
    fn auto_organize_off_puts_everything_in_the_download_folder() {
        let mut s = settings();
        s.auto_organize = false;
        s.category_rules = vec![rule("Video", r"D:\Media", &[])];
        assert_eq!(s.folder_for_file("holiday.mp4"), s.download_dir);
    }

    #[test]
    fn a_relative_rule_folder_hangs_off_the_download_folder() {
        let mut s = settings();
        s.category_rules = vec![rule("Video", "Movies", &[])];
        assert_eq!(s.folder_for_file("holiday.mp4"), under_downloads("Movies"));
    }

    #[test]
    fn an_absolute_rule_folder_can_point_at_another_drive() {
        let mut s = settings();
        s.category_rules = vec![rule("Video", r"D:\Media\Films", &[])];
        assert_eq!(s.folder_for_file("holiday.mp4"), r"D:\Media\Films");
    }

    #[test]
    fn an_empty_rule_folder_keeps_the_default_subfolder() {
        let mut s = settings();
        s.category_rules = vec![rule("Video", "   ", &["MP4"])];
        assert_eq!(s.folder_for_file("holiday.mp4"), under_downloads("Video"));
    }

    #[test]
    fn a_listed_extension_moves_a_type_out_of_its_built_in_category() {
        let mut s = settings();
        // An mp4 is Video by default; the user wants these filed as Archives.
        s.category_rules = vec![rule("Archives", "", &["MP4"])];
        assert_eq!(s.category_for("MP4"), "Archives");
        assert_eq!(s.folder_for_file("holiday.mp4"), under_downloads("Archives"));
    }

    #[test]
    fn a_type_the_built_in_table_does_not_know_can_be_claimed() {
        let mut s = settings();
        s.category_rules = vec![rule("Images", "", &["heic"])];
        // Matching ignores case in both directions, and the built-in answer
        // for an unknown type is Other.
        assert_eq!(s.category_for("HEIC"), "Images");
        assert_eq!(Settings::default().category_for("HEIC"), "Other");
        assert_eq!(s.folder_for_file("photo.heic"), under_downloads("Images"));
    }

    #[test]
    fn the_first_matching_rule_wins() {
        let mut s = settings();
        s.category_rules = vec![rule("Music", "", &["MP4"]), rule("Video", "", &["MP4"])];
        assert_eq!(s.category_for("MP4"), "Music");
    }

    #[test]
    fn a_new_install_does_not_start_with_windows() {
        assert!(!Settings::default().launch_at_startup);
    }

    #[test]
    fn settings_saved_before_the_option_existed_keep_starting_with_windows() {
        let s: Settings = serde_json::from_str(r#"{"maxConcurrent":3}"#).unwrap();
        assert!(s.launch_at_startup);
    }

    #[test]
    fn a_saved_choice_is_kept() {
        let off: Settings = serde_json::from_str(r#"{"launchAtStartup":false}"#).unwrap();
        let on: Settings = serde_json::from_str(r#"{"launchAtStartup":true}"#).unwrap();
        assert!(!off.launch_at_startup);
        assert!(on.launch_at_startup);
    }
}
