# Store submission kit

Everything needed to publish the extension. Upload file: the repo-root
`browser-extension.zip` (manifest at zip root, rebuilt 2026-07-17; rebuild
after any extension change with manifest at the zip root, not nested).

`web-ext lint`: 0 errors, 10 warnings (all "unsupported API" notices for
Chromium-only APIs the code feature-detects; safe to ignore).

---

## Listing copy (both stores)

**Name:** Apex Download Manager

**Summary (AMO limit 250 chars):**
Sends downloads to the Apex Download Manager desktop app: multi-connection
speed, pause/resume that survives restarts, scheduling, and checksum
verification. Falls back to the normal browser download whenever Apex
isn't running, so nothing is ever lost.

**Description:**
Apex Download Manager is a free, native Windows download manager. This
extension hands your browser's downloads to the Apex app, which splits each
file across up to 32 connections, resumes interrupted transfers from the
exact byte they stopped at, and can verify checksums before you run what
you downloaded.

- Automatic capture: click a download link, approve it in Apex, done
- Right-click any link or media: "Download with Apex"
- Cookie and referer handoff, so downloads behind logins just work
- Safe fallback: if Apex isn't running or declines, the download restarts
  in the browser. Nothing is ever lost
- No tracking. The extension reads no page content and talks only to the
  Apex app on your own machine (127.0.0.1)

Requires the free Apex Download Manager app for Windows:
https://apex-download-manager.vercel.app

**Category:** AMO: "Download Management" · CWS: "Workflow & Planning" (or
"Tools")

**Homepage / Support URL:** https://apex-download-manager.vercel.app

---

## Privacy policy (both stores require one; paste as text or host on the site)

Apex Download Manager (the extension) does not collect, store, or transmit
any data to the developer or any third party. It has no analytics and makes
no network requests except to the Apex Download Manager application running
on the user's own computer (127.0.0.1). When the user downloads a file, the
extension forwards that file's URL to the local Apex app, along with the
cookies and referring page for that URL so that downloads behind logins
work. The app uses them solely to perform the download the user requested.
Nothing leaves the user's machine.

---

## Permission justifications (AMO "notes to reviewer" / CWS per-permission)

- `downloads` / `downloads.ui`: detect new browser downloads so they can be
  handed to the local Apex app; cancel the browser's copy after handoff.
  `downloads.ui` hides the download shelf during capture on Chromium.
- `cookies`: forwarded only for the specific URL being downloaded, only to
  the local app, so files behind logins download correctly. Never read for
  any other purpose.
- `contextMenus`: the "Download with Apex" right-click items.
- `storage`: the user's settings (enabled flag, port, pairing token).
- `notifications`: tell the user when Apex is unreachable and a download
  was handed back to the browser.
- `<all_urls>` (host permission): required for `cookies.getAll` on
  arbitrary download URLs and for the context menu to work on any site.
  The extension has no content scripts and reads no page content.

Note for the AMO reviewer: the extension only communicates with a
localhost HTTP endpoint (`http://127.0.0.1:<port>`) exposed by the Apex
desktop app, gated by a pairing token the user approves in the app. Source
is unminified plain JavaScript; no build step.

---

## Screenshots to take (1280×800 or 640×400; AMO wants ≥1, CWS wants ≥1)

1. Extension popup, paired state (green dot): light on detail, crop tight.
2. Apex capture prompt appearing over a browser after clicking a download.
3. The Apex main window mid-download (multi-segment view).

`?static` on the website and the app's demo mode (`npm run dev`) help make
clean shots.

---

## Submission steps

**AMO (free):** addons.mozilla.org → Developer Hub → sign in with a
Firefox account → "Submit a New Add-on" → On this site (listed) → upload
`browser-extension.zip` → the validator runs (expect the 10 warnings) →
fill listing fields from this file → submit. Review typically takes a few
days; the manifest already carries the required
`browser_specific_settings.gecko.id` (`apex-download-manager@apexdm.app`).
Once approved, Mozilla signs it: permanent installs, and updates ship by
uploading a new version (bump `manifest.json` `version` first).

**Chrome Web Store ($5 one-time):** chrome.google.com/webstore/devconsole →
pay the registration fee → New item → upload the same zip → fill listing +
per-permission justifications (above) → submit. Covers Chrome, Edge, and
Brave users (Edge also has its own free store; same zip, later).
