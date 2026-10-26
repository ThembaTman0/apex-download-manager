Select All now only picks what you can see, Stop really stops a playlist, and finished downloads are easier to tidy up.

**Fixes**

- Select All (and Ctrl+A) now selects only the downloads shown in the current tab, type filter and search. Before, it selected every download, so deleting from the Completed tab could also delete active ones. Changing tab or search now clears the selection too.
- Stopping a playlist while it's being queued now really stops it. The button reads Stop, videos already added stay in your list, and you can remove them in one click if you didn't want any.
- The "Download link copied" popup no longer reappears for a link you copied earlier, for example when Apex starts or when you close your browser.
- Installing or updating yt-dlp and FFmpeg now uses your proxy setting, and a failed install says why.

**New**

- Optionally remove downloads from the list as soon as they finish, in Settings > Finished downloads. Only the list entry goes, never the file.
- Finished downloads whose file was moved or deleted now show "File missing", and the status bar offers to remove them all at once. Files on an unplugged drive are left alone.

**Under the hood**

- Updated Tauri and the libraries Apex is built on.
