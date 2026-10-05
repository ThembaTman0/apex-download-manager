// Reproduces the "JS-rendered player + gated HLS" pattern that makes
// page-URL grabbers fail. No dependencies: node server.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.PORT ?? 8787);
const ORIGIN = `http://localhost:${PORT}`;
const root = import.meta.dirname;
// Gate modes (GATE env): "referer" (default), "token", "both", "none".
const GATE = process.env.GATE ?? "referer";
const tokens = new Map(); // token -> expiry ms
const TOKEN_TTL = 60_000;

const types = { ".html": "text/html", ".js": "text/javascript", ".m3u8": "application/vnd.apple.mpegurl", ".ts": "video/mp2t" };
const log = (status, req, why = "") =>
  console.log(`${status} ${req.method} ${req.url}  referer=${req.headers.referer ?? "-"}  ua=${(req.headers["user-agent"] ?? "-").slice(0, 40)} ${why}`);

function gateOk(req, url) {
  const refOk = (req.headers.referer ?? "").startsWith(`${ORIGIN}/watch/`);
  const t = url.searchParams.get("t");
  const tokOk = !!t && (tokens.get(t) ?? 0) > Date.now();
  if (GATE === "none") return [true];
  if (GATE === "referer") return [refOk, "bad referer"];
  if (GATE === "token") return [tokOk, "bad/expired token"];
  return [refOk && tokOk, !refOk ? "bad referer" : "bad/expired token"];
}

createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  const p = url.pathname;
  try {
    // The page: an empty shell. No <video src>, no m3u8 in the HTML.
    if (p.startsWith("/watch/")) {
      log(200, req);
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(await readFile(join(root, "public", "watch.html")));
    }
    if (p === "/player.js") {
      res.writeHead(200, { "content-type": "text/javascript" });
      return res.end(await readFile(join(root, "public", "player.js")));
    }
    // The API the player calls. Requires an XHR header like many SPAs, and
    // returns the stream path base64-wrapped so it isn't greppable.
    if (p === "/api/source") {
      if (req.headers["x-requested-with"] !== "player") { log(403, req, "not from player"); res.writeHead(403); return res.end(); }
      const t = randomBytes(12).toString("hex");
      tokens.set(t, Date.now() + TOKEN_TTL);
      log(200, req, `issued token (${TOKEN_TTL / 1000}s)`);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ s: Buffer.from(`/hls/index.m3u8?t=${t}`).toString("base64") }));
    }
    if (p.startsWith("/hls/")) {
      const [ok, why] = gateOk(req, url);
      if (!ok) { log(403, req, why); res.writeHead(403); return res.end("forbidden"); }
      const hlsDir = resolve(root, "hls");
      const file = resolve(root, "." + p);
      if (relative(hlsDir, file).startsWith("..")) { res.writeHead(400); return res.end(); }
      let body = await readFile(file);
      // Carry the token onto segment URLs, like real signed-URL CDNs.
      if (p.endsWith(".m3u8") && url.searchParams.get("t")) {
        body = body.toString().replace(/^(seg\d+\.ts)$/gm, `$1?t=${url.searchParams.get("t")}`);
      }
      log(200, req);
      res.writeHead(200, { "content-type": types[p.slice(p.lastIndexOf("."))] ?? "application/octet-stream" });
      return res.end(body);
    }
    if (p === "/") { res.writeHead(302, { location: "/watch/ep1/test-episode?ep=1" }); return res.end(); }
    res.writeHead(404); res.end();
  } catch (e) {
    log(500, req, e.message);
    res.writeHead(e.code === "ENOENT" ? 404 : 500); res.end();
  }
}).listen(PORT, "127.0.0.1", () => console.log(`stream-gate on ${ORIGIN}/  (GATE=${GATE})`));
