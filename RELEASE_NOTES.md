A refreshed look, a portable edition, and downloads you can check came from this project's own builds.

**New**

- Redesigned Settings: its pages now open right in the sidebar (General, Downloads, Folders, Browser, Video, Updates), and a search box finds any setting by name. Press / to jump to it. Save appears only when you have changed something.
- See your connections at work: open Properties on a download to see every connection's piece of the file and how far it has got. When one finishes early, it takes over half of the largest piece still left, and you can watch that happen.
- Portable edition for Windows: unzip it anywhere, including a USB drive, and your downloads list, settings and tools stay in a "data" folder next to it. Updates are manual for the portable copy.
- Start Apex in the tray with --minimized (handy for shortcuts and scripts). --help lists the options and --version shows the version.
- Check your download: every installer and the portable zip now come with a signed record that they were built by this project's GitHub release workflow from its published source. Check one with "gh attestation verify <file> --repo ThembaTman0/apex-download-manager". Each release also lists SHA-256 checksums.

**Improved**

- The Dashboard is calmer when nothing is downloading: the speed chart says it's idle instead of drawing a flat line, and Total Speed reads "Idle".
- The Downloads filters fit on one line: status is a single switch, and file type is a dropdown.
- The Downloads toolbar no longer runs off the edge of the window at the default size.
- The Video page in Settings remembers the status of yt-dlp, FFmpeg and Deno, so it no longer shows "Checking…" every time you open it.

**Fixes**

- If Apex was force-closed or crashed in the middle of a download, resuming could in rare cases skip a small piece of the file. Apex now only counts data as downloaded once Windows has it, and a new test kills Apex at random moments mid-download, resumes, and checks the finished file byte for byte on every change to the download engine.

**Under the hood**

- Updated the database, zip and other libraries Apex is built on, including a fix for a security advisory reported against the old database library.
- The installer template follows Tauri's latest default, which keeps a desktop shortcut deleted if you removed it.
