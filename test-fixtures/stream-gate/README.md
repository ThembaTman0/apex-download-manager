# stream-gate fixture

A local page that reproduces the "JS-rendered player + gated HLS" pattern
used by many streaming sites, so Apex's grab path can be tested without
depending on a third-party site. All media is a synthetic ffmpeg test pattern.

```powershell
node generate.mjs              # once: writes ./hls (uses Apex's ffmpeg if not on PATH)
$env:GATE="both"; node server.mjs   # http://localhost:8787/
```

`GATE` = `referer` (default) | `token` (60s single-issue token) | `both` | `none`.
The server logs every request with its Referer and UA, so you can see what each
client actually sent.

## What the page does

1. `/watch/...` returns an empty shell: no `<video src>`, no `.m3u8` in the HTML.
2. `player.js` calls `/api/source` (403 without `x-requested-with: player`), which
   returns the stream path base64-wrapped, with a short-lived token.
3. hls.js plays it through MSE, so `video.src` is a `blob:` URL.
4. `/hls/*` returns 403 unless the gate is satisfied; segment URLs carry the token.

## Expected results (GATE=both)

| Input | Result |
|---|---|
| Page URL in Grab Video | `Unsupported URL` (same as the real-site failure) |
| Right-click video > Download media with Apex | Fails: sends a `blob:` URL |
| `.m3u8` copied from DevTools, pasted alone | `HTTP Error 403` (no referer) |
| `.m3u8` + `--referer <page>` within 60s | Downloads (verified with yt-dlp) |

The last row is the target for stream sniffing in the extension: capture the
media request together with its page referer, and pass both to Apex.
