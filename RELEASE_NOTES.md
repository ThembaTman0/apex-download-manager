Safer video tool installs, clearer errors, and a few security fixes under the hood.

**Improvements**

- yt-dlp and FFmpeg are now checked against the official published checksums before Apex installs them. A download that doesn't match is deleted instead of installed.
- If your antivirus removes yt-dlp or FFmpeg right after it downloads, Apex now says so and tells you which folder to check, instead of showing a bare "file not found" error.
- Settings now shows which FFmpeg version is installed.

**Fixes**

- Deleting an unfinished download no longer touches a different file that happens to have the same name in the same folder.
- Category folders set as relative paths can no longer point outside your download folder.
- Leftover temporary cookie files from video grabs are cleaned up when Apex starts.
- Updated the networking libraries Apex is built on, including security fixes.
