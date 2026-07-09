//! Localhost capture endpoint for the browser extension.
//!
//! Deliberately minimal HTTP/1.1: two routes, bound to 127.0.0.1 only, and
//! every state-changing request must carry the shared token from Settings.

use crate::engine::DownloadManager;
use serde::Deserialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

const MAX_HEADER_BYTES: usize = 16 * 1024;
const MAX_BODY_BYTES: usize = 64 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddRequest {
    url: String,
    #[serde(default)]
    file_name: Option<String>,
    /// Browser context (cookies, referrer, user-agent) so the engine can
    /// fetch URLs that sit behind a login. Anything outside the whitelist
    /// below is dropped.
    #[serde(default)]
    headers: std::collections::HashMap<String, String>,
}

const FORWARDABLE_HEADERS: [&str; 3] = ["cookie", "referer", "user-agent"];

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let port = app.state::<DownloadManager>().get_settings().capture_port;
        let listener = match TcpListener::bind(("127.0.0.1", port)).await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("capture server: cannot bind 127.0.0.1:{port}: {e}");
                return;
            }
        };
        loop {
            let Ok((stream, _)) = listener.accept().await else {
                continue;
            };
            let app = app.clone();
            tokio::spawn(async move {
                let _ = handle_conn(stream, app).await;
            });
        }
    });
}

async fn handle_conn(mut stream: TcpStream, app: AppHandle) -> std::io::Result<()> {
    let mut buf: Vec<u8> = Vec::with_capacity(2048);
    let mut tmp = [0u8; 2048];
    let header_end = loop {
        let n = stream.read(&mut tmp).await?;
        if n == 0 {
            return Ok(());
        }
        buf.extend_from_slice(&tmp[..n]);
        if let Some(pos) = find(&buf, b"\r\n\r\n") {
            break pos + 4;
        }
        if buf.len() > MAX_HEADER_BYTES {
            return respond(&mut stream, 431, r#"{"ok":false}"#).await;
        }
    };

    let head = String::from_utf8_lossy(&buf[..header_end]).to_string();
    let mut lines = head.lines();
    let mut request = lines.next().unwrap_or("").split_whitespace();
    let method = request.next().unwrap_or("").to_uppercase();
    let path = request
        .next()
        .unwrap_or("")
        .split('?')
        .next()
        .unwrap_or("")
        .to_string();

    let mut content_length = 0usize;
    let mut token = String::new();
    for line in lines {
        let Some((k, v)) = line.split_once(':') else {
            continue;
        };
        match k.trim().to_ascii_lowercase().as_str() {
            "content-length" => content_length = v.trim().parse().unwrap_or(0),
            "x-apex-token" => token = v.trim().to_string(),
            _ => {}
        }
    }

    match (method.as_str(), path.as_str()) {
        // CORS preflight for the extension's fetch()
        ("OPTIONS", _) => respond(&mut stream, 204, "").await,
        ("GET", "/ping") => {
            respond(
                &mut stream,
                200,
                r#"{"ok":true,"app":"apex-download-manager"}"#,
            )
            .await
        }
        ("POST", "/add") => {
            if content_length > MAX_BODY_BYTES {
                return respond(&mut stream, 413, r#"{"ok":false}"#).await;
            }
            let mut body = buf[header_end..].to_vec();
            while body.len() < content_length {
                let n = stream.read(&mut tmp).await?;
                if n == 0 {
                    break;
                }
                body.extend_from_slice(&tmp[..n]);
            }

            let mgr = app.state::<DownloadManager>();
            let settings = mgr.get_settings();
            if !settings.capture_enabled {
                return respond(&mut stream, 503, r#"{"ok":false,"error":"capture disabled"}"#)
                    .await;
            }
            if settings.capture_token.is_empty() || token != settings.capture_token {
                return respond(&mut stream, 401, r#"{"ok":false,"error":"bad token"}"#).await;
            }
            let req: AddRequest = match serde_json::from_slice(&body) {
                Ok(r) => r,
                Err(_) => return respond(&mut stream, 400, r#"{"ok":false,"error":"bad json"}"#).await,
            };
            let request_headers: Vec<(String, String)> = req
                .headers
                .into_iter()
                .filter_map(|(k, v)| {
                    let k = k.trim().to_ascii_lowercase();
                    let ok = FORWARDABLE_HEADERS.contains(&k.as_str())
                        && !v.contains(['\r', '\n'])
                        && !v.is_empty();
                    ok.then_some((k, v))
                })
                .collect();

            // Hosts the user marked "always allow" skip the approval prompt.
            let host_allowed = reqwest::Url::parse(&req.url)
                .ok()
                .and_then(|u| u.host_str().map(|h| h.to_ascii_lowercase()))
                .map(|h| settings.capture_allowed_hosts.iter().any(|a| a == &h))
                .unwrap_or(false);

            // With confirmation on, hold the capture for user approval rather
            // than downloading it silently. The extension has already canceled
            // the browser's copy, so a rejected capture downloads nowhere.
            if settings.capture_confirm && !host_allowed {
                return match mgr.stage_capture(req.url, req.file_name, request_headers) {
                    Ok(id) => {
                        let reply = format!(
                            r#"{{"ok":true,"pending":true,"id":{}}}"#,
                            serde_json::to_string(&id).unwrap_or_default()
                        );
                        respond(&mut stream, 200, &reply).await
                    }
                    Err(e) => {
                        let reply = format!(
                            r#"{{"ok":false,"error":{}}}"#,
                            serde_json::to_string(&e).unwrap_or_default()
                        );
                        respond(&mut stream, 400, &reply).await
                    }
                };
            }

            match mgr.add(req.url, None, req.file_name, request_headers) {
                Ok(d) => {
                    let _ = app
                        .notification()
                        .builder()
                        .title("Captured from browser")
                        .body(&d.name)
                        .show();
                    let reply = format!(
                        r#"{{"ok":true,"id":{},"name":{}}}"#,
                        serde_json::to_string(&d.id).unwrap_or_default(),
                        serde_json::to_string(&d.name).unwrap_or_default()
                    );
                    respond(&mut stream, 200, &reply).await
                }
                Err(e) => {
                    let reply = format!(
                        r#"{{"ok":false,"error":{}}}"#,
                        serde_json::to_string(&e).unwrap_or_default()
                    );
                    respond(&mut stream, 400, &reply).await
                }
            }
        }
        _ => respond(&mut stream, 404, r#"{"ok":false}"#).await,
    }
}

async fn respond(stream: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        204 => "No Content",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        413 => "Payload Too Large",
        431 => "Request Header Fields Too Large",
        503 => "Service Unavailable",
        _ => "",
    };
    let response = format!(
        "HTTP/1.1 {status} {reason}\r\n\
         Content-Type: application/json\r\n\
         Content-Length: {}\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
         Access-Control-Allow-Headers: content-type, x-apex-token\r\n\
         Connection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(response.as_bytes()).await?;
    stream.shutdown().await
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}
