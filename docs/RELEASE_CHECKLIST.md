# Release checklist

Manual tests before tagging a release. Part 1 is specific to 1.0.14; Part 2
is the regression pass to repeat on every release; Part 3 runs after the tag.
Tick boxes as you go. Anything that fails: note what you did, what you
expected and what happened, with a screenshot.

## Before you start

1. Quit Apex from the tray.
2. Build the release installers from the `release/1.0.14` branch (after the
   version is bumped to 1.0.14):

   ```powershell
   cd desktop-ui
   npx tauri build -c '{"bundle":{"createUpdaterArtifacts":false}}'
   ```

   Installers land in `desktop-ui/src-tauri/target/release/bundle/` (`msi/`
   and `nsis/`). The release build takes several minutes.
3. Install **the same kind you already have** (your current install is the
   MSI in Program Files) over the top of 1.0.13. Your downloads and settings
   are kept.

## Part 1: what's new in 1.0.14

### What's new dialog (after an update)
- [ ] First launch after installing over 1.0.13: "What's new in Apex 1.0.14" appears once, with the 1.0.14 notes (teaser line, Improvements, Under the hood).
- [ ] Bullets and bold titles look right; the dialog scrolls if the window is small.
- [ ] Close with **Got it**, quit Apex from the tray, start it again: the dialog does **not** come back.
- [ ] Close with the **X** and by clicking outside the dialog: both close it the same way.

### "Don't show this after future updates"
- [ ] Settings > Updates shows **Show what's new after updates** ticked by default.
- [ ] Untick it, quit and restart: setting stays unticked.
- [ ] Tick it again: stays ticked after a restart.
- [ ] (Optional, needs a dev build) In the dialog, tick "Don't show this after future updates" and close: Settings > Updates now shows the toggle unticked.

### Welcome tour (fresh install)
Tested best on a second Windows user account or a VM, since it only shows
when Apex has never run and has no downloads.
- [ ] "Welcome to Apex" appears on first launch with three cards.
- [ ] **Chrome / Edge / Firefox** buttons open the right store pages in your browser.
- [ ] **Open Grab Video** closes the welcome and opens Grab Video.
- [ ] **Open Settings** closes the welcome and opens Settings.
- [ ] **Get started** closes it; it never shows again after a restart.
- [ ] After the welcome, the What's new dialog does **not** also appear.

### Install yt-dlp from Grab Video
To test, rename `%APPDATA%\com.apex.download-manager\tools\yt-dlp.exe` to `yt-dlp.exe.bak` first (rename it back at the end if anything fails).
- [ ] Open **Grab Video**: the box says yt-dlp is not installed, mentions about 18 MB and the antivirus note.
- [ ] Click **Install yt-dlp**: the button shows a spinner and "Installing… N%".
- [ ] When done, the dialog switches to the "Video page URL" form by itself.
- [ ] Paste a video page link, **Analyze**, pick a quality, download: it completes and plays.
- [ ] The **Settings** link next to the button opens Settings.
- [ ] From the browser: with yt-dlp missing again, use the extension's "Grab video from this page" (Firefox/Edge). Install from the dialog: the video is analyzed right after the install finishes.
- [ ] Settings > Video Grabber also still installs and updates yt-dlp, and shows the FFmpeg version.
- [ ] Delete `yt-dlp.exe.bak` once everything works.

### Auto-organize in Settings
- [ ] With "Sort downloads into category folders" **off**: the category rows are visible but dimmed, with "Tick the box above to use these folders." They can't be clicked or typed in.
- [ ] Tick it: rows become normal and editable; the hint line disappears.
- [ ] Set a folder for Video (e.g. `Videos`), download a small video file: it lands in that folder.
- [ ] Untick and tick again: your folder settings are still there.

## Part 2: regression (every release)

Regression testing means re-checking things that **already worked**, to
catch anything the changes broke by accident. It is needed this time:
1.0.14 updates Tauri and most of its plugins (dialog, opener, notification,
autostart, single-instance, window-state, clipboard, process, updater), and
each one powers a feature below. Each row says which update it covers.

### Downloads (engine)
- [ ] Add a large download (e.g. a Linux ISO): it splits into several connections, speed and progress move, segment bar fills.
- [ ] Pause, resume: continues from where it stopped.
- [ ] Pause, quit Apex from the tray, start again, resume: continues, file is correct at the end.
- [ ] Queue: start more downloads than "Max concurrent", the extras wait and start in order.
- [ ] Speed limit (status bar) slows a running download.
- [ ] Delete a finished download with "delete file": file is gone. Delete one without: file stays.
- [ ] Open a finished file and "Show in folder" (opener plugin).

### Browser extension (capture server)
- [ ] Extension popup says "Connected to Apex".
- [ ] Clicking a normal download link in the browser hands it to Apex (approval prompt appears).
- [ ] Right-click a link > "Download with Apex" works.
- [ ] With Apex quit, a browser download falls back to the browser and is not lost.

### Windows integration
- [ ] Taskbar progress bar moves during a download (window-state / core).
- [ ] Close the window: Apex keeps running in the tray; tray menu Open / Pause All / Resume All / Quit work.
- [ ] Start Apex while it's already running: the existing window comes up, no second copy (single-instance plugin).
- [ ] Settings > "Launch Apex when I sign in" on, sign out and in: Apex starts hidden in the tray (autostart plugin). Turn it off again if you don't want it.
- [ ] Window size and position are remembered after a restart, and the browser capture prompt still appears at the right size (window-state plugin).
- [ ] A completed download shows a Windows notification (notification plugin).
- [ ] Copy a download link anywhere: the "Download link copied" toast appears (clipboard plugin).
- [ ] Settings > Browse… for the download folder opens a folder picker (dialog plugin).
- [ ] Pinned taskbar icon still shows the Apex logo after installing 1.0.14.

### Settings and data
- [ ] All your existing downloads and settings are there after installing 1.0.14.
- [ ] Change a setting, restart: it is kept.
- [ ] Checksum dialog (right-click a finished download > verify) still computes a hash.

## Part 3: after tagging (update path)

The real test of the updater upgrade. Needs a machine on **1.0.13**: if your
PC already runs your local 1.0.14 build, reinstall 1.0.13 first from
https://github.com/ThembaTman0/apex-download-manager-releases/releases/tag/v1.0.13
(same installer type as before).

- [ ] Within a minute of starting 1.0.13 (or Settings > Check for Updates), the update toast offers 1.0.14 with the new teaser line.
- [ ] **Install & Restart**: Apex downloads, installs and restarts on 1.0.14 by itself.
- [ ] After the restart: "What's new in Apex 1.0.14" appears once.
- [ ] Settings > Updates shows v1.0.14; Check for Updates says "You're up to date".
- [ ] Taskbar pin icon still correct.
- [ ] Website download button gives the 1.0.14 installer.

If the update fails: do not tag again. Capture the error and check the
release workflow log before anything else.
