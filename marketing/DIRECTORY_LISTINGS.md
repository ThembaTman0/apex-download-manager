# Directory listings

Paste-ready copy for software directories. No em dashes anywhere (house
style). Keep the facts in step with the app: when a feature changes, update
it here before the next submission.

## AlternativeTo

**Status:** live since 2026-09-23, one day after submission.

    https://alternativeto.net/software/apex-download-manager/about/

**Three corrections the live listing still needs** (Contribute > edit; edits
are reviewed before they show):

1. **Official Website** still reads `apex-download-manager.vercel.app/`,
   because it was submitted the day before the domain moved. The 308 redirect
   makes it work, but that string is what the page displays. Change it to
   `https://apexdownloadmanager.com`.
2. **"Written in" says TypeScript.** The download engine is Rust; TypeScript is
   the UI layer only. It is a filterable field, and Rust is what separates Apex
   from JDownloader (Java) and the Electron entries, so this is the single most
   valuable field on the page to get right.
3. **OpenSanctions.org is listed as software Apex is an alternative to**, which
   looks like a misclick during the 52-alternative pass. Irrelevant links are
   what moderators strip, so remove it.

The rest of the page came through intact: Free, Open Source (GPL-3.0), the
Windows and four-browser platform list, and the Privacy focused, No Tracking,
Ad-free and No registration required flags.

**Alternatives are the traffic.** Almost nobody browses AlternativeTo
directly; they arrive looking for a replacement for something they already
use. 52 alternatives are linked, which is why the listing already surfaces
next to JDownloader, AB Download Manager and DownThemAll.

Submit at <https://alternativeto.net>: sign in, verify your email, then the
user icon (top right) > **Suggest new application**. Free submissions wait in
a backlog for months; an optional one-time $5 "priority" fee gets a review in
1-2 business days (it buys a review, not approval).

The fields below follow the form's order as it was in September 2026.

### Main info

**App Name**

    Apex Download Manager

**Import data from external source:** skip; it can overwrite the text below.

**Website**

    https://apexdownloadmanager.com/

**Short Description** (one or two sentences)

    A fast, open-source download manager for Windows. It splits downloads across many parallel connections, resumes after restarts, and takes over downloads from Chrome, Edge and Firefox.

**Full Description** (no links; the FAQ discourages them)

    Apex Download Manager speeds up downloads by splitting each file across up to 32 parallel connections. When one connection finishes early it takes over part of a slower one, so a download does not stall on its last few megabytes. Downloads pause and resume across restarts and network drops, and resumes are checked against the server so a changed file is not silently stitched together.

    A browser extension for Chrome, Edge and Firefox hands downloads over to Apex, including ones behind a sign-in, and gives them back to the browser if Apex is not running. The extension cannot read the pages you visit.

    Also included: a download queue with a concurrency limit, global and per-download speed limits, an off-peak bandwidth scheduler, proxy support, a clipboard watcher, SHA-256 checksum verification, and a video grabber built on yt-dlp. Finished files keep the Windows Mark of the Web, so SmartScreen and Defender still scan them.

    No account, no ads, no telemetry. Free and open source under the GPL v3.

**Supported Languages:** English

**Pricing:** Free. **Source code:** Open source. **License:** GNU General
Public License v3.0 (GPL-3.0).

**Source URL**

    https://github.com/ThembaTman0/apex-download-manager

### Tags

    download-manager, download-accelerator, open-source, windows, ad-free,
    night-mode, no-tracking, lightweight, no-registration, privacy-focused

These place it in **File Sharing**.

### Features

The form shows a fixed checklist for the app type, not free-form tags.

- Tick: No registration required, No Tracking, Privacy focused, Lightweight,
  Ad-free, Dark Mode.
- Leave unticked: MP3 Downloader (the grabber's audio-only option saves M4A),
  SoundCloud Downloader, Portable (only the Scoop build runs portably),
  Support for 4K (means playback/rendering), Command line interface, Works
  Offline, Extensible by Plugins/Extensions (Apex has an extension; it doesn't
  take plugins).

### Platforms

- **Windows.** Add Google Chrome, Microsoft Edge, Mozilla Firefox and Brave
  too if the box offers them (the extension runs there).
- **Platform Links:** leave Microsoft Store empty. Store links, if the
  browser platforms add fields for them:

| Platform | URL |
|---|---|
| Chrome / Brave | https://chromewebstore.google.com/detail/apex-download-manager/gopdilekdjnfekbmhedjidlmaahnnhco |
| Edge | https://microsoftedge.microsoft.com/addons/detail/apex-download-manager/bjpggfmgbhafacbcmhpncjaapdknohjg |
| Firefox | https://addons.mozilla.org/en-US/firefox/addon/apex-download-manager/ |

- **Windows Note**

      Windows 10 and 11, 64-bit only.

### Author / Social Media

- **Company / Author:** Themba Ngobeni. **Country of origin:** South Africa.
- **Company / Author Website URL:** `https://github.com/ThembaTman0` (the
  app's own site goes in Website above).
- **Social media:** none. The form wants profiles the app itself has.

### Icon & Screenshots

Upload by URL (each screenshot must be under 3 MB; these are ~150 KB).

- Icon (512 x 512, transparent background):
  `https://raw.githubusercontent.com/ThembaTman0/apex-download-manager/main/desktop-ui/src-tauri/icons/icon.png`
- Screenshots, in this order:
  1. `https://raw.githubusercontent.com/ThembaTman0/apex-download-manager/main/docs/screenshots/downloads.png`
  2. `https://raw.githubusercontent.com/ThembaTman0/apex-download-manager/main/docs/screenshots/dashboard.png`
  3. `https://raw.githubusercontent.com/ThembaTman0/apex-download-manager/main/marketing/store-screenshots/edge-capture-prompt-1280x800.png`
- Videos: none.

### Meta

**Note about your changes.** The form has no "alternative to" field, so the
apps Apex replaces are named here:

    Submitted by the developer. Apex is a free, open-source alternative to Internet Download Manager, Free Download Manager, AB Download Manager, Xtreme Download Manager, JDownloader, Motrix and Gopeed. The browser extension is published on the Chrome Web Store, Edge Add-ons and Firefox Add-ons (links under Platforms).

### After it is approved

1. **Link the alternatives.** On the Apex page, use "suggest alternative" to
   connect it to: Internet Download Manager, Free Download Manager, AB
   Download Manager, Xtreme Download Manager, JDownloader, Motrix, Gopeed.
   This is what puts Apex on their pages.
2. **Add the listing URL** to the README and website.
3. **Don't ask anyone to like it.** Likes decide the ranking, but
   AlternativeTo penalises coordinated upvoting. Let users who find it useful
   like it on their own.
4. Name and website can't be changed afterwards without an admin.

### Badge

AlternativeTo offers an embeddable badge at
<https://alternativeto.net/badges/?app=apex-download-manager>. Their snippet
hotlinks the SVG from their servers, which would hand every homepage visitor's
IP to a third party. That contradicts `public/privacy.html`, which lists
exactly what the site sends outward, and it is the same reason the fonts are
self-hosted rather than pulled from Google.

Their badge page explicitly allows self-hosting, so the compact dark SVG is
saved at `website/public/alternativeto-badge.svg` and served from our own
origin. The file was checked before committing: no `<script>`, no `<image>`,
no external references, only the SVG namespace declaration. The link still
points at the listing with their utm parameters intact, so they keep the
referral attribution.

Re-download it if they redesign the badge:

    curl -o website/public/alternativeto-badge.svg https://alternativeto.net/static/badges/badge-compact-dark.svg

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
| Developer site | `https://apexdownloadmanager.com/` |
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
| Download link 2 | `https://apexdownloadmanager.com/dl` (always the latest installer) |
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

    Homepage: https://apexdownloadmanager.com/
    Direct download (latest x64 installer): https://apexdownloadmanager.com/dl
    Source code: https://github.com/ThembaTman0/apex-download-manager
    Screenshots: https://github.com/ThembaTman0/apex-download-manager#readme

    The installer is not code-signed yet (I have applied to the SignPath Foundation for open-source signing), so SmartScreen may show an "unrecognized app" prompt. The SHA-256 of every installer is published on the homepage.

    Thanks for your time,
    ThembaTman0

## OpenAlternative

<https://openalternative.co/submit>. **One blocker left.** The frame fits, and
of the two rules that ruled Apex out when the guidelines were read on
2026-09-22, one is now cleared:

1. **"Must be a public, actively maintained repository with at least 10
   stars."** The repo has 0. Still blocking.
2. **"Custom Domain. No temporary subdomains (vercel.app, netlify.app,
   etc.)."** Cleared: the site serves from `apexdownloadmanager.com`.

The other four rules pass: public GitHub repo, a real desktop application
(not a CLI or library), available now, and a clear alternative to proprietary
software.

So this listing waits on 10 stars. Stars come from the launch posts; do not ask
anyone for stars, since that is exactly what these directories penalise.

When both are true, the submission itself is short. Sign in first, which also
gives a dashboard for the listing. A free submission waits in a review queue;
a paid upgrade skips it and publishes within 24 hours. Fields seen on the
form: name, website, repository URL, "which well-known tool is this an
alternative to", and optional discount code fields to leave empty.

| Field | Value |
|---|---|
| Name | `Apex Download Manager` |
| Website | `https://apexdownloadmanager.com` |
| Repository | `https://github.com/ThembaTman0/apex-download-manager` |
| Alternative to | Internet Download Manager |
| Discount code | leave empty |

**Description**

    Apex Download Manager splits each file across up to 32 parallel connections, so a download uses the whole connection instead of one stream. When one connection finishes early it takes over part of a slower one, so transfers do not stall at the end. Downloads resume from the exact byte after restarts and network drops, and resumes are checked against the server so a changed file is never stitched together. A browser extension for Chrome, Edge, Brave and Firefox hands downloads over and gives them back if Apex is not running. No account, no ads, no telemetry, and the source is GPL v3.

### Custom domain

**Done 2026-09-22.** `apexdownloadmanager.com` is registered through Vercel
and serves the site. Candidates checked with RDAP beforehand: `apexdm.app`
(already the Firefox add-on's id suffix) and `apexdownload.app` were also free;
`getapex.app` was taken. The exact-match `.com` won because it is what people
type and search.

A domain is worth more than this one listing: it is also the trust signal on
an unsigned installer, the address other directories and store listings show,
and it means the site can move off Vercel later without losing links.

How it is set up in the Vercel project's Domains tab:

| Domain | Behaviour |
|---|---|
| `apexdownloadmanager.com` | serves Production |
| `www.apexdownloadmanager.com` | 308 permanent redirect to the bare domain |
| `apex-download-manager.vercel.app` | 308 permanent redirect to the bare domain |

The bare domain is primary rather than `www` because the name is already long,
and it is repeated in every store listing and launch post. The redirects are
308 (permanent) so search engines consolidate onto one address instead of
indexing three copies of the same page.

The code side is done: `website/index.html` (canonical, og:url, og:image,
twitter:image and the JSON-LD urls), `public/robots.txt`, `public/sitemap.xml`,
the README, the Scoop, winget and Chocolatey manifests, the extension store
copy and this file all point at the new domain.

**Still to do by hand, outside this repo:** the website field in the Chrome,
Edge and Firefox store listings, the AlternativeTo submission, the GitHub
About box, and the live winget manifest (komac generates the next version from
the copy in winget-pkgs, not from `winget/` here, so its PublisherUrl and
PackageUrl carry the old domain until that PR lands).

## GitHub discoverability

The repo is now public, so GitHub search and topic pages are a free channel.
None of this needs anyone's approval:

- **Topics.** Without them the repo does not appear on topic pages:

      gh repo edit ThembaTman0/apex-download-manager --add-topic download-manager,download-accelerator,windows,rust,tauri,react,open-source,no-telemetry,idm-alternative

- **About box.** Set the website field to the site, so every visitor to the
  repo can reach the landing page.
- **README.** Link the site, the three extension listings, and the speed-test
  section. People who arrive from a listicle check the README before the site.

## Closed or risky channels, so nobody wastes time

- **awesome-tauri**: its contributing guidelines now say, in bold,
  "Application submissions are not accepted anymore". Do not open a PR.
- **Wikipedia, "Comparison of download managers"**: a real referral source,
  but adding your own software is a conflict of interest under their rules and
  gets reverted. It needs independent coverage first, added by someone else.
- **Softonic, Uptodown and similar**: they wrap installers in their own
  downloaders, which contradicts the no-bundled-extras promise. Skip them.

## Already shipped, and worth counting as distribution

winget (`ThembaTman0.ApexDownloadManager`), Scoop (own bucket) and Chocolatey
all resolve by search inside their own ecosystems, and the three extension
stores each carry a listing that links back to the site. These are live
channels, not pending work.
