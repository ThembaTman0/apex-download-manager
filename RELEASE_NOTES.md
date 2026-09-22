Downloads now show their progress on the taskbar, the queue can be reordered, and videos can bring their subtitles along.

**New**

- Progress on the Windows taskbar. While downloads are running, the Apex button carries a progress bar, so a minimised window still tells you how far along everything is. It turns amber when everything is paused and clears when there is nothing left to do.
- Reorder the queue. When more downloads are waiting than can run at once, queued rows now show their place in line, and right-clicking one offers Move to Top, Move Up, Move Down and Move to Bottom. Moving something to the front starts it as soon as a slot frees up.
- Replace a download's address. Links from a download site often expire while a download sits paused, and until now the only way forward was to start the file over. Properties has a button next to the URL: paste the fresh address and the download carries on from what is already on disk. If the new address turns out to serve a different file, it starts over, exactly as it would have anyway.
- Subtitles in the video grabber. Videos that offer subtitles now show a language picker, with the site's own tracks listed ahead of machine-generated ones. Subtitles are saved next to the video and, when FFmpeg is installed, embedded in it as well.
- Category folders you choose. Auto-organize is no longer fixed to Video, Music, Programs and friends inside your download folder. Each category can be given its own destination, including one on another drive, and extra file types can be routed to whichever category you want them in. Leave a category blank and it behaves exactly as it did before.

**Improvements & fixes**

- Retrying failed downloads is a single step. The "Retry" button next to the failed count now retries them all in one go instead of one at a time, and it still leaves downloads you paused on purpose alone.
- Changing a download's address does not carry your session to a different site. Cookies and the referring page captured from your browser stay with the site they came from; a new address on a different site starts clean.
- New installs no longer start with Windows on their own. Turn on "Start with Windows" in Settings if you want Apex waiting in the tray when you sign in. If you already have Apex installed, your current setting is kept.
