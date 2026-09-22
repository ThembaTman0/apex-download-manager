# Directory listings

Paste-ready copy for software directories. No em dashes anywhere (house
style). Keep the facts in step with the app: when a feature changes, update
it here before the next submission.

## AlternativeTo

Submit at <https://alternativeto.net> (sign in, then "Add application").
Listing it as an alternative to the apps below is what puts Apex on their
pages, so that list matters most.

**Name**

    Apex Download Manager

**Website**

    https://apex-download-manager.vercel.app/

**Short description** (one or two sentences)

    A fast, open-source download manager for Windows. It splits downloads across many parallel connections, resumes after restarts, and takes over downloads from Chrome, Edge and Firefox.

**Description**

    Apex Download Manager speeds up downloads by splitting each file across up to 32 parallel connections. When one connection finishes early it takes over part of a slower one, so a download does not stall on its last few megabytes. Downloads pause and resume across restarts and network drops, and resumes are checked against the server so a changed file is not silently stitched together.

    A browser extension for Chrome, Edge and Firefox hands downloads over to Apex, including ones behind a sign-in, and gives them back to the browser if Apex is not running. The extension cannot read the pages you visit.

    Also included: a download queue with a concurrency limit, global and per-download speed limits, an off-peak bandwidth scheduler, proxy support, a clipboard watcher, SHA-256 checksum verification, and a video grabber built on yt-dlp. Finished files keep the Windows Mark of the Web, so SmartScreen and Defender still scan them.

    No account, no ads, no telemetry. Free and open source under the GPL v3.

**License / pricing:** Free, Open Source (GPL-3.0)

**Platforms:** Windows, Google Chrome, Microsoft Edge, Mozilla Firefox,
Brave (the Chrome Web Store listing installs in Brave)

**Categories:** File Sharing (Download Managers). Add Video & Movies only if
the form asks for a second category.

**Alternative to** (add each one)

- Internet Download Manager
- Free Download Manager
- AB Download Manager
- Xtreme Download Manager
- JDownloader
- Motrix
- Gopeed

**Features** (pick the existing tag when the form suggests one; these match
tags already used on similar apps)

- Ad-free
- No Tracking
- No registration required
- Resume interrupted downloads
- Download Scheduling
- Proxy support
- Video Download
- Dark Mode
- Browser integration
- Download accelerator
- Bandwidth limiting
- Lightweight

Do not claim: Portable, Works Offline, Multiple languages, Mac/Linux. Apex has
none of these yet.

**Links**

| Label | URL |
|---|---|
| Source code | https://github.com/ThembaTman0/apex-download-manager |
| Chrome Web Store | https://chromewebstore.google.com/detail/apex-download-manager/gopdilekdjnfekbmhedjidlmaahnnhco |
| Edge Add-ons | https://microsoftedge.microsoft.com/addons/detail/apex-download-manager/bjpggfmgbhafacbcmhpncjaapdknohjg |
| Firefox Add-ons | https://addons.mozilla.org/en-US/firefox/addon/apex-download-manager/ |

**Images**

- Icon: `desktop-ui/src-tauri/icons/icon.png` (512 x 512)
- Screenshots, in this order:
  1. `docs/screenshots/downloads.png` (downloads list with parallel segments)
  2. `docs/screenshots/dashboard.png` (live speed chart)
  3. `marketing/store-screenshots/edge-capture-prompt-1280x800.png` (browser capture prompt)

**After it is live:** like it from your own account, and ask early users who
are happy with Apex to like it too. Likes decide where it ranks on the
Internet Download Manager alternatives page.

## Softpedia

Submit at <https://www.softpedia.com/user/submit.shtml>, "Windows Software",
then the **Regular submission form** (not the PAD form). No account needed.
Softpedia says the queue takes up to 30 days and not every submission is
published. Softpedia commonly marks listings it has scanned as "100% Clean";
if Apex gets that badge, it is worth linking from the website.

Submit after a release is out, and use that release's number and notes
below. The values here are for **1.0.9**; swap them when 1.0.10 ships.

| Field | Value |
|---|---|
| Developer name | `ThembaTman0` |
| Developer site | `https://apex-download-manager.vercel.app/` |
| Developer email | your email |
| Program name | `Apex Download Manager` |
| Program version | `1.0.9` |
| Category | Internet > **Download Managers** |
| File size | `4` MB |
| Price for 1 license | leave empty (it is free) |
| Supported operating systems | tick **Windows 10 64 bit** and **Windows 11** only (the installer is x64) |
| License | **GPLv3** |
| 32x32 Icon URL | `https://raw.githubusercontent.com/ThembaTman0/apex-download-manager/main/desktop-ui/src-tauri/icons/32x32.png` |
| Screenshot URL | `https://raw.githubusercontent.com/ThembaTman0/apex-download-manager/main/docs/screenshots/downloads.png` |
| Download link 1 | `https://github.com/ThembaTman0/apex-download-manager-releases/releases/download/v1.0.9/Apex.Download.Manager_1.0.9_x64-setup.exe` |
| Download link 2 | `https://apex-download-manager.vercel.app/dl` (always the latest installer) |
| Limitations | leave empty |
| Product IDs, buy link, unlock code | leave empty |

**Short description** (128 characters max; this is 119)

    Open-source Windows download manager: parallel connections, resumable downloads, capture from Chrome, Edge and Firefox.

**Long description**: use the AlternativeTo description above, unchanged.

**Special requirements**

    Windows 10 or 11, 64-bit. Uses the Microsoft Edge WebView2 Runtime, which Windows 11 and current Windows 10 already include; the installer downloads it if it is missing. The optional browser extension is free on the Chrome Web Store, Edge Add-ons and Firefox Add-ons.

**Changes**: paste the release notes of the version you submit, from
`RELEASE_NOTES.md` or the release page. For 1.0.9 that is the v1.0.9
release body on the releases repo.

## MajorGeeks

MajorGeeks has no form: submissions go by email to **mgnews at
majorgeeks.com** (their contact page spells it out that way). Their editors
Google the software and its developer, scan the installer with VirusTotal,
then test it in a virtual machine and write their own description, so the
email only needs to point them at the right things. Before sending, check
the installer's result on VirusTotal yourself so there are no surprises
(search the SHA-256 from the website's download section).

**Subject**

    Software submission: Apex Download Manager (free, open source)

**Body**

    Hi,

    I'd like to submit Apex Download Manager for review. It is a free, open-source (GPL v3) download manager for Windows 10 and 11.

    It splits each download across up to 32 parallel connections, resumes downloads after restarts and network drops, and has a browser extension for Chrome, Edge and Firefox that hands downloads over to the app. There are no ads, no bundled software, no account and no telemetry.

    Homepage: https://apex-download-manager.vercel.app/
    Direct download (latest x64 installer): https://apex-download-manager.vercel.app/dl
    Source code: https://github.com/ThembaTman0/apex-download-manager
    Screenshots: https://github.com/ThembaTman0/apex-download-manager#readme

    The installer is not code-signed yet (I have applied to the SignPath Foundation for open-source signing), so SmartScreen may show an "unrecognized app" prompt. The SHA-256 of every installer is published on the homepage.

    Thanks for your time,
    ThembaTman0
