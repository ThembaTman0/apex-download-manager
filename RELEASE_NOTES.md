Security hardening for the browser-capture server, plus dark dropdown menus and update notes at a glance.

**Security**

- Capture server locked down: responses are only shared with paired browser extensions (web pages can no longer probe it), token checks are constant-time, and slow connections time out.
- Browser cookies used for a download are purged from the local database once it completes.
- Downloaded files' Mark-of-the-Web now records only the site origin, not the full URL.
- Filenames matching Windows reserved device names (CON, NUL, …) are sanitized.
- Free disk space is checked before preallocating a download.
- Plain-HTTP (unencrypted) downloads are now flagged with a warning in the capture prompt and details panel.
- Tightened the app's content-security policy.

**Improvements & fixes**

- Dropdown option lists (speed limit, post-download action) now render dark instead of flashing white.
- The update notification shows a one-line summary of what's new, with a link to the full release notes.
