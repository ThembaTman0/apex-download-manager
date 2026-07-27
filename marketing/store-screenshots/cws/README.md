# Chrome Web Store assets

Chrome requires screenshots and promo tiles as **JPEG or 24-bit PNG with
no alpha channel**. The sources one folder up are 32-bit ARGB and would be
rejected, so these are re-encoded copies. The sources are fully opaque
already, so nothing changed visually.

Two screenshots, deliberately:

- `01-popup-1280x800.png`: the extension popup, paired.
- `02-capture-prompt-1280x800.png`: the app's approval prompt.

**The app-window screenshot is deliberately excluded from the Chrome
listing.** It shows a "Grab Video" button in the app toolbar, which
advertises exactly the capability the Chrome package strips out to stay
clear of the policy against facilitating downloads of streaming media.
Putting it on the listing would undercut the reason for shipping a
separate Chrome build. It stays in use for Edge and Firefox, where the
feature ships and no such rule applies.

Anything added here later must keep that constraint: no video grabbing
visible in Chrome listing imagery.

The store icon is `../../cws-store-icon-128.png`, the extension icon
scaled to 96x96 inside a 128x128 canvas with transparent padding, which is
Chrome's recommended proportion. The raw `browser-extension/icons/128.png`
fills the whole canvas and looks oversized next to other listings.

Regenerate with the script recorded in `SUBMISSION_NOTES.md`.
