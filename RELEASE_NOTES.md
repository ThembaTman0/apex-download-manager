When a download link expires, paste a fresh one and Apex carries on where it left off.

**New**

- Refresh Address: right-click a paused or failed download and choose "Refresh Address…" to paste a new link. Apex continues from the part already downloaded instead of starting over. When a download fails because its link expired, Properties offers the same thing right under the error. If the new address turns out to serve a different file, the download starts over so it never mixes two files.
- A sound when a download finishes: Apex now plays your system's notification sound with the "Download complete" notification. Turn it off in Settings, under Notifications.
- Keyboard shortcuts that work from any app: Ctrl+Shift+Alt+P pauses everything (press again to resume), and Ctrl+Shift+Alt+A opens Add URL with a copied link filled in. Turn them on in Settings, under Keyboard shortcuts.

**Fixes**

- Pausing a very large download on Windows works right away again. At the start of a big download, Windows could spend minutes preparing the file, and during that time neither Pause nor Task Manager could stop Apex. Thanks to iiAhmedYT for reporting it.
- While a pause takes effect, the download now shows "Pausing" instead of still looking like it's downloading. Idea and first version by iiAhmedYT.
- "What's new" no longer opens every time your PC starts. On some PCs the record of which version you had already seen was lost at every launch; Apex now keeps it with the rest of its settings.
- The "already downloaded" warning no longer flashes for a moment after you click Start Download.
- AppImage downloads now show as APPIMAGE and are filed under Programs.
- Settings no longer shows the video grabber tools as "Not installed" for a moment while it checks them.

**Under the hood**

- Updated the libraries Apex is built on, including the notification, dialog and updater components.
