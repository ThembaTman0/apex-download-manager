Apex now runs on Linux, and a small progress window keeps your downloads in view while you work.

**New**

- Apex for Linux, as an AppImage or a .deb for Ubuntu, Debian and similar. Everything works as on Windows: the browser extension, the tray, starting at sign-in, and the video grabber. The AppImage updates itself; with the .deb, install the new version when one comes out.
- A progress window appears in the corner when a download from your browser or a grabbed video starts, and whenever you minimize Apex. With one download it shows the time left and a live speed chart; with several, a simple list. Pause and resume from it, open finished files, and click the Apex logo to bring the app back. It never takes focus, stays where you drag it, and closes itself once everything is done. Turn it off in Settings > Browser capture.
- YouTube offers its full range of qualities again. YouTube now needs a small helper called Deno for that, and you can install it with one click in Settings > Video Grabber. Without it, YouTube may only offer a few qualities, and Apex tells you so when you grab a YouTube video.
- The welcome screen shows whether the browser extension is paired.

**Fixes**

- Video downloads no longer reach 100% and then drop back to around 60%. Videos that arrive as separate picture and sound files now show one steady bar for the whole download, and pausing and resuming keeps the size and progress where they were.
- The Grab Video window no longer keeps showing "yt-dlp is not installed" after you install it from there.

**Under the hood**

- Updated the certificate libraries Apex uses for secure connections, so it no longer trusts certificates that browsers have stopped trusting.
- The progress window can only do the few things it needs, nothing else in Apex.
