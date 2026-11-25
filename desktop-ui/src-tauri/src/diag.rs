//! A small local diagnostic log (`apex.log` in Apex's data folder).
//!
//! Records the engine decisions that are otherwise invisible after the fact:
//! retries, what the server answered when a download resumed, and why a
//! download had to start over. It never leaves the machine, and URLs are cut
//! down to their host so signed download links (whose query strings carry
//! access tokens) are never written to disk.

use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

/// Rotate at this size: the current file becomes `apex.log.1` (replacing the
/// older one), so the log never takes more than about twice this on disk.
const MAX_LOG_BYTES: u64 = 1024 * 1024;

static LOG_PATH: OnceLock<PathBuf> = OnceLock::new();
static WRITE_LOCK: Mutex<()> = Mutex::new(());

/// Point the log at Apex's data folder. Called once at startup; later calls
/// are ignored.
pub fn init(data_dir: &std::path::Path) {
    let _ = LOG_PATH.set(data_dir.join("apex.log"));
}

/// Where the log lives (set at startup).
pub fn path() -> Option<PathBuf> {
    LOG_PATH.get().cloned()
}

/// Append one line. Best effort: a log that can't be written must never
/// affect a download.
pub fn log(event: &str) {
    let Some(path) = LOG_PATH.get() else { return };
    let _guard = WRITE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    if std::fs::metadata(path).map(|m| m.len() >= MAX_LOG_BYTES).unwrap_or(false) {
        let _ = std::fs::rename(path, path.with_extension("log.1"));
    }
    let line = format!(
        "{} {}\n",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        redact(event)
    );
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = f.write_all(line.as_bytes());
    }
}

/// Drops the query string and fragment from every URL in `text`, so error
/// messages that quote a URL (reqwest does) can't leak a signed link's token.
pub fn redact(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(at) = rest.find("http") {
        out.push_str(&rest[..at]);
        let url = &rest[at..];
        // A URL ends at whitespace or a closing bracket/quote.
        let end = url
            .find(|c: char| c.is_whitespace() || matches!(c, ')' | ']' | '"' | '\''))
            .unwrap_or(url.len());
        let (whole, tail) = url.split_at(end);
        let cut = whole.find(['?', '#']).unwrap_or(whole.len());
        out.push_str(&whole[..cut]);
        if cut < whole.len() {
            out.push_str("?…");
        }
        rest = tail;
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
mod tests {
    use super::redact;

    #[test]
    fn redact_strips_query_strings_from_urls() {
        let e = "error sending request for url (https://x.r2.cloudflarestorage.com/f.mkv?X-Amz-Signature=secret&a=b)";
        let r = redact(e);
        assert!(!r.contains("secret"), "{r}");
        assert!(r.contains("https://x.r2.cloudflarestorage.com/f.mkv?…)"), "{r}");
    }

    #[test]
    fn redact_keeps_text_without_urls() {
        assert_eq!(redact("segment 3: connection stalled"), "segment 3: connection stalled");
        assert_eq!(redact("see http://a.b/c ok"), "see http://a.b/c ok");
    }
}
