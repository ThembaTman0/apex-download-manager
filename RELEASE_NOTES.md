Apex now stays in the tray when Windows starts it, even if you left the window open last time.

**New**

- Videos that need you to be signed in. When a site refuses a video because the request does not look signed in, Apex can now offer to retry using your browser sign-in. Update the browser extension to 1.3.3, then use "Grab video from this page": the extension hands Apex the cookies for that one page, Apex keeps them in memory for that single retry, and they are never written to its database. Nothing is retried unless you click the button.

**Improvements & fixes**

- Starting with Windows keeps Apex in the tray, as it was always meant to. If you shut down with the Apex window open, the next sign-in reopened the window instead of leaving Apex running quietly. Apex was restoring the window's saved visibility along with its size and position, which overrode the tray launch.
- A relaunch by Windows itself no longer forces the window open. Opening Apex again yourself still brings the window to the front, as before.
