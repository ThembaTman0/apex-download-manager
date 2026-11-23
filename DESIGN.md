# How Apex is designed, and why

This document explains the decisions behind Apex Download Manager: what the
engine does, why it does it that way, and which alternatives were turned down.
It is written for contributors and for anyone deciding whether to trust Apex
with their downloads. The code is the final word; file and constant names are
given so each claim can be checked.

## Goals, in priority order

1. **Never hand you a corrupt file.** A download that finishes must be
   byte-for-byte what the server serves. Speed is worth nothing if the file is
   wrong.
2. **Never lose progress.** A pause, a crash, a reboot or a dropped connection
   should cost seconds, not the download.
3. **Be fast where it's possible**, by using several connections per file.
4. **Stay small and local.** No account, no telemetry, nothing listening
   beyond this machine.

When two goals conflict, the higher one wins. Several choices below give up a
little speed for safety on purpose.

## The engine (`desktop-ui/src-tauri/src/engine.rs`)

### One preallocated file, written in place

Apex probes the URL with a ranged request (`bytes=0-0`) to learn the size,
whether the server supports ranges, and its `ETag` or `Last-Modified`. It then
creates a single temp file named `<file>.adm` at the full size, marks it sparse
on Windows, and every connection writes its bytes straight to their final
offset. When the last byte lands, the temp file is renamed to the real name.

**Why:** there is no merge step at the end, so finishing a 50 GB file takes no
extra time or disk space. Renaming is atomic, so a file with the real name is
always a finished file; anything unfinished still ends in `.adm`. Checking free
space before preallocating means a full disk fails in the first second, not at
90%.

**Why not one temp file per connection, joined at the end?** It is simpler
to reason about, but it doubles disk use while joining and adds a slow final
step that can itself fail.

### Up to 32 connections, re-split as they finish

A file is planned into up to 32 segments (`plan_segments`; your Settings value
caps it). Each segment is a byte range with a start, an end and a count of
bytes done. When a connection finishes its range, Apex finds the largest
remaining range and splits it in half: the original connection keeps the first
half and the freed connection takes the second (`try_split`).

**Why:** with fixed segments, the last few percent of a download are often one
slow connection crawling through its range while the others sit idle.
Re-splitting keeps every connection busy until the end.

**How it stays safe without locks:** each segment's end is an `AtomicU64`.
The worker re-reads its end before every chunk and never writes past it
(`download_segment`), so a split only ever moves the end closer and the worker
simply stops earlier. No lock is taken on the hot path.

**Limits, and why they exist:**

- No split leaves a piece under 256 KB (`MIN_SEGMENT_BYTES`), so a split needs
  at least 512 KB remaining. Below that, opening a new connection costs more
  than it saves.
- The segment table is capped at 128 entries (`MAX_TOTAL_SEGMENTS`), so a long
  download can't grow it without bound.
- Servers that ignore ranges get one connection and no resume. Apex says so in
  Properties instead of pretending.

### Resume that refuses to mix two files

Per-segment progress is saved to SQLite (`db.rs`, WAL mode) every 2 seconds and
when a download stops. On resume, before writing anything, Apex sends a
`bytes=0-0` request with `If-Range` set to the saved `ETag` or
`Last-Modified`. If the server answers with the whole file (200) instead of a
range (206), the file changed: Apex throws away the partial data and starts
over. Every segment request carries the same `If-Range`, so a file that
changes mid-download is caught too.

**Why:** splicing new bytes onto old ones produces a file that looks complete
and is silently broken. Starting over costs time; a corrupt file costs trust.

### Counting a byte only once it's written

The saved progress must never claim bytes the file doesn't have, or a resume
after a crash would skip them and leave a hole of zeros. Since 1.2, each chunk
is written and flushed to the operating system before the segment's counter
moves (`download_segment`). A forced kill can then lose at most the chunk that
was in flight, which is simply downloaded again.

This is checked, not assumed: `desktop-ui/scripts/crash-resume-test.mjs`
serves a deterministic file, force-kills Apex at random points (10 times by
default), lets it resume, and compares the SHA-256 of the result. CI runs it on
every change to the engine (`.github/workflows/crash-test.yml`).

**Turned down:** a larger write buffer per connection (proposed in PR #54).
It would cut system calls, but the counter would run ahead of the data on disk,
which is exactly the hole described above. If buffering comes back, the
counter has to follow the flushed position, not the buffered one.

Scope, honestly: this protects against Apex being killed or crashing. A power
cut can still lose data the operating system had not yet written to the disk;
Apex does not force every chunk to disk, because that would make it many times
slower.

### Retries

A segment retries its own range a few times with backoff before failing, and
its count of failed attempts resets whenever data flows again, so a long
download isn't killed by a handful of hiccups hours apart. A failed download as
a whole retries up to 3 times (`MAX_RETRIES`), waiting longer each time. A
connection that receives nothing for 60 seconds is treated as stalled and
retried from where it stopped.

## Browser capture (`capture.rs`, `browser-extension/`)

The extension cancels the browser's download before any Save As dialog and
hands the URL, cookie, referer and user agent to Apex over HTTP on
`127.0.0.1:43666`.

- **Local only.** The server binds to 127.0.0.1, never to all interfaces, so
  nothing on your network can reach it.
- **Token-gated.** Every request must carry the pairing token, compared in
  constant time. Pairing is started by the extension and approved by you in
  Apex.
- **Minimal forwarding.** Only `cookie`, `referer` and `user-agent` reach the
  engine; requests and headers are size-limited.
- **Nothing is lost.** If Apex isn't running or rejects the download, the
  extension restarts it in the browser.
- **No page access.** The extension has no content scripts and reads no page
  content. Its host permissions exist only to hand over cookies and to notice
  media streams for the video grabber.

## Video (`ytdlp.rs`)

Apex doesn't reimplement site extractors. It drives yt-dlp, and uses FFmpeg to
merge separate video and audio streams and Deno so yt-dlp can see YouTube's
full list of formats. On Windows Apex can install all three into its own data
folder; on Linux it uses the copies from your package manager.

**Why:** yt-dlp is maintained by people who track site changes daily. Copying
its logic would be stale within weeks.

## The app (Tauri, React, SQLite)

- **Tauri instead of Electron.** The system's WebView renders the UI and the
  engine is native Rust, so the Windows installer is about 5 MB instead of
  100 MB or more.
- **SQLite with WAL** keeps the download list and segment progress, written in
  small transactions so a crash never leaves it half-written.
- **Completed files get Mark-of-the-Web**, so SmartScreen and Defender treat
  them like browser downloads. Only the site's origin is recorded, never the
  full URL, because download links often carry login tokens.
- **Portable mode**: a file named `portable` next to the exe moves all data to
  a `data` folder beside it and turns off self-updates, which would otherwise
  install a second copy.

## Privacy

The app has no accounts and no telemetry; it only talks to the sites you
download from, GitHub for update checks, and the tool downloads you start.
The website counts downloads in aggregate and uses cookieless page-view
analytics, both described on its privacy page.

## Releases you can check

Releases are built by `.github/workflows/release.yml` from a tagged commit,
never on a personal machine. Since 1.2, every installer, the portable zip, the
AppImage and the .deb carry a signed build-provenance attestation, and each
release lists SHA-256 checksums:

```
gh attestation verify <file> --repo ThembaTman0/apex-download-manager
```

This proves a file came from this repository's workflow and the tagged source.
It is not code signing: Windows SmartScreen does not read it, so a new release
can still show an "unrecognized app" warning until code signing is in place.

## Known limits

- One connection and no resume on servers that don't support ranges.
- No protection against power loss beyond what the operating system provides
  (see above).
- Per-connection speeds aren't measured, only the download's total.
- The Windows installer is not code-signed yet.
