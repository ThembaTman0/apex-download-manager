Downloads no longer start over when a server gives one confusing answer.

**Fixes**

- A large download could suddenly drop back to 1% after a short network hiccup, losing gigabytes. When Apex resumes, it asks the server whether the file changed. Some servers answer in a way that looked like "changed" even when it hadn't, and Apex threw the progress away. Now Apex also checks the file's size and fingerprint, and keeps going when it's the same file.
- If a download really does have to start over (the file changed on the server, or its partial file was removed or quarantined), Apex now tells you why in a notification instead of quietly resetting to 0%.
- Restart (right-click a download) now asks first when the download already has data, showing how much would be discarded, so a slip in the menu no longer throws away gigabytes.
- The yt-dlp update check now goes through your proxy, like the tool downloads already did. Behind a proxy it used to fail quietly, so an outdated yt-dlp was never flagged.

**New**

- A small diagnostic log: Settings, Updates, "Open log folder". It records retries and why a download had to start over, so a bug report can say exactly what happened. It stays on your PC and is never sent anywhere, and download links are saved without the part that holds access tokens.

**Under the hood**

- Downloads write to disk in larger batches, which saves work on fast connections. By Ahmed Waleed (iiAhmedYT).
- New safety checks around how connections split up a file, and a new test that resumes against a server giving the confusing answer described above, so this bug can't quietly come back.
