mod capture;
mod commands;
mod db;
mod engine;
mod models;
mod ytdlp;

use std::time::Duration;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::window::{ProgressBarState, ProgressBarStatus};
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

use engine::DownloadManager;

pub(crate) fn show_main_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// One pass over the download list, feeding both the tray tooltip and the
/// taskbar progress bar.
#[derive(Default, PartialEq, Debug)]
struct QueueSummary {
    /// Downloading or merging right now.
    active: usize,
    queued: usize,
    paused: usize,
    /// Byte totals across in-flight downloads whose length is known. A server
    /// that sends no content-length, or a video mid-merge, still counts as
    /// in-flight but is left out of the ratio - otherwise it would drag the
    /// bar towards zero for the whole transfer.
    known_total: u64,
    known_done: u64,
}

impl QueueSummary {
    fn of(list: &[models::Download]) -> Self {
        use models::DownloadStatus::*;
        let mut s = Self::default();
        for d in list {
            match d.status {
                Downloading | Merging => s.active += 1,
                Queued => {
                    s.queued += 1;
                    continue;
                }
                Paused => s.paused += 1,
                Completed | Failed => continue,
            }
            if d.size_bytes > 0 {
                s.known_total += d.size_bytes;
                s.known_done += d.downloaded_bytes.min(d.size_bytes);
            }
        }
        s
    }

    fn tooltip(&self) -> String {
        match (self.active, self.queued) {
            (0, 0) => "Apex Download Manager".to_string(),
            (a, 0) => format!("Apex: {a} downloading"),
            (a, q) => format!("Apex: {a} downloading, {q} queued"),
        }
    }

    /// State for the Windows taskbar button. Paused work keeps the bar up in
    /// amber so a minimised window still admits there is something unfinished;
    /// once nothing is in flight the bar is hidden rather than left at 100%.
    ///
    /// Deliberately never `Error`: a failed download stays failed until the
    /// user acts on it, and Windows holds the button red for exactly as long
    /// as the state is set, so one dead link would leave the taskbar shouting
    /// indefinitely. Failures surface in the row and the notification instead.
    fn progress_bar(&self) -> ProgressBarState {
        if self.active == 0 && self.paused == 0 {
            return ProgressBarState {
                status: Some(ProgressBarStatus::None),
                progress: None,
            };
        }
        let percent = (self.known_total > 0)
            .then(|| (self.known_done.saturating_mul(100) / self.known_total).min(100));
        let status = match (self.active, percent) {
            // Everything in flight is paused.
            (0, _) => ProgressBarStatus::Paused,
            // Running, but nothing reported a size to measure against.
            (_, None) => ProgressBarStatus::Indeterminate,
            _ => ProgressBarStatus::Normal,
        };
        ProgressBarState {
            status: Some(status),
            progress: percent,
        }
    }
}

/// Register or remove the OS launch-at-sign-in entry to match the setting.
/// Errors are ignored: disabling an entry that was never registered fails
/// harmlessly, and a failed enable will be retried on the next app start.
/// Dev builds must never touch the OS entry: enable() rewrites the registered
/// path to the current exe, so a `tauri dev` run would hijack the installed
/// app's entry and boot the debug build from the repo instead.
pub(crate) fn apply_autostart(app: &tauri::AppHandle, enabled: bool) {
    if cfg!(debug_assertions) {
        return;
    }
    use tauri_plugin_autostart::ManagerExt;
    let autolaunch = app.autolaunch();
    let _ = if enabled {
        autolaunch.enable()
    } else {
        autolaunch.disable()
    };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Second launch: surface the existing window instead. A launch
            // carrying --autostart is the OS starting us at sign-in, not the
            // user asking for the window, so leave it in the tray.
            if !args.iter().any(|a| a == "--autostart") {
                show_main_window(app);
            }
        }))
        // The capture prompt must NOT have its state restored: it manages its
        // own size (auto-fits content) and visibility (Rust shows it per
        // capture) - a session that ended with it hidden would otherwise
        // resurrect every future prompt invisible and mis-sized.
        //
        // VISIBLE is dropped from the flags for the same reason, for every
        // window: visibility is decided here, not by whatever the last session
        // happened to end on. The main window is created hidden and shown once
        // the frontend reports its first paint, and an --autostart launch stays
        // in the tray. Restoring a saved `visible: true` broke both - it popped
        // the window open at sign-in whenever the previous session ended with
        // it on screen, and un-hid it before WebView2 had painted, which is the
        // white flash `visible: false` exists to prevent.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::all()
                        & !tauri_plugin_window_state::StateFlags::VISIBLE,
                )
                .with_denylist(&["capture"])
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let manager = DownloadManager::new(app.handle().clone())
                .map_err(|e| format!("failed to init download engine: {e}"))?;
            app.manage(manager);
            // Memory-only jar for browser cookies handed over with /grab.
            app.manage(ytdlp::GrabCookieJar::default());

            // Browser-extension capture endpoint (127.0.0.1 only).
            capture::start(app.handle().clone());

            // The limiter was built from the plain global limit; fold in the
            // bandwidth-scheduler window before anything downloads.
            app.state::<DownloadManager>().apply_scheduler_limit();

            // Keep the OS launch-at-sign-in entry in sync with the setting -
            // also repairs the registry path after the app moves or updates.
            apply_autostart(
                app.handle(),
                app.state::<DownloadManager>().get_settings().launch_at_startup,
            );

            // --- System tray: keep downloads alive with the window closed ---
            let show = MenuItem::with_id(app, "show", "Open Apex", true, None::<&str>)?;
            let pause_all = MenuItem::with_id(app, "pause_all", "Pause All", true, None::<&str>)?;
            let resume_all =
                MenuItem::with_id(app, "resume_all", "Resume All", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Apex", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &pause_all, &resume_all, &sep, &quit])?;
            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Apex Download Manager")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    let mgr = app.state::<DownloadManager>();
                    match event.id.as_ref() {
                        "show" => show_main_window(app),
                        "pause_all" => {
                            if let Ok(list) = mgr.list() {
                                for d in list {
                                    if matches!(
                                        d.status,
                                        models::DownloadStatus::Downloading
                                            | models::DownloadStatus::Queued
                                    ) {
                                        let _ = mgr.pause(&d.id);
                                    }
                                }
                            }
                        }
                        "resume_all" => {
                            if let Ok(list) = mgr.list() {
                                for d in list {
                                    if matches!(
                                        d.status,
                                        models::DownloadStatus::Paused
                                            | models::DownloadStatus::Failed
                                    ) {
                                        let _ = mgr.resume(&d.id);
                                    }
                                }
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // --- Scheduler tick: start due downloads, apply bandwidth window ---
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(Duration::from_secs(15)).await;
                    let mgr = handle.state::<DownloadManager>();
                    mgr.promote_queued();
                    mgr.apply_scheduler_limit();
                }
            });

            // --- Tray tooltip + taskbar progress: how far along the queue is ---
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut last_tip = String::new();
                loop {
                    tokio::time::sleep(Duration::from_secs(2)).await;
                    let summary = handle
                        .state::<DownloadManager>()
                        .list()
                        .map(|list| QueueSummary::of(&list))
                        .unwrap_or_default();

                    let tip = summary.tooltip();
                    if tip != last_tip {
                        if let Some(tray) = handle.tray_by_id("main-tray") {
                            let _ = tray.set_tooltip(Some(tip.as_str()));
                        }
                        last_tip = tip;
                    }

                    // Set every tick rather than only on change. The window
                    // has no taskbar button while it sits hidden in the tray,
                    // and a diff against the last value would never push the
                    // state again once it comes back. Pushing every tick
                    // restores the bar within 2s of the window reappearing
                    // (verified by hiding to the tray mid-download), and a
                    // value the button already has costs one call at 0.5 Hz
                    // and changes nothing on screen.
                    if let Some(w) = handle.get_webview_window("main") {
                        let _ = w.set_progress_bar(summary.progress_bar());
                    }
                }
            });

            // --- Clipboard watcher: offer to grab copied download URLs ---
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut last = String::new();
                loop {
                    tokio::time::sleep(Duration::from_millis(1500)).await;
                    if !handle
                        .state::<DownloadManager>()
                        .get_settings()
                        .watch_clipboard
                    {
                        continue;
                    }
                    let text = handle.clipboard().read_text().unwrap_or_default();
                    if text == last {
                        continue;
                    }
                    last = text.clone();
                    if models::is_downloadable_url(&text) {
                        let _ = handle.emit("clipboard:url", text.trim().to_string());
                    }
                }
            });

            Ok(())
        })
        // Closing the window hides to tray; downloads keep running. Quit via tray.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_downloads,
            commands::add_download,
            commands::pause_download,
            commands::resume_download,
            commands::restart_download,
            commands::get_download_segments,
            commands::schedule_download,
            commands::move_in_queue,
            commands::set_download_url,
            commands::set_download_speed_limit,
            commands::remove_download,
            commands::pause_all,
            commands::resume_all,
            commands::retry_failed,
            commands::open_download,
            commands::show_in_folder,
            commands::get_settings,
            commands::update_settings,
            commands::get_disk_usage,
            commands::compute_checksum,
            commands::execute_queue_action,
            commands::regenerate_capture_token,
            commands::allow_capture_host,
            commands::disk_free,
            commands::resolve_capture,
            commands::list_pending_captures,
            commands::ytdlp_status,
            commands::ytdlp_check_update,
            commands::install_ytdlp,
            commands::install_ffmpeg,
            commands::probe_video,
            commands::add_video,
            commands::signal_frontend_ready,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use models::{Download, DownloadStatus};

    fn dl(status: DownloadStatus, size_bytes: u64, downloaded_bytes: u64) -> Download {
        Download {
            id: "id".into(),
            name: "f.bin".into(),
            url: "https://example.com/f.bin".into(),
            file_type: "other".into(),
            size_bytes,
            downloaded_bytes,
            progress: 0.0,
            speed_bytes_per_sec: 0,
            eta_seconds: 0,
            status,
            segments: 1,
            modified_at: 0,
            save_path: String::new(),
            supports_ranges: true,
            error: None,
            created_at: 0,
            start_at: None,
            kind: "http".into(),
            speed_limit_kbps: 0,
            video_format: None,
            etag: None,
            last_modified: None,
            segment_states: Vec::new(),
            request_headers: Vec::new(),
            queue_order: None,
            subtitle_lang: None,
        }
    }

    /// ProgressBarStatus is a foreign enum with no PartialEq, so compare on a
    /// label instead of the value itself.
    fn bar(list: &[Download]) -> (&'static str, Option<u64>) {
        let s = QueueSummary::of(list).progress_bar();
        let label = match s.status {
            Some(ProgressBarStatus::None) => "none",
            Some(ProgressBarStatus::Normal) => "normal",
            Some(ProgressBarStatus::Indeterminate) => "indeterminate",
            Some(ProgressBarStatus::Paused) => "paused",
            Some(ProgressBarStatus::Error) => "error",
            _ => "unset",
        };
        (label, s.progress)
    }

    #[test]
    fn idle_hides_the_taskbar_bar() {
        let list = [
            dl(DownloadStatus::Completed, 100, 100),
            dl(DownloadStatus::Failed, 100, 20),
        ];
        assert_eq!(bar(&list), ("none", None));
        assert_eq!(QueueSummary::of(&list).tooltip(), "Apex Download Manager");
    }

    #[test]
    fn running_downloads_aggregate_by_bytes() {
        // 25 of 100 plus 75 of 300 is 100 of 400.
        let list = [
            dl(DownloadStatus::Downloading, 100, 25),
            dl(DownloadStatus::Downloading, 300, 75),
        ];
        assert_eq!(bar(&list), ("normal", Some(25)));
        assert_eq!(QueueSummary::of(&list).tooltip(), "Apex: 2 downloading");
    }

    #[test]
    fn queued_work_counts_in_the_tooltip_but_not_the_bar() {
        let list = [
            dl(DownloadStatus::Downloading, 100, 50),
            dl(DownloadStatus::Queued, 900, 0),
        ];
        assert_eq!(bar(&list), ("normal", Some(50)));
        assert_eq!(
            QueueSummary::of(&list).tooltip(),
            "Apex: 1 downloading, 1 queued"
        );
    }

    #[test]
    fn unknown_size_is_left_out_of_the_ratio() {
        let list = [
            dl(DownloadStatus::Downloading, 0, 4096),
            dl(DownloadStatus::Downloading, 100, 40),
        ];
        assert_eq!(bar(&list), ("normal", Some(40)));
    }

    #[test]
    fn running_without_any_known_size_is_indeterminate() {
        let list = [dl(DownloadStatus::Downloading, 0, 4096)];
        assert_eq!(bar(&list), ("indeterminate", None));
    }

    #[test]
    fn all_paused_turns_the_bar_amber_and_keeps_the_position() {
        let list = [dl(DownloadStatus::Paused, 100, 40)];
        assert_eq!(bar(&list), ("paused", Some(40)));
        // Nothing is running, so the tooltip stays neutral.
        assert_eq!(QueueSummary::of(&list).tooltip(), "Apex Download Manager");
    }

    #[test]
    fn one_runner_beats_paused_neighbours() {
        let list = [
            dl(DownloadStatus::Paused, 100, 90),
            dl(DownloadStatus::Downloading, 100, 10),
        ];
        assert_eq!(bar(&list), ("normal", Some(50)));
    }

    #[test]
    fn overshooting_bytes_cannot_exceed_a_hundred() {
        // A resumed download can briefly report more bytes than the probe
        // reported as the length; the bar must not run past the end.
        let list = [dl(DownloadStatus::Downloading, 100, 140)];
        assert_eq!(bar(&list), ("normal", Some(100)));
    }
}
