mod capture;
mod commands;
mod db;
mod engine;
mod models;
mod ytdlp;

use std::time::Duration;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

use engine::DownloadManager;

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Second launch: surface the existing window instead.
            show_main_window(app);
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let manager = DownloadManager::new(app.handle().clone())
                .map_err(|e| format!("failed to init download engine: {e}"))?;
            app.manage(manager);

            // Browser-extension capture endpoint (127.0.0.1 only).
            capture::start(app.handle().clone());

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

            // --- Scheduler tick: start downloads whose start time arrived ---
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(Duration::from_secs(15)).await;
                    handle.state::<DownloadManager>().promote_queued();
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
            commands::remove_download,
            commands::pause_all,
            commands::resume_all,
            commands::open_download,
            commands::show_in_folder,
            commands::get_settings,
            commands::update_settings,
            commands::get_disk_usage,
            commands::compute_checksum,
            commands::execute_queue_action,
            commands::regenerate_capture_token,
            commands::resolve_capture,
            commands::list_pending_captures,
            commands::ytdlp_status,
            commands::install_ytdlp,
            commands::install_ffmpeg,
            commands::probe_video,
            commands::add_video,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
