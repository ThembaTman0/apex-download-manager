#!/usr/bin/env node
// Crash-resume test: proves a download survives being killed at random
// moments and still finishes byte-for-byte correct.
//
// 1. Serves a deterministic file (Range + ETag, throttled) on 127.0.0.1.
// 2. Runs Apex in portable mode from a temp folder, built with the
//    `crash-test` feature so it adds/resumes the test URL at startup.
// 3. Force-kills it (no clean shutdown) at random points, N times.
// 4. Lets it finish, then checks the SHA-256 and that no .adm temp is left.
//
// Build first:  cd src-tauri; cargo build --features crash-test
// Run:          node scripts/crash-resume-test.mjs [--kills 8] [--size-mb 256]
//               [--rate-mb 6] [--exe path] [--seed n]
// Quit any running Apex first: single-instance would hand the test off to it.

import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, writeFileSync, existsSync, readdirSync, statSync, createReadStream, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]]);
    return acc;
  }, []),
);
// --flaky-if-range: answer the resume check (Range: bytes=0-0 + If-Range) with
// a full 200 for the SAME file, like a CDN edge that ignores If-Range. Apex
// must keep its progress instead of starting over after every kill.
const FLAKY = process.argv.includes("--flaky-if-range");
let flakyAnswers = 0;
let fromZero = 0;
const KILLS = Number(args.kills ?? 8);
const SIZE = Number(args["size-mb"] ?? 256) * 1024 * 1024;
const RATE = Number(args["rate-mb"] ?? 6) * 1024 * 1024; // bytes/s, all connections
let seed = Number(args.seed ?? Date.now() % 1e9);
const exeName = process.platform === "win32" ? "apex-download-manager.exe" : "apex-download-manager";
const EXE = args.exe ?? join(here, "..", "src-tauri", "target", "debug", exeName);
const ETAG = '"apex-crash-v1"';
const BLOCK = 64 * 1024;

// Seeded PRNG for kill timing, printed so a failure can be replayed.
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

// Block k's bytes depend only on k, so any range can be generated on demand.
function block(k) {
  const buf = Buffer.allocUnsafe(BLOCK);
  let x = (k * 2654435761 + 1) >>> 0 || 1;
  for (let i = 0; i < BLOCK; i += 4) {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    buf.writeUInt32LE(x, i);
  }
  return buf;
}

function expectedHash() {
  const h = createHash("sha256");
  for (let off = 0; off < SIZE; off += BLOCK) {
    const b = block(off / BLOCK);
    h.update(off + BLOCK > SIZE ? b.subarray(0, SIZE - off) : b);
  }
  return h.digest("hex");
}

// Global throttle so each run lasts long enough for kills to land mid-transfer.
let sent = 0;
let t0 = Date.now(); // reset when the server starts listening
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function throttle(n) {
  sent += n;
  const due = (sent / RATE) * 1000 - (Date.now() - t0);
  if (due > 0) await sleep(due);
}

const server = createServer(async (req, res) => {
  if (!req.url.startsWith("/blob.bin")) return res.writeHead(404).end();
  let start = 0, end = SIZE - 1, partial = false;
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const ifRange = req.headers["if-range"];
  const flakyCheck = FLAKY && ifRange && req.headers.range === "bytes=0-0";
  if (flakyCheck) flakyAnswers++;
  // A real data request for the start of the file (not a 1-byte probe or
  // check). The first run makes one; every progress reset makes another.
  if (range && Number(range[1]) === 0 && req.headers.range !== "bytes=0-0") fromZero++;
  if (range && !flakyCheck && (!ifRange || ifRange === ETAG)) {
    start = Number(range[1]);
    end = range[2] ? Math.min(Number(range[2]), SIZE - 1) : SIZE - 1;
    if (start > end) return res.writeHead(416, { "Content-Range": `bytes */${SIZE}` }).end();
    partial = true;
  }
  const headers = {
    "Content-Type": "application/octet-stream",
    "Content-Length": end - start + 1,
    "Accept-Ranges": "bytes",
    ETag: ETAG,
  };
  if (partial) headers["Content-Range"] = `bytes ${start}-${end}/${SIZE}`;
  res.writeHead(partial ? 206 : 200, headers);
  if (req.method === "HEAD") return res.end();
  let closed = false;
  res.on("close", () => (closed = true));
  let off = start;
  while (off <= end && !closed) {
    const k = Math.floor(off / BLOCK);
    const b = block(k).subarray(off - k * BLOCK, Math.min(BLOCK, end - k * BLOCK + 1));
    if (!res.write(b)) {
      await new Promise((r) => {
        const done = () => { res.off("drain", done); res.off("close", done); r(); };
        res.on("drain", done).on("close", done);
      });
    }
    off += b.length;
    await throttle(b.length);
  }
  res.end();
});

function killTree(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32") {
    try { execFileSync("taskkill", ["/F", "/T", "/PID", String(child.pid)], { stdio: "ignore" }); } catch {}
  } else {
    child.kill("SIGKILL");
  }
}

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const h = createHash("sha256");
    createReadStream(path).on("data", (d) => h.update(d)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
  });
}

async function main() {
  if (!existsSync(EXE)) throw new Error(`No Apex build at ${EXE}. Run: cargo build --features crash-test`);
  console.log(`seed ${seed}, ${KILLS} kills, ${SIZE / 1048576} MB at ${RATE / 1048576} MB/s`);
  const want = expectedHash();

  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t0 = Date.now();
  const url = `http://127.0.0.1:${server.address().port}/blob.bin`;

  const work = mkdtempSync(join(tmpdir(), "apex-crash-"));
  const exe = join(work, exeName);
  copyFileSync(EXE, exe);
  writeFileSync(join(work, "portable"), "");
  const out = join(work, "out");
  const target = join(out, "blob.bin");
  const env = { ...process.env, APEX_CRASH_TEST_URL: url, APEX_CRASH_TEST_DIR: out };
  const launch = () => spawn(exe, ["--minimized"], { env, stdio: "ignore" });

  let kills = 0;
  for (let i = 0; i < KILLS && !existsSync(target); i++) {
    const child = launch();
    await sleep(1500 + rand() * 3000);
    if (existsSync(target)) { killTree(child); break; }
    const before = sent;
    killTree(child);
    await new Promise((r) => (child.exitCode !== null ? r() : child.once("exit", r)));
    kills++;
    console.log(`kill ${kills}: ~${(before / 1048576).toFixed(1)} MB served so far`);
    await sleep(300);
  }

  const child = launch();
  const deadline = Date.now() + (SIZE / RATE) * 1000 * 3 + 60_000;
  while (!existsSync(target) && Date.now() < deadline) await sleep(250);
  await sleep(1000); // let the completion write settle
  killTree(child);
  server.close();

  const fail = (msg) => { console.error(`FAIL: ${msg}\nwork dir kept: ${work}`); process.exit(1); };
  if (!existsSync(target)) fail("the download never completed");
  if (kills === 0) fail("no kill landed mid-download; lower --rate-mb or raise --size-mb");
  const leftovers = readdirSync(out).filter((f) => f.endsWith(".adm"));
  if (leftovers.length) fail(`temp file left behind: ${leftovers.join(", ")}`);
  if (statSync(target).size !== SIZE) fail(`size ${statSync(target).size}, expected ${SIZE}`);
  const got = await sha256File(target);
  if (got !== want) fail(`SHA-256 mismatch\n  want ${want}\n  got  ${got}`);

  if (FLAKY) {
    // Each progress reset makes Apex ask for the start of the file again.
    console.log(`flaky If-Range answers: ${flakyAnswers}, downloads started from byte 0: ${fromZero}, served ${((sent / SIZE) * 100).toFixed(0)}% of the file size`);
    if (flakyAnswers === 0) fail("the resume check was never exercised");
    if (fromZero > 1) fail(`started from byte 0 ${fromZero} times: progress was thrown away on resume`);
  }
  console.log(`PASS: survived ${kills} kills, SHA-256 ${got}`);
  rmSync(work, { recursive: true, force: true });
}

main().catch((e) => { console.error(e); process.exit(1); });
