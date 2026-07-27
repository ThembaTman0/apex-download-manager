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

| Field | Answer |
| --- | --- |
| "What's new in this version" | Reuse the AMO Release Notes text from Q1. |
| "Notes for certification" | Reuse the AMO Notes to Reviewer text from Q2. Add the tester walkthrough, which Edge cares about more than AMO does. |
| "Does this extension use single sign-on?" | No. |
| "Is any data collected?" | Nothing is collected. Leave every data-usage checkbox unticked. |
| "Privacy policy URL" | https://apex-download-manager.vercel.app/privacy.html |
| "Test account" | Not needed. State that explicitly. |

---

## Part 3: Checklist before any upload

1. Bump `version` in `browser-extension/manifest.json`.
2. Rebuild **both** zips with forward-slash entry names. Windows path
   separators in zip entry names make AMO's validator reject the package
   ("Invalid file name in archive"), while Edge and load-unpacked tolerate
   them silently. Build with a raw `System.IO.Compression.ZipArchive`
   script that sets entry names explicitly; `Compress-Archive` gets this
   wrong. Read `manifest.json` with
   `[System.IO.File]::ReadAllText(path, [System.Text.Encoding]::UTF8)`,
   because `Get-Content` plus `ConvertTo-Json` mangles non-ASCII
   characters in the description.
3. Confirm the chromium zip's manifest has `background.service_worker`
   only and no `browser_specific_settings`. Edge hard-rejects
   `background.scripts` in MV3.
4. Each zip should contain exactly these eight entries and nothing else:
   `manifest.json`, `bg.js`, `popup.html`, `popup.js`, and
   `icons/{16,32,48,128}.png`. The markdown files in this folder are
   documentation and must never be packaged.
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
