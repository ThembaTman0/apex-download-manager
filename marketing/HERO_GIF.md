# Hero GIF for the README

One looping clip at the top of the README, 8 to 12 seconds, that shows what
makes Apex different: one file, many connections, finishing fast. Static
screenshots stay below it.

## Tools

- **ScreenToGif** (free, open source): `winget install NickeManarin.ScreenToGif`.
  Records a screen region and exports an optimised GIF.
- Record the real app (`npm run tauri dev` in `desktop-ui`), or the demo build
  (`npm run dev` in `desktop-ui`, port 1420), where `demo/tauriMock.ts` fakes
  progress so you need no real download.

## Settings

- Region: app window only, about 1200x750. No desktop, taskbar or cursor trails.
- 15 fps. Export width 900 px or less. Aim for **under 5 MB** so GitHub shows it quickly.
- Dark UI as-is; no zoom effects or captions needed.

## Shot list

1. **0-2 s:** empty Downloads list. Paste a large file URL (for example the
   Debian netinst ISO used in the speed test) with `Ctrl+N`, press Enter.
2. **2-7 s:** the download starts. Open its properties so the **live segment
   view** fills with parallel ranges and the speed climbs.
3. **7-10 s:** a second item arrives from the browser capture prompt (one-click
   approve).
4. **10-12 s:** first file completes. Cut so the loop back to the start is clean.

## Put it in the README

Save as `docs/screenshots/hero.gif`, then replace the first screenshot line in
`README.md` with:

    ![Apex splitting a download across parallel connections](docs/screenshots/hero.gif)

Keep `downloads.png` in the table below if it still adds something.
