# Store submission notes (per version)

The listing copy, privacy policy, and permission justifications live in
`STORE_LISTING.md` and rarely change. This file covers the fields the
stores ask on **every new version upload**, with standing answers that
stay true release to release, plus the current version's text ready to
paste.

House style: no em dashes in anything a user or reviewer reads. Use a
colon, a semicolon, or a full stop instead.

---

## Part 1: AMO (Firefox) new-version fields

### Q1. "Release Notes" (public, shown on the add-on detail page)

What users see. Write for a user, not a reviewer: what is new, what is
fixed, and anything that needs a matching app version. Keep it to a
handful of bullets.

**v1.3.2 (paste this):**

```
New in 1.3.2

- Grab video from a page. The popup has a new "Grab video from this page"
  button, and right-clicking a page offers "Grab video on this page with
  Apex". Both hand the page address to the Apex app, which opens its video
  grabber already filled in. Nothing is downloaded until you choose a
  quality in the app. Requires Apex 1.0.8 or newer.
- Clearer pairing problems. If your pairing token is out of date, for
  example after regenerating it in Apex Settings, the extension now tells
  you to pair again instead of quietly handing the download back to the
  browser. The popup says the same thing rather than showing a misleading
  "Connected".
- Tidied wording in the popup.

As always, if Apex is not running the download simply continues in the
browser, so nothing is lost.
```

### Q2. "Notes to Reviewer" (private, reviewer only)

Reviewers want: what changed since the last reviewed version, why any new
permission is there, whether a build step is involved, and how to test
without an account. Lead with the changes, then the standing answers.

**v1.3.2 (paste this):**

```
What changed since 1.3.1

1. New "grab video from this page" hand-off. The popup button and a new
   page context-menu item read the current tab's address and POST it as
   JSON to the local Apex app at http://127.0.0.1:43666/grab, with the
   pairing token in an x-apex-token header. The app opens its video
   grabber dialog pre-filled with that address. No download starts from
   this action; the user still has to choose a quality inside the app.
   Nothing is read from the page itself.

2. New permission in this version: activeTab. It is used only for
   chrome.tabs.query({active: true, currentWindow: true}) in popup.js, to
   read the .url of the tab the user is looking at when they click the
   grab button. It is never used to inject scripts or read page content.
   The context-menu path does not use it at all; it uses the pageUrl the
   contextMenus event already provides.

3. Stale pairing token is now surfaced instead of swallowed. A 401 from
   the local app raises a "pair again" notification, throttled to at most
   one per five minutes, and the popup pings with the token so it can say
   the token is stale rather than showing a green "Connected" dot while
   captures are silently failing.

Standing notes

- No build step. The submitted zip is the source: plain, unminified
  JavaScript, no bundler, no transpiler, no minifier, no external
  libraries. Loading the unzipped folder as a temporary add-on gives a
  byte-identical extension. No source-code package should be required.
- No test account or credentials needed.
- The extension makes no network requests to any remote server. It talks
  only to http://127.0.0.1:<port>, the local Apex Download Manager desktop
  app on the user's own machine, and that endpoint is gated by a pairing
  token the user approves in a native prompt inside the app.
- No content scripts. No page content is ever read.
- No analytics, no telemetry, no data collection of any kind. The manifest
  declares data_collection_permissions: none.

How to test without installing the desktop app

The extension degrades safely, so the main paths are testable on their
own. With the Apex app absent, downloading a file shows the extension
hand the download straight back to the browser, so the file downloads
normally. The popup shows a red dot and "Apex isn't running". The grab
button reports that it could not reach Apex. Nothing hangs or is lost.

To test the full path, the free Windows app is at
https://apex-download-manager.vercel.app. Install it, open the extension
popup, click "Pair with Apex app", and approve the prompt that appears in
the app. After that, downloads are captured by the app and the grab
button opens the video grabber.
```

### Q3. "Source code submission" (asked during upload)

**Answer: No, source code is not required.** The add-on is plain,
unminified JavaScript with no build step, so the uploaded zip already is
the source. If the form insists on a statement, use the "No build step"
bullet from Q2.

### Q4. License

Keep whatever was chosen on the first submission so it does not change
between versions. (Open-source licensing of the wider project is still an
open decision; that decision does not need to move for a version upload.)

### Q5. "Data collection" / privacy disclosure

**Answer: none.** The manifest already declares
`browser_specific_settings.gecko.data_collection_permissions.required =
["none"]`. Privacy policy text is in `STORE_LISTING.md`, hosted at
https://apex-download-manager.vercel.app/privacy.html.

---

## Part 2: Edge Add-ons (Partner Center) new-version fields

Edge asks a similar but differently worded set. Upload
`browser-extension-chromium.zip`, not the Firefox zip.

**Edge has no public release-notes field.** Verified against Microsoft's
publishing docs 2026-07-27: the "Details for &lt;language&gt;" page carries
only Extension name, Description, logo, promotional tiles, screenshots,
YouTube URL, short description, and search terms. There is no per-version
"What's new" anywhere in the flow, and listings show users no version
history. The public release notes written for AMO therefore have nowhere
to go on Edge; per-version changes belong in **Notes for certification**,
which is what Microsoft's docs ask for.

| Page | Field | Answer |
| --- | --- | --- |
| Submit | "Notes for certification" | Per-version changes plus the standing notes. 2,000 char limit, see below. |
| Privacy | "Single Purpose Description" | See the single-purpose text below. |
| Privacy | "Permission justification" (one box per manifest permission) | See the per-permission answers below. |
| Privacy | "Are you using remote code?" | No. MV3 forbids it and the extension loads none. |
| Privacy | "Data usage" | Nothing is collected. Leave every checkbox unticked, then tick the certification disclosures. |
| Privacy | "Privacy Policy URL" | https://apex-download-manager.vercel.app/privacy.html |
| Properties | Category / Website / Support | Keep whatever the listing already has. |

Certification takes up to seven business days. Only one submission may be
in the pipeline at a time: if an earlier version is still in review, a new
one cannot be published until that clears or is cancelled.

### "Notes for certification" (2,000 character limit)

Edge caps this field at 2,000 characters, so the fuller AMO reviewer notes
in Q2 do not fit. Trim rather than truncate, and check the count before
pasting. Keep the permission explanation and the "no build step" and
"localhost only" claims; those are what a reviewer needs.

**Careful when a submission was cancelled:** the reviewer compares against
the last *published* version, not the last one you uploaded. If a version
was cancelled before review, its changes were never seen, so fold them
into these notes too.

**v1.3.2 as submitted 2026-07-27 (1,990 chars, supersedes a cancelled
1.3.1):**

```
Supersedes 1.3.1, which was cancelled before review, so this covers two versions of changes.

New in 1.3.2

1. "Grab video from this page". A popup button and a page context-menu item read the current tab's URL and POST it as JSON to the local Apex desktop app at http://127.0.0.1:43666/grab, with the pairing token in an x-apex-token header. The app opens its video grabber pre-filled. No download starts from this action; the user chooses a quality in the app. No page content is read.

2. New permission: activeTab. Used only by chrome.tabs.query({active: true, currentWindow: true}) in popup.js, to read tab.url when the user clicks that button. Never used for script injection or to read page content. The context-menu path instead uses the pageUrl the event already supplies.

3. Stale pairing tokens are now surfaced. A 401 from the local app raises a "pair again" notification, throttled to one per 5 minutes, and the popup reports a stale token instead of showing a green "Connected" dot while captures silently fail.

From 1.3.1 (never published)

4. When the browser restores several interrupted downloads at startup and Apex is not running, the extension shows one summary notification instead of one per download.

Standing notes

- No build step. The zip is the source: plain unminified JavaScript, no bundler, no libraries.
- No test account needed.
- No remote network requests. The only destination is http://127.0.0.1, the Apex desktop app on the user's own machine, gated by a pairing token the user approves in the app.
- No content scripts, no analytics, no data collection.

Testing without the app: with Apex absent, a download is handed back to the browser and completes normally, the popup shows a red dot and "Apex isn't running", and the grab button reports it could not reach Apex. Nothing is lost.

Full path: install the free Windows app from https://apex-download-manager.vercel.app, open the popup, click "Pair with Apex app", approve the prompt in the app.
```

### Per-permission justifications (Edge asks for one per permission)

Edge wants each answer framed as *why the extension cannot function
without it*, not just what it does. Paste these as-is.

**`activeTab`**

```
The extension's "Grab video from this page" feature needs the address of
the page the user is looking at. When the user clicks that button in the
extension popup, popup.js calls
chrome.tabs.query({active: true, currentWindow: true}) and reads tab.url,
then sends that single URL to the Apex Download Manager desktop app on the
user's own machine (http://127.0.0.1) so the app can open its video
grabber pre-filled with it. Without activeTab the popup cannot learn which
page to hand over and the feature cannot work.

Scope: activeTab is read-only here and is used solely at the moment of
that click. It is not used to inject scripts or read page content, and the
extension has no content scripts. No data leaves the user's machine.
```

**`downloads`**

```
This is the extension's core purpose. It listens for a download starting
in the browser so the URL can be handed to the Apex desktop app, and
cancels the browser's own copy once the app has accepted it. Without the
downloads permission the extension cannot detect or redirect downloads and
has no function at all.
```

**`downloads.ui`**

```
Hides the browser's download shelf during a capture. Because the browser's
copy of the download is cancelled immediately after hand-off, the shelf
would otherwise flash a cancelled entry for every download the user sends
to Apex.
```

**`cookies`**

```
Downloads behind a login fail without the session cookie. When the user
downloads a file, the extension reads the cookies for that specific URL
only and forwards them to the local Apex app so the app can fetch the file
as the logged-in user. Cookies are read for no other purpose, are never
sent anywhere except http://127.0.0.1 on the user's own machine, and are
not retained by the extension.
```

**`contextMenus`**

```
Provides the right-click items the extension is built around: "Download
with Apex" on links and media, and "Grab video on this page with Apex" on
a page. Without it these entry points cannot exist.
```

**`storage`**

```
Persists the user's own settings: whether capture is enabled, the local
port number, and the pairing token issued by the desktop app. Without it
the user would have to re-pair with the app on every browser restart.
```

**`notifications`**

```
Tells the user when something needs their attention and there is no other
surface to say it on: the Apex app could not be reached and the download
was handed back to the browser, or the pairing token has expired and they
need to pair again. Notifications are throttled and are only raised in
response to a real failure.
```

**`<all_urls>` (host permission)**

```
Required so that cookies.getAll works for whatever URL the user chooses to
download, since a download can originate from any site, and so the
right-click menu items work on any site. This is a capability the download
hand-off needs, not a data-collection surface: the extension registers no
content scripts, reads no page content, and makes no requests to any
remote server. Its only network destination is http://127.0.0.1, the Apex
desktop app on the user's own machine.
```

**"Single purpose" description (Edge and CWS both ask)**

```
Hands downloads from the browser to the Apex Download Manager desktop app
running on the same computer, so they can be downloaded with multiple
connections, paused and resumed, and scheduled.
```

---

## Part 2b: Chrome Web Store

Registration fee paid 2026-07-27. Upload **`browser-extension-chrome.zip`**,
which is the Edge package with the video-grab feature and the `activeTab`
permission removed. Do not upload the Edge zip; see the policy risk below.

### Policy risk: the video-grab feature

**Read this before submitting a build that contains the grab feature.**
Chrome Web Store policy does not allow extensions that facilitate the
unauthorized download of copyrighted or streaming media, and Google
enforces it against YouTube downloaders specifically. Google purged video
downloader extensions during 2025, and repeat offenders such as
SaveFrom.net have been removed more than once. Firefox and Edge have no
equivalent rule, which is why the same package is fine on both of those.

What makes the risk concrete in our package, regardless of intent:

- `bg.js` registers a context menu titled "Grab video on this page with
  Apex".
- `popup.html` has a "Grab video from this page" button.
- `popup.js` (and the desktop dialog) uses a YouTube watch URL as the
  placeholder.

The defence that the extension itself downloads nothing, and only hands a
page URL to a desktop app that the user drives, is real but untested.
Reviewers act on "facilitates", and the strings above make the intent
plain. A rejection on a brand new developer account is a poor opening
move, and repeat violations put the account itself at risk.

**Decision 2026-07-27: the Chrome build ships without the grab feature.**
Get the core download manager listed and established first, then decide
separately whether to test the boundary. Download managers as such are
permitted; it is the media-grabbing that draws enforcement.

`build-zips.ps1` implements this. The grab code is delimited in the
sources by `#grab-begin` / `#grab-end` markers and the Chrome flavor
strips those regions and drops `activeTab`, so it is a build-time variant
rather than a code fork. Keep the markers balanced when editing that code;
the script throws on an unbalanced pair and refuses to emit a zip.

The Chrome package therefore has no `activeTab` permission, no popup grab
button, and no page context-menu item. Its permission set is `downloads`,
`downloads.ui`, `cookies`, `contextMenus`, `storage`, `notifications`,
plus the `<all_urls>` host permission, so skip the `activeTab`
justification when filling the privacy practices tab.

### EEA trader / non-trader declaration (account level, asked once)

Required by the EU Digital Services Act. The test is whether the
publisher acts "for purposes relating to his trade, business, craft or
profession". Google states that each publisher must decide for
themselves and will not answer for a specific case.

The consequence is asymmetric and worth understanding before answering:
**a trader's legal name, phone number, and physical address are displayed
publicly on the store listing to EEA users.** Google's own FAQ warns to
use an address you are comfortable having shared publicly. For a solo
developer that means a home address on a public page.

Apex Download Manager is free, has no monetization of any kind, no
accounts, and no telemetry, so as things stand it is not trade or
business activity and **non-trader** is the fitting answer. This must be
revisited if the project ever takes payment, takes donations at any
meaningful scale, or is published on behalf of a registered business. The
declaration is reversible at any time; toggling trader to non-trader and
back also restarts verification if details need changing.

Not legal advice. See the
[Trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq).

### Field answers

Chrome, like Edge, has **no public release-notes field**. There is no
per-version changelog for users, so version changes are only worth stating
in the review-facing fields.

| Tab | Field | Answer |
| --- | --- | --- |
| Privacy practices | "Single purpose" | Use the single-purpose text in the Edge section. |
| Privacy practices | Permission justifications | Use the per-permission answers in the Edge section, one per box. |
| Privacy practices | Host permission justification | Use the `<all_urls>` answer in the Edge section. |
| Privacy practices | "Are you using remote code?" | No. MV3 forbids it and none is loaded. |
| Privacy practices | Data usage disclosures | Nothing is collected. Tick none of the data types, then tick all three certification statements. |
| Privacy practices | Privacy policy URL | https://apex-download-manager.vercel.app/privacy.html |
| Store listing | Description, screenshots | Reuse the listing copy in `STORE_LISTING.md`. Screenshots are 1280x800, same assets as Edge. |
| Distribution | Visibility, regions | Public, all regions. |

Note the Chrome Web Store policy update taking effect **2026-08-01**:
data collection must be strictly necessary to the disclosed single
purpose, and any post-install change in data handling must be disclosed
prominently. The extension collects nothing, so it complies, but keep the
single-purpose statement and the data disclosures consistent with each
other.

---

## Part 3: Checklist before any upload

1. Bump `version` in `browser-extension/manifest.json`.
2. Run `powershell -File browser-extension\build-zips.ps1`. It rebuilds
   all three zips and then verifies them: forward-slash entry names, eight
   entries each, parseable manifest, no leftover `#grab` markers, and the
   expected per-flavor feature flags. Read its summary line rather than
   assuming it worked.

   The script exists because two hand-rolled mistakes have each broken a
   submission: `Compress-Archive` writes backslash entry names, which
   AMO's validator rejects ("Invalid file name in archive") while Edge and
   load-unpacked tolerate silently; and `Get-Content` plus `ConvertTo-Json`
   mangles non-ASCII characters in the manifest description.
3. Note that rebuilding regenerates the zips for stores that may already
   be reviewing the current ones. If a submission is in flight and the
   source has since changed, restore the submitted artifacts with
   `git checkout -- <zip>` so the repo keeps matching what reviewers hold.
4. Each zip contains exactly these eight entries and nothing else:
   `manifest.json`, `bg.js`, `popup.html`, `popup.js`, and
   `icons/{16,32,48,128}.png`. The markdown files and the build script in
   this folder are never packaged.
4. If a permission was added or removed, say so explicitly in the
   reviewer notes and explain the narrowest use. Unexplained new
   permissions are the most common cause of a slow review.
5. If the version depends on a minimum desktop app version, say which one
   in the public release notes, and make sure the extension degrades with
   a clear message against older apps rather than failing silently.

---

## Part 4: Answer bank (reusable phrasings)

Pull from these when a store asks the same thing in different words.

- **Why host permissions / `<all_urls>`?** Needed for `cookies.getAll` on
  whatever URL the user chooses to download, so files behind a login
  download correctly, and so the right-click item works on any site. There
  are no content scripts and no page content is read.
- **Why `cookies`?** Cookies are read only for the exact URL being
  downloaded, and are sent only to the local app on 127.0.0.1, so a
  download behind a login succeeds. They are used for nothing else.
- **Why `downloads` and `downloads.ui`?** To notice a starting download so
  it can be handed to the local app, and to cancel the browser's own copy
  once the app has accepted it. `downloads.ui` hides the download shelf on
  Chromium during capture.
- **Why `notifications`?** To tell the user when the app could not be
  reached and the download was handed back, and when the pairing token
  needs renewing.
- **Why `storage`?** The user's own settings: the enabled flag, the port,
  and the pairing token.
- **Why `contextMenus`?** The "Download with Apex" and "Grab video on this
  page with Apex" right-click items.
- **Why `activeTab`?** Only to read the address of the tab the user is
  looking at when they click the grab button in the popup. No script
  injection, no page content.
- **Where does data go?** Nowhere except the user's own machine. The only
  network destination is http://127.0.0.1:<port>.
