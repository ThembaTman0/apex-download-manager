use crate::models::{Download, DownloadStatus, Segment, Settings};
use rusqlite::{params, Connection};
use std::path::Path;

pub struct Db {
    conn: Connection,
}

impl Db {
    pub fn open(path: &Path) -> Result<Db, String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS downloads (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                file_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL DEFAULT 0,
                downloaded_bytes INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                segments INTEGER NOT NULL DEFAULT 1,
                modified_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                save_path TEXT NOT NULL,
                supports_ranges INTEGER NOT NULL DEFAULT 0,
                error TEXT,
                segment_states TEXT NOT NULL DEFAULT '[]'
             );
             CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
             );",
        )
        .map_err(|e| e.to_string())?;

        // Additive migrations - ignore "duplicate column" on existing DBs.
        for ddl in [
            "ALTER TABLE downloads ADD COLUMN etag TEXT",
            "ALTER TABLE downloads ADD COLUMN last_modified TEXT",
            "ALTER TABLE downloads ADD COLUMN start_at INTEGER",
            "ALTER TABLE downloads ADD COLUMN request_headers TEXT",
            "ALTER TABLE downloads ADD COLUMN kind TEXT",
            "ALTER TABLE downloads ADD COLUMN video_format TEXT",
            "ALTER TABLE downloads ADD COLUMN speed_limit_kbps INTEGER",
        ] {
            let _ = conn.execute(ddl, []);
        }

        // Anything left "downloading"/"merging" from a previous session was
        // interrupted - surface it as paused so it can be resumed. Scheduled
        // items (with a start time) stay queued for the ticker to pick up.
        conn.execute(
            "UPDATE downloads SET status = 'paused'
             WHERE status IN ('downloading', 'merging')
                OR (status = 'queued' AND start_at IS NULL)",
            [],
        )
        .map_err(|e| e.to_string())?;

        Ok(Db { conn })
    }

    pub fn upsert_download(&self, d: &Download) -> Result<(), String> {
        let segs = serde_json::to_string(&d.segment_states).map_err(|e| e.to_string())?;
        let req_headers = serde_json::to_string(&d.request_headers).map_err(|e| e.to_string())?;
        self.conn
            .execute(
                "INSERT INTO downloads (id, name, url, file_type, size_bytes, downloaded_bytes, status,
                    segments, modified_at, created_at, save_path, supports_ranges, error, segment_states,
                    etag, last_modified, start_at, request_headers, kind, video_format, speed_limit_kbps)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
                 ON CONFLICT(id) DO UPDATE SET
                    name = ?2, url = ?3, file_type = ?4, size_bytes = ?5, downloaded_bytes = ?6,
                    status = ?7, segments = ?8, modified_at = ?9, save_path = ?11,
                    supports_ranges = ?12, error = ?13, segment_states = ?14,
                    etag = ?15, last_modified = ?16, start_at = ?17, request_headers = ?18,
                    kind = ?19, video_format = ?20, speed_limit_kbps = ?21",
                params![
                    d.id,
                    d.name,
                    d.url,
                    d.file_type,
                    d.size_bytes as i64,
                    d.downloaded_bytes as i64,
                    d.status.as_str(),
                    d.segments as i64,
                    d.modified_at,
                    d.created_at,
                    d.save_path,
                    d.supports_ranges as i64,
                    d.error,
                    segs,
                    d.etag,
                    d.last_modified,
                    d.start_at,
                    req_headers,
                    d.kind,
                    d.video_format,
                    d.speed_limit_kbps as i64,
                ],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_download(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM downloads WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_download(&self, id: &str) -> Result<Option<Download>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM downloads WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(params![id], row_to_download)
            .map_err(|e| e.to_string())?;
        match rows.next() {
            Some(r) => Ok(Some(r.map_err(|e| e.to_string())?)),
            None => Ok(None),
        }
    }

    pub fn list_downloads(&self) -> Result<Vec<Download>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM downloads ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], row_to_download)
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| e.to_string())?);
        }
        Ok(out)
    }

    pub fn oldest_queued(&self, now_millis: i64) -> Result<Option<Download>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT * FROM downloads
                 WHERE status = 'queued' AND (start_at IS NULL OR start_at <= ?1)
                 ORDER BY created_at ASC LIMIT 1",
            )
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(params![now_millis], row_to_download)
            .map_err(|e| e.to_string())?;
        match rows.next() {
            Some(r) => Ok(Some(r.map_err(|e| e.to_string())?)),
            None => Ok(None),
        }
    }

    pub fn load_settings(&self) -> Settings {
        let value: Result<String, _> = self.conn.query_row(
            "SELECT value FROM settings WHERE key = 'settings'",
            [],
            |row| row.get(0),
        );
        match value {
            Ok(json) => serde_json::from_str(&json).unwrap_or_default(),
            Err(_) => Settings::default(),
        }
    }

    pub fn save_settings(&self, s: &Settings) -> Result<(), String> {
        let json = serde_json::to_string(s).map_err(|e| e.to_string())?;
        self.conn
            .execute(
                "INSERT INTO settings (key, value) VALUES ('settings', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = ?1",
                params![json],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

fn row_to_download(row: &rusqlite::Row) -> rusqlite::Result<Download> {
    let status: String = row.get("status")?;
    let segs_json: String = row.get("segment_states")?;
    let segment_states: Vec<Segment> = serde_json::from_str(&segs_json).unwrap_or_default();
    let kind: Option<String> = row.get("kind")?;
    let video_format: Option<String> = row.get("video_format")?;
    let headers_json: Option<String> = row.get("request_headers")?;
    let speed_limit_kbps: Option<i64> = row.get("speed_limit_kbps")?;
    let request_headers: Vec<(String, String)> = headers_json
        .and_then(|j| serde_json::from_str(&j).ok())
        .unwrap_or_default();
    let size_bytes: i64 = row.get("size_bytes")?;
    let downloaded_bytes: i64 = row.get("downloaded_bytes")?;
    let size_bytes = size_bytes.max(0) as u64;
    let downloaded_bytes = downloaded_bytes.max(0) as u64;
    let progress = if size_bytes > 0 {
        (downloaded_bytes as f64 / size_bytes as f64 * 100.0).min(100.0)
    } else if status == "completed" {
        100.0
    } else {
        0.0
    };
    let segments: i64 = row.get("segments")?;
    let supports_ranges: i64 = row.get("supports_ranges")?;
    Ok(Download {
        id: row.get("id")?,
        name: row.get("name")?,
        url: row.get("url")?,
        file_type: row.get("file_type")?,
        size_bytes,
        downloaded_bytes,
        progress,
        speed_bytes_per_sec: 0,
        eta_seconds: 0,
        status: DownloadStatus::from_str(&status),
        segments: segments.max(1) as u32,
        modified_at: row.get("modified_at")?,
        save_path: row.get("save_path")?,
        supports_ranges: supports_ranges != 0,
        error: row.get("error")?,
        created_at: row.get("created_at")?,
        start_at: row.get("start_at")?,
        kind: kind.filter(|k| !k.is_empty()).unwrap_or_else(crate::models::default_kind),
        speed_limit_kbps: speed_limit_kbps.unwrap_or(0).max(0) as u64,
        video_format,
        etag: row.get("etag")?,
        last_modified: row.get("last_modified")?,
        segment_states,
        request_headers,
    })
}
