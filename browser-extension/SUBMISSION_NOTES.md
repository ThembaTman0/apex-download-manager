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

**v1.3.3 (paste this):**

```
New in 1.3.3

- Videos that need you to be signed in. Some sites refuse a video unless
  the request comes from a signed-in account. When that happens, Apex can
  now offer to retry using your browser sign-in. Using "Grab video from
  this page" hands Apex the cookies for that one page along with its
  address; Apex holds them in memory for that single attempt, never writes
  them to its database, and only uses them if you click the retry button.
  Requires Apex 1.0.9 or newer.
- Narrower site access. The extension now asks for http and https pages
  only, rather than every address. Nothing changes in what it does; it is
  simply a smaller permission.

As always, if Apex is not running the download simply continues in the
browser, so nothing is lost.
```

**v1.3.2 (published, kept for reference):** grab video from a page, clearer
stale-pairing messages, tidied popup wording.

### Q2. "Notes to Reviewer" (private, reviewer only)

Reviewers want: what changed since the last reviewed version, why any new
permission is there, whether a build step is involved, and how to test
without an account. Lead with the changes, then the standing answers.

**v1.3.3 (paste this):**

```
What changed since 1.3.2

1. The "grab video from this page" hand-off now includes that page's
   cookies. Both entry points (the popup button and the page context-menu
   item) call chrome.cookies.getAll for the page URL and include the
   result, as structured name/value/domain/path/secure/expiry objects, in
   the same JSON POST to http://127.0.0.1:43666/grab that already carried
   the URL. Nothing else is sent and no page content is read.

   Why: sites increasingly refuse video metadata unless the request looks
   signed in. The desktop app fetches in its own HTTP client, outside the
   browser, so it cannot inherit the session otherwise. The app analyses
   the page without cookies first and only offers a "retry using your
   browser sign-in" button if that fails; the cookies are held in memory
   for that one retry, are never written to its database, and are gone
   when the app closes.

   This is the same trust boundary the extension already crosses for
   ordinary downloads, where a Cookie header for the download URL is
   forwarded so files behind a login fetch correctly. The destination is
   unchanged: http://127.0.0.1 on the user's own machine, gated by a
   pairing token the user approved in a native prompt in the app. Nothing
   is sent to any remote server.

2. Host permissions narrowed from <all_urls> to
   ["http://*/*", "https://*/*"]. This is a reduction, not a new
   permission: it drops file://, ftp:// and other schemes the extension
   never handled. Cookies and captured downloads are HTTP(S) only, and the
   local app is reached over http://127.0.0.1.

No new permissions are requested in this version. The cookies permission
was already present and already used for the download path.

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
https://apexdownloadmanager.com. Install it, open the extension
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

The project is licensed **GPL-3.0-or-later** (decided 2026-09-21, see
`LICENSE` at the repo root). Pick "GNU General Public License v3.0" on the
first upload after the source repo goes public; until then, keep whatever
was chosen on the first submission.

### Q5. "Data collection" / privacy disclosure

**Answer: none.** The manifest already declares
`browser_specific_settings.gecko.data_collection_permissions.required =
["none"]`. Privacy policy text is in `STORE_LISTING.md`, hosted at
https://apexdownloadmanager.com/privacy.html.

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
| Privacy | "Privacy Policy URL" | https://apexdownloadmanager.com/privacy.html |
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

**v1.3.3 (paste this):**

```
New in 1.3.3

1. "Grab video from this page" now sends that page's cookies with its URL. Both entry points (popup button, page context menu) call chrome.cookies.getAll for the page URL and include the result, as structured name/value/domain/path/secure/expiry objects, in the JSON POST to http://127.0.0.1:43666/grab. No page content is read.

Why: sites increasingly refuse video metadata unless the request looks signed in, and the desktop app fetches outside the browser, so it cannot inherit the session. The app analyses without cookies first and only offers a "retry using your browser sign-in" button if that fails. The cookies stay in the app's memory for that one retry, are never written to its database, and are gone when it closes. The extension already forwards a Cookie header for ordinary downloads so files behind a login work; this is the same boundary.

2. Host permissions narrowed from <all_urls> to ["http://*/*","https://*/*"]. A reduction, not a new permission: it drops file:// and ftp://, which the extension never handled.

No new permissions in this version; cookies was already present and used for the download path.

Standing notes

- No build step. The zip is the source: plain unminified JavaScript, no bundler, no libraries.
- No test account needed.
- No remote network requests. The only destination is http://127.0.0.1, the Apex desktop app on the user's own machine, gated by a pairing token the user approves in the app.
- No content scripts, no analytics, no data collection.

Testing without the app: with Apex absent, a download is handed back to the browser and completes normally, the popup shows a red dot and "Apex isn't running", and the grab button reports it could not reach Apex. Nothing is lost.

Full path: install the free Windows app from https://apexdownloadmanager.com, open the popup, click "Pair with Apex app", approve the prompt in the app. The sign-in retry needs Apex 1.0.9 or newer.
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
as the logged-in user. The same applies to "Grab video from this page":
the cookies for that one page are sent with its address, so the app can
offer to retry as the signed-in user when a site refuses a video to a
signed-out request.

Cookies are read for no other purpose, are read only for the exact URL
being acted on, are never sent anywhere except http://127.0.0.1 on the
user's own machine, and are not retained by the extension.
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

**`http://*/*` and `https://*/*` (host permission)**

```
Required so that cookies.getAll works for whatever URL the user chooses to
download, since a download can originate from any site, and so the
right-click menu items work on any site. This is a capability the download
hand-off needs, not a data-collection surface: the extension registers no
content scripts, reads no page content, and makes no requests to any
remote server. Its only network destination is http://127.0.0.1, the Apex
desktop app on the user's own machine.

The pattern is the narrowest one that still covers every site a download
can come from. It was <all_urls> up to version 1.3.2 and was reduced to
http and https in 1.3.3, since cookies and captured downloads are HTTP(S)
only and the local app is reached over http://127.0.0.1.
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

### Account prerequisites (one-time, but they block publishing)

Chrome gates the publish button on account state, and the errors surface
late, only when you try to publish. Clear these first:

- **2-Step Verification** must be on for the Google account that owns the
  developer registration. Without it, uploading fails with a generic
  "There was a problem uploading your file", which points at the package
  and is misleading. Enable it at myaccount.google.com/security, then sign
  out of the dashboard and back in, because the pre-2SV session stays
  stale. Generate backup codes while there: this account can push an
  update to every user, and losing it is worse than losing most passwords.
- **Publisher contact email** must be set on the account-level **Settings**
  page (left sidebar of the dashboard, not the item edit page), and then
  **verified** by clicking the link Google emails. Both are separate
  blockers and both are reported only at publish time. Google uses this
  address for policy notices and takedown warnings, so it should be an
  inbox that is actually read.
- **Data usage certification**: on the item's Privacy practices tab, below
  the nine data-type checkboxes, three "I certify that the following
  disclosures are true" boxes must all be ticked. Leaving the nine
  unticked is correct; these three are mandatory regardless. Save Draft
  afterwards or the change does not stick.

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
plus the `http://*/*` and `https://*/*` host permissions, so skip the
`activeTab` justification when filling the privacy practices tab.

**What 1.3.3 changes for Chrome:** only the host-permission narrowing. The
version's headline feature, sending page cookies with a video grab, lives
entirely inside the stripped `#grab` regions, so the Chrome package does
not contain it and its cookie use is still the download path alone. Keep
the Chrome privacy answers below describing that and nothing more.

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
| Privacy practices | Host permission justification | Use the host-permission answer in the Edge section. |
| Privacy practices | "Are you using remote code?" | No. MV3 forbids it and none is loaded. |
| Privacy practices | Data usage disclosures | Nothing is collected. Tick none of the data types, then tick all three certification statements. |
| Privacy practices | Privacy policy URL | https://apexdownloadmanager.com/privacy.html |
| Store listing | Description, screenshots | Reuse the listing copy in `STORE_LISTING.md`. Screenshots are 1280x800, same assets as Edge. |
| Distribution | Visibility, regions | Public, all regions. |

### Privacy tab answers (1,000 chars per box)

Chrome asks per-permission, in its own boxes, and displays the data-usage
section publicly. These are tuned to the Chrome package, which has no
`activeTab`. If the form ever lists `activeTab`, the wrong zip was
uploaded. Written 2026-07-27, all within the limit; re-check the count if
edited.

**Single purpose** (801)

```
Apex Download Manager hands downloads from the browser to the Apex Download Manager desktop application running on the same computer, so they can be downloaded with multiple connections, paused and resumed, queued, and scheduled.

That is the extension's only function. When a download starts, the extension passes the file's URL, along with the cookies and referring page for that URL, to the Apex app listening on 127.0.0.1, then cancels the browser's own copy so the file is not fetched twice. If the app is not running or declines, the browser download is resumed so nothing is lost.

The extension has no other feature set. It registers no content scripts, reads no page content, shows no injected UI, and makes no request to any server other than the local application on the user's own machine.
```

**downloads** (702)

```
This is the extension's core function. It listens for downloads starting in the browser, using chrome.downloads.onDeterminingFilename, so the URL can be handed to the Apex desktop application, and it cancels the browser's own copy once the app has accepted the download, so the file is not fetched twice.

The same permission is what makes the safety net possible: if the app is unreachable or declines the download, the extension restarts it in the browser so the user never loses a file. It also erases the leftover cancelled entries that would otherwise accumulate in the browser's download list.

Without this permission the extension cannot detect or redirect downloads and has no function at all.
```

**cookies** (698)

```
Downloads behind a sign-in fail without the session cookie, because the desktop application fetches the file in its own HTTP client rather than through the browser.

When the user starts a download, the extension calls chrome.cookies.getAll for that one specific URL and passes the result to the Apex application on 127.0.0.1, so the app can request the file as the signed-in user. This is the only use.

Cookies are read only for the URL being downloaded, at the moment it is downloaded. They are not read for any other site, are not stored by the extension, are not sent to any remote server, and never leave the user's computer. The desktop application discards them once the download completes.
```

**contextMenus** (540)

```
Adds the extension's manual entry points, so a user can send a file to the Apex application without first starting a browser download.

Two items are registered: "Download with Apex" on links, and "Download media with Apex" on images, video, and audio. Choosing either passes that one URL to the local application.

These menu items are the only interface the extension adds outside its own toolbar popup. Without this permission the manual path is unavailable and users could only send files that the browser had already begun downloading.
```

**storage** (577)

```
Stores the user's own configuration with chrome.storage.sync: whether capture is enabled, the port the desktop application listens on, whether to hide the browser's download shelf during a capture, and the pairing token that the application issues when the user approves pairing.

The pairing token is the reason this permission is necessary. Without persistence the user would have to pair the extension with the application again on every browser restart.

No browsing data, download history, or page content is stored. The stored values are settings the user set themselves.
```

**notifications** (773)

```
Reports failures the user would otherwise never see, because the extension has no page interface and its work happens in the background.

Three cases: the Apex application could not be reached, so the download was handed back to the browser; the pairing token is no longer valid, so the user needs to pair again; and unfinished downloads restored by the browser at startup were dismissed because the application was not running.

Without notifications these would fail silently and the user would be left wondering why a download behaved unexpectedly. Notifications are throttled, at most one per five minutes for the stale-token case and batched into a single summary for the startup case. They are never used for promotion, offers, or any message unrelated to a download.
```

**Host permission** (956) - the box that triggers the in-depth review, so
it argues necessity first and bounds the scope second

```
The extension needs the cookies belonging to whatever file the user chooses to download, and a download can come from any site, so the pattern cannot be narrowed to a fixed list of hosts without breaking downloads on every site not on it. It is limited to the http and https schemes, the only ones the extension handles.

When a download starts, the extension calls chrome.cookies.getAll for that one URL and forwards the result to the Apex desktop application on 127.0.0.1 so files behind a sign-in download correctly. The same breadth allows the "Download with Apex" context menu to work on any page.

The breadth is not used to observe browsing. The extension registers no content scripts, injects nothing into any page, reads no page content, and never sends a request to any remote server. Its only network destination is the application on the user's own computer, reachable only after the user approves pairing in a prompt shown by that application.
```

**Expect the "Broad Host Permissions" warning.** It is informational, not
a blocker, and it appears at submit time suggesting `activeTab` or a
narrowed host list. Neither substitutes here, and the reasoning is worth
keeping straight:

- A download can come from any host, so there is no finite site list to
  enumerate. Any list would silently break downloads elsewhere.
- `activeTab` is granted only on an explicit gesture toward the extension,
  and only for the active tab. Automatic capture involves no such gesture,
  the user clicks a link on the page. And download URLs often sit on a
  different host than the page (CDNs, signed URLs), so the origin
  `activeTab` would grant is not the one whose cookies are needed.

**Done in 1.3.3:** `<all_urls>` was replaced with
`["http://*/*", "https://*/*"]`, batched into a version all three stores
were getting anyway rather than re-uploaded mid-submission. Cookies and
captured downloads are HTTP(S) only and the local app is reached over
`http://127.0.0.1`, so nothing breaks; it drops `file://`, `ftp://` and
other unused schemes. Do not expect it to avoid the in-depth review, since
both patterns count as broad.

**Remote code:** No. MV3 forbids remotely hosted code and none is loaded;
there is no `eval`, no external `<script>`, and no remote module.

**Data usage: tick nothing, then certify all three disclosures.** The
extension transmits nothing off the device. Cookies and the download URL
go to a local process on the same machine at the user's request, which is
not collection, and the published privacy policy says the same. The
Firefox manifest declares `data_collection_permissions: none`, so this is
consistent across all three stores.

Expect this to be the one combination a reviewer might question: the
`cookies` permission plus broad host permissions with no declared data
collection.
The answer, if asked, is that nothing leaves the user's machine.

**Privacy policy URL:** https://apexdownloadmanager.com/privacy.html
(verified live 2026-07-27, and its text matches these declarations).

### Test instructions (500 char limit, Username and Password left empty)

There is no account, so both credential boxes stay blank. The instruction
box is only 500 characters, far tighter than the equivalent AMO and Edge
fields, so it drops the standing notes and keeps only what a tester needs
to exercise the extension. Current text is 498 characters; re-count if
edited.

```
No account or credentials needed.

Windows only. Install the free app: https://apexdownloadmanager.com

Click the extension icon, choose "Pair with Apex app", and approve the prompt that opens in the app. Then download any file: Apex takes over and the browser's own download is cancelled. Right-click a link for "Download with Apex".

Without the app the extension is still testable: downloads proceed normally in the browser and the popup reads "Apex app not reachable". Nothing is lost.
```

The last paragraph is the important one. A Chrome reviewer may well be on
macOS or Linux and unable to install a Windows application at all, so the
text has to make clear the extension can be evaluated without it and
degrades safely rather than appearing broken.

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

- **Why host permissions (`http://*/*`, `https://*/*`)?** Needed for
  `cookies.getAll` on whatever URL the user chooses to download, so files
  behind a login download correctly, and so the right-click item works on
  any site. There are no content scripts and no page content is read. It
  was `<all_urls>` through 1.3.2 and narrowed in 1.3.3.
- **Why `cookies`?** Cookies are read only for the exact URL being acted
  on, the file being downloaded or the page being grabbed, and are sent
  only to the local app on 127.0.0.1, so a download or a grab behind a
  login succeeds. They are used for nothing else.
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
