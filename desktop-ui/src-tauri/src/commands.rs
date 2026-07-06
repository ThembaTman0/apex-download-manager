use crate::engine::{CaptureView, DownloadManager};
use crate::models::{DiskUsage, Download, Settings};
use tauri::State;

#[tauri::command]
pub async fn list_downloads(mgr: State<'_, DownloadManager>) -> Result<Vec<Download>, String> {
    mgr.list()
}

#[tauri::command]
pub async fn add_download(
    mgr: State<'_, DownloadManager>,
    url: String,
    save_dir: Option<String>,
    file_name: Option<String>,
) -> Result<Download, String> {
    mgr.add(url, save_dir, file_name, Vec::new())
}

#[tauri::command]
pub async fn pause_download(mgr: State<'_, DownloadManager>, id: String) -> Result<(), String> {
    mgr.pause(&id)
}

#[tauri::command]
pub async fn resume_download(mgr: State<'_, DownloadManager>, id: String) -> Result<(), String> {
    mgr.resume(&id)
}

#[tauri::command]
pub async fn restart_download(mgr: State<'_, DownloadManager>, id: String) -> Result<(), String> {
    mgr.restart(&id).await
}

#[tauri::command]
pub async fn get_download_segments(
    mgr: State<'_, DownloadManager>,
    id: String,
) -> Result<Vec<crate::models::Segment>, String> {
    let d = mgr.get(&id)?.ok_or("download not found")?;
    Ok(d.segment_states)
}

#[tauri::command]
pub async fn set_download_speed_limit(
    mgr: State<'_, DownloadManager>,
    id: String,
    kbps: u64,
) -> Result<(), String> {
    mgr.set_speed_limit(&id, kbps)
}

#[tauri::command]
pub async fn schedule_download(
    mgr: State<'_, DownloadManager>,
    id: String,
    start_at: Option<i64>,
) -> Result<(), String> {
    mgr.schedule(&id, start_at).await
}

#[tauri::command]
pub async fn compute_checksum(mgr: State<'_, DownloadManager>, id: String) -> Result<String, String> {
    let d = mgr.get(&id)?.ok_or("download not found")?;
    let path = crate::engine::final_path(&d);
    tauri::async_runtime::spawn_blocking(move || {
        use sha2::{Digest, Sha256};
        let mut file = std::fs::File::open(&path).map_err(|e| format!("cannot open file: {e}"))?;
        let mut hasher = Sha256::new();
        std::io::copy(&mut file, &mut hasher).map_err(|e| e.to_string())?;
        Ok(format!("{:x}", hasher.finalize()))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn regenerate_capture_token(
    mgr: State<'_, DownloadManager>,
) -> Result<Settings, String> {
    let mut s = mgr.get_settings();
    s.capture_token = uuid::Uuid::new_v4().simple().to_string();
    mgr.update_settings(s)
}

#[tauri::command]
pub async fn list_pending_captures(
    mgr: State<'_, DownloadManager>,
) -> Result<Vec<CaptureView>, String> {
    Ok(mgr.list_pending_captures())
}

#[tauri::command]
pub async fn resolve_capture(
    mgr: State<'_, DownloadManager>,
    id: String,
    approved: bool,
    save_dir: Option<String>,
    file_name: Option<String>,
) -> Result<Option<Download>, String> {
    mgr.resolve_capture(&id, approved, save_dir, file_name)
}

// --- Video grabber (yt-dlp) ---

#[tauri::command]
pub async fn ytdlp_status(app: tauri::AppHandle) -> Result<crate::ytdlp::ToolsStatus, String> {
    Ok(crate::ytdlp::status(&app).await)
}

#[tauri::command]
pub async fn ytdlp_check_update(
    app: tauri::AppHandle,
) -> Result<crate::ytdlp::UpdateCheck, String> {
    Ok(crate::ytdlp::check_update(&app).await)
}

#[tauri::command]
pub async fn install_ytdlp(app: tauri::AppHandle) -> Result<crate::ytdlp::ToolsStatus, String> {
    crate::ytdlp::install_ytdlp(&app).await
}

#[tauri::command]
pub async fn install_ffmpeg(app: tauri::AppHandle) -> Result<crate::ytdlp::ToolsStatus, String> {
    crate::ytdlp::install_ffmpeg(&app).await
}

#[tauri::command]
pub async fn probe_video(
    app: tauri::AppHandle,
    url: String,
) -> Result<crate::ytdlp::VideoProbe, String> {
    crate::ytdlp::probe(&app, &url).await
}

#[tauri::command]
pub async fn add_video(
    mgr: State<'_, DownloadManager>,
    url: String,
    title: String,
    ext: String,
    selector: String,
    save_dir: Option<String>,
) -> Result<Download, String> {
    mgr.add_video(url, title, ext, selector, save_dir)
}

#[tauri::command]
pub async fn execute_queue_action(action: String) -> Result<(), String> {
    #[cfg(windows)]
    match action.as_str() {
        "shutdown" => {
            std::process::Command::new("shutdown")
                .args(["/s", "/t", "5"])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        "hibernate" => {
            std::process::Command::new("shutdown")
                .args(["/h"])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        "sleep" => {
            std::process::Command::new("rundll32.exe")
                .args(["powrprof.dll,SetSuspendState", "0,1,0"])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        _ => {}
    }
    #[cfg(not(windows))]
    let _ = action;
    Ok(())
}

#[tauri::command]
pub async fn remove_download(
    mgr: State<'_, DownloadManager>,
    id: String,
    delete_file: bool,
) -> Result<(), String> {
    mgr.remove(&id, delete_file).await
}

#[tauri::command]
pub async fn pause_all(mgr: State<'_, DownloadManager>) -> Result<(), String> {
    for d in mgr.list()? {
        if matches!(
            d.status,
            crate::models::DownloadStatus::Downloading | crate::models::DownloadStatus::Queued
        ) {
            let _ = mgr.pause(&d.id);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn resume_all(mgr: State<'_, DownloadManager>) -> Result<(), String> {
    for d in mgr.list()? {
        if matches!(
            d.status,
            crate::models::DownloadStatus::Paused | crate::models::DownloadStatus::Failed
        ) {
            let _ = mgr.resume(&d.id);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn open_download(mgr: State<'_, DownloadManager>, id: String) -> Result<(), String> {
    mgr.open_file(&id)
}

#[tauri::command]
pub async fn show_in_folder(mgr: State<'_, DownloadManager>, id: String) -> Result<(), String> {
    mgr.show_in_folder(&id)
}

#[tauri::command]
pub async fn get_settings(mgr: State<'_, DownloadManager>) -> Result<Settings, String> {
    Ok(mgr.get_settings())
}

#[tauri::command]
pub async fn update_settings(
    mgr: State<'_, DownloadManager>,
    settings: Settings,
) -> Result<Settings, String> {
    mgr.update_settings(settings)
}

#[tauri::command]
pub async fn get_disk_usage(mgr: State<'_, DownloadManager>) -> Result<DiskUsage, String> {
    let dir = mgr.get_settings().download_dir;
    let path = std::path::Path::new(&dir);
    let probe = if path.exists() {
        path.to_path_buf()
    } else {
        std::env::temp_dir()
    };
    let total = fs2::total_space(&probe).map_err(|e| e.to_string())?;
    let free = fs2::free_space(&probe).map_err(|e| e.to_string())?;
    let label = probe
        .components()
        .next()
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .unwrap_or_else(|| "Disk".into());
    Ok(DiskUsage {
        used_bytes: total.saturating_sub(free),
        total_bytes: total,
        label,
    })
}
