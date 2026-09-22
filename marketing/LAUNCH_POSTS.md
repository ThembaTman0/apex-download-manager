# Launch posts

Drafts for the launch, meant to go out **after the installer is signed**
(SignPath) **and 1.0.10 is released** (several features below, such as the
reorderable queue and replacing an expired link, ship in 1.0.10). House
style: no em dashes. Everything in `[square brackets]` is for you to fill in
or delete: especially the personal parts. Readers can tell when a "why I
built this" story is generic, so write those lines yourself.

Facts used below, so they can be checked before posting:

- Speed test (website, "Speed test" section): `debian-13.7.0-amd64-netinst.iso`,
  one connection 182.9 s at 4.14 MB/s, Apex 134.1 s at 5.64 MB/s (32 ranges,
  80 after re-splits), about 36% faster. On a fast server that already fills
  the line, Apex was slightly slower (7.0 vs 7.5 MB/s). Quote both.
- Installer 4 MB, app is a single ~13 MB native executable (Tauri + Rust, no
  Electron). Windows 10/11 x64 only.
- GPL-3.0-or-later, one maintainer, first release July 2026.

## Timing and etiquette

- **One place at a time.** Post Show HN first, on a weekday morning US
  Eastern time, and stay around for the next few hours to answer every
  comment. Space the Reddit posts over the following week or two; don't post
  the same text everywhere on one day.
- **Say you're the developer** in every post.
- **Never ask anyone to upvote**, on HN or Reddit. HN's rules forbid it and it
  gets posts killed.
- **Before each Reddit post, read that subreddit's rules in its sidebar.**
  Look for: whether self-promotion is allowed at all, a required flair, a
  weekly self-promotion thread (post there instead if it exists), and
  day-of-week limits. I couldn't read them from here; Reddit blocks it.
- **Answer criticism with facts, not defence.** "Unsigned", "why not
  aria2", "why not Linux" and "is it safe" will come up; short answers are
  at the end of this file.

---

## Show HN

**Title** (HN allows 80 characters)

    Show HN: Apex, an open-source download manager for Windows written in Rust

**URL:** `https://github.com/ThembaTman0/apex-download-manager`

**First comment** (post it yourself right after submitting)

    Hi HN, I built Apex, a download manager for Windows. [One or two sentences, in your own words, on why: what annoyed you about the existing options, and what you wanted instead.]

    Some technical details that might be interesting:

    - Each download is split into up to 32 byte ranges, all written into one preallocated file. When a connection finishes, the largest remaining range gives away its second half to it, so a download doesn't crawl through its last few percent on one slow connection. The range end is an atomic that the worker re-reads every chunk, so a split needs no locking on the hot path.
    - Resume uses ETag / If-Range, so if the file on the server changed while you were paused, Apex starts over instead of stitching two versions together.
    - The browser extension requests no access to page content. It cancels the browser's download before any Save As dialog, hands the URL (plus cookies and referer, for downloads behind a sign-in) to a token-gated server on 127.0.0.1, and restarts the download in the browser if Apex isn't running or refuses it. So a download is never lost.
    - Finished files get the Windows Mark of the Web, so SmartScreen and Defender treat them like browser downloads.
    - It's Tauri v2 with a React UI; the app is a single native binary, 4 MB to download.

    On speed: on a Debian ISO over my connection, one connection took 183 s and Apex took 134 s. On a fast server that already fills the line it made no difference (slightly slower, in fact), and the site shows that result too. Splitting helps when the server limits each connection, which many do.

    No accounts, no telemetry. It's GPL-3.0 and Windows-only for now (there's an issue to gauge Linux interest).

    I'd especially like feedback on the segment re-splitting and on the extension's handoff. Happy to answer anything.

---

## r/software

Check first: self-promotion rules, required flair.

**Title**

    I made a free, open-source download manager for Windows (no ads, no account, no telemetry)

**Body**

    Hi all, I'm the developer. Apex is a download manager for Windows 10 and 11: it splits downloads across parallel connections, pauses and resumes across restarts and network drops, and has extensions for Chrome, Edge and Firefox that hand downloads over from the browser.

    What might set it apart:

    - It's a native app (Rust + Tauri), 4 MB to download, not Electron.
    - The browser extension can't read your pages. If Apex isn't running, the download simply continues in the browser.
    - Finished files keep the Windows Mark of the Web, so Defender still scans them like a normal download.
    - Queue, speed limits, a bandwidth scheduler, proxy support, SHA-256 checks, and a video grabber based on yt-dlp.

    It's free and open source (GPL-3.0). No ads, nothing bundled in the installer.

    Screenshots and download: https://github.com/ThembaTman0/apex-download-manager

    It's a one-person project, so bug reports and blunt feedback are very welcome.

---

## r/opensource

Check first: whether "I made this" posts are allowed, and any required
format.

**Title**

    Apex: a GPL-3.0 download manager for Windows, with a Rust engine and a browser extension that can't read your pages

**Body**

    I'm the developer. I recently open-sourced Apex, a Windows download manager, under GPL-3.0-or-later.

    - Engine: Rust. Downloads are split into byte ranges written into one preallocated file, and ranges re-split dynamically when a connection finishes early.
    - App: Tauri v2 with a React + TypeScript UI. The UI also runs in a plain browser against a mock backend, so frontend contributions don't need a Rust toolchain.
    - Browser extension: plain JavaScript, no build step, for Chrome, Edge and Firefox. It asks for no access to page content.
    - Local-only by design: no accounts, no telemetry. The capture server listens on 127.0.0.1 only and needs a pairing token.

    Repo: https://github.com/ThembaTman0/apex-download-manager
    CONTRIBUTING.md covers setup and the checks a PR needs. Linux support is the obvious open question; issue #1 is tracking interest.

---

## r/DataHoarder

Check first: this sub is strict about self-promotion. If there is a
weekly/self-promo thread, use it. Lead with reliability, not speed.

**Title**

    Open-source download manager for Windows focused on resumes that don't corrupt files

**Body**

    I'm the developer of Apex, a free, open-source Windows download manager. Posting here because the part I care most about is reliability on big files:

    - Per-connection progress is saved to a local database, so a pause survives closing the app or rebooting.
    - Resumes are validated with ETag / If-Range. If the file changed on the server, it starts over rather than splicing old and new data.
    - You can check the finished file against a publisher's SHA-256 inside the app.
    - When a download link expires while paused (common on file hosts), you can paste a fresh link and it continues from what is already on disk; if the new link serves a different file, it starts over.
    - Queue with a concurrency limit and reorderable positions, speed limits, and an off-peak scheduler.

    Windows only for now. GPL-3.0, no telemetry. https://github.com/ThembaTman0/apex-download-manager

    What would you need from a download manager that this is missing?

---

## r/rust

Check first: showcase posts may belong in the weekly "What's everyone
working on" thread. Make it about the engineering, not the product.

**Title**

    Dynamic segment re-splitting in a Rust download engine (Tauri app, GPL-3.0)

**Body**

    I've been building Apex, a Windows download manager with a Rust engine, and wanted to share one design detail.

    Each download starts with up to 32 byte ranges written into one preallocated file. When a worker finishes its range, the largest remaining range donates its second half to it. To make that safe without locking the hot path, each segment's end offset is an atomic that the worker re-reads every chunk; the splitter only ever shrinks it. Splits stop when the remainder would be under 2 x 256 KB, and the table is capped at 128 ranges. In a test on a Debian ISO, 32 starting ranges became 80 by the end.

    Other bits: reqwest with rustls, SQLite (rusqlite, WAL) for per-segment progress so resumes survive restarts, and a small hand-written HTTP/1.1 server on 127.0.0.1 for the browser extension.

    Code: https://github.com/ThembaTman0/apex-download-manager (engine is in desktop-ui/src-tauri/src/engine.rs). Feedback on the approach welcome.

---

## r/windows (or r/Windows11)

Check first: these often don't allow self-promotion at all. If they don't,
skip them rather than risk a ban.

**Title**

    Free, open-source download manager for Windows 10/11 that keeps SmartScreen protection intact

**Body**

    Use the r/software body, adding one line near the top about Windows
    integration: taskbar progress, start-with-Windows (off by default), tray,
    and Mark of the Web on finished files.

---

## YouTube pitch

For small channels that review free Windows apps. Keep it short; they get a
lot of these.

**Subject**

    Free, open-source download manager for Windows (possible video idea)

**Body**

    Hi [name],

    I enjoyed your video on [a specific video of theirs]. I'm the developer of Apex, a free, open-source download manager for Windows. It speeds up downloads using parallel connections, resumes after restarts, and takes over downloads from Chrome, Edge and Firefox, with no ads, account or telemetry.

    If it fits your channel, it might work as a free alternative in a download-manager comparison. Download: https://apexdownloadmanager.com/ and screenshots: https://github.com/ThembaTman0/apex-download-manager

    Happy to answer questions. No need to reply if it's not a fit.

    Thanks,
    [your name]

---

## Answers for the comments

- **"It's unsigned / SmartScreen warns me."** Before signing: "Yes, it's not
  signed yet. I've applied to the SignPath Foundation's free signing for open
  source. Every installer's SHA-256 is on the website, and the source is on
  GitHub." After signing, this goes away.
- **"Why not aria2 / wget / curl?"** "They're great, and the engine does the
  same kind of parallel range download. Apex adds the browser handoff,
  resume across restarts, the queue and a UI."
- **"Why not IDM?"** Don't bash it. "IDM is excellent; Apex is a free and
  open-source option."
- **"Linux?"** "Not yet. Issue #1 tracks interest; a thumbs-up there helps
  decide."
- **"Is it safe? It's a download manager with a browser extension."** "The
  extension can't read pages, the local server only accepts requests with a
  pairing token on 127.0.0.1, and the code is open. Security reports go
  through GitHub's private reporting (SECURITY.md)."
- **"Faster? That's placebo."** Point to the speed test, including the case
  where it didn't help.
