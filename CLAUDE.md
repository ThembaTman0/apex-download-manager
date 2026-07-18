# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Apex Download Manager — a Windows download manager. Three deliverables in one repo:

- `desktop-ui/` — the app: Tauri v2 shell, React 19 + TypeScript + Tailwind v4 frontend, native Rust download engine (`src-tauri/`). No Electron/JVM.
- `browser-extension/` — Chrome MV3 + Firefox capture extension. Plain JS, **no build step** (load unpacked from the folder).
- `website/` — Vite + React landing page with serverless `/dl` + `/stats` endpoints.

## Commands

All desktop work happens in `desktop-ui/`:

```powershell
cd desktop-ui
npm install
npm run tauri dev      # full app (Rust backend + UI, hot reload)
npm run dev            # UI only in a browser — demo/tauriMock.ts fakes the backend
npm run build          # tsc typecheck + vite build (frontend only)
npm run tauri build    # MSI/NSIS installers
cd src-tauri; cargo check   # fast Rust-only verification
```

There is no test suite or linter; `tsc` (via `npm run build`) and `cargo check` are the verification steps. Vite is pinned to port 1420 (`strictPort`). Rust builds require VS Build Tools (C++ workload + Windows SDK).

Website (`website/`): `npm run dev` / `npm run build`. Deploys via the Vercel git integration (dashboard project with Root Directory = `website`) — there is no CLI deploy script. `?static` URL param disables entrance animations and the live demo — used for screenshots/QA.

**Releases:** pushing a `v*` tag runs `.github/workflows/release.yml`, which builds installers + updater artifacts and publishes them to the separate **public** repo `ThembaTman0/apex-download-manager-releases` (this source repo is private; the in-app updater and the website's `/dl` redirect both fetch from there anonymously). Requires `RELEASES_TOKEN` and `TAURI_SIGNING_PRIVATE_KEY` secrets (the signing key has no password; there is no password secret). Keep versions in sync across `tauri.conf.json` and `src-tauri/Cargo.toml` when bumping. **Before pushing a release tag, pre-create the release (same tag) in the public releases repo via the API** — tauri-action's cross-repo release creation 422s because the source-repo SHA doesn't exist there; with the release pre-created it just uploads assets.

## Desktop app architecture

### Rust backend (`desktop-ui/src-tauri/src/`)

- `engine.rs` — the heart. `DownloadManager` (managed Tauri state) probes each URL with a ranged request, plans segments (up to 32), and writes all connections into one preallocated `.adm` temp file, renamed on completion. Segments re-split dynamically: when a connection finishes, the largest remaining range donates its second half (`SegCell.end` is atomic — workers re-read their boundary every chunk; splits stop under 2×256 KB remainders, table capped at 128). Also owns the queue/concurrency logic, speed limiting, resume validation (ETag/If-Range), pending-capture staging (dedup by URL-sans-query + filename, capped at 25), and creates the `capture` approval window dynamically.
- `capture.rs` — hand-rolled minimal HTTP/1.1 server on `127.0.0.1:43666` for the extension. Token-gated; only `cookie`/`referer`/`user-agent` headers are forwarded to the engine.
- `db.rs` — SQLite (WAL, bundled rusqlite) under `%APPDATA%/com.apex.download-manager/`. Per-segment progress is persisted so pause/resume survives restarts.
- `commands.rs` — Tauri command handlers. **Every new command must also be registered in `lib.rs` `generate_handler![]` and wrapped in `src/services/backend.ts`.**
- `ytdlp.rs` — video grabber: yt-dlp/ffmpeg probe, download, and one-click tool install.
- `lib.rs` — setup: system tray (close hides to tray, quit via tray), 15s scheduler tick, clipboard watcher (emits `clipboard:url`), autostart, single-instance.

Backend → frontend communication is via Tauri events: `download:changed`, `download:removed`, `clipboard:url`.

### Frontend (`desktop-ui/src/`)

- **One bundle, two windows.** `main.tsx` switches on the Tauri window label: `main` renders `App`, `capture` renders `CapturePopup` (the always-on-top browser-capture approval prompt). The `capture` window is on the window-state plugin **denylist** in `lib.rs` — it sizes/shows itself per capture, and restoring saved state would resurrect it invisible and mis-sized. Keep it there.
- `services/backend.ts` — the only place `invoke()` is called; converts wire-format unix-millis dates to `Date`.
- `stores/downloadsStore.ts` — single zustand store (downloads, selection, settings, speed history, dialog open flags).
- `demo/tauriMock.ts` — imported first in `main.tsx`; installs a fake IPC layer with simulated transfer progress when `window.__TAURI_INTERNALS__` is absent, so the whole UI is exercisable under plain `npm run dev` (also used for website screenshots). New commands need mock coverage to keep this working.
- Pages: `Dashboard`, `Downloads`, `Settings`. UI primitives in `components/ui/` (Radix + CVA, shadcn-style).

## Browser extension

`bg.js` cancels the browser's download immediately (during `onDeterminingFilename`, before any Save As dialog), hands the URL + cookie/referer/UA to Apex's capture endpoint, and **restarts the download in the browser if Apex is unreachable or rejects it** — nothing is ever lost. Extra care in the startup path: Chromium auto-resumes interrupted downloads before Apex is running, so a sweep erases entries Apex already owns and restored downloads that can't reach Apex are dropped (with a notification) rather than re-prompted. Pairing: token copied from Apex Settings → pasted in the extension popup.

## Website

Static landing page plus two Vercel serverless functions in `api/`: `dl.js` (302 to the latest Windows installer asset on the public releases repo, with a warm-lambda cache and an optional anonymous total-downloads counter via Upstash/Vercel-KV REST env vars — no per-user data) and `stats.js`. `vercel.json` rewrites `/dl` → `/api/dl`. Hosting is Vercel by deliberate choice (Cloudflare Pages pieces were removed 2026-07-11); don't reintroduce wrangler/Pages Functions. The counter is total-only by privacy decision — no per-region or per-user tracking.

## Privacy constraints (product invariants)

- The desktop app is local-only: no accounts, no telemetry. The download counter is website-side and total-only.
- The extension requests zero website content permissions; the capture server must stay bound to 127.0.0.1 and token-gated.
- Completed files get Mark-of-the-Web so SmartScreen/Defender treat them like browser downloads.
