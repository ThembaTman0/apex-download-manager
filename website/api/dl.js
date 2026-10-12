// GET /dl (rewritten from /dl via vercel.json): bumps anonymous counters,
// then 302s to the latest Windows installer on GitHub Releases. No IP,
// country, or any other request data is read or stored; the desktop app
// itself stays telemetry-free.
//
// Three keys are incremented, all plain integers that describe the request
// and never the requester: a running total, one per UTC day, and one per
// release version. A day bucket answers "is anything we do moving this",
// which a single lifetime total cannot, and a version bucket shows how fast
// a new release is picked up. Nothing here can single out a person, so the
// privacy policy's claims hold as written.
//
// These count redirects issued, not downloads completed. The file travels
// from GitHub's CDN straight to the visitor and never touches this server,
// so completion is not observable from here. Treat the numbers as an upper
// bound on intent: bots that follow the redirect are counted too.
//
// Counting is optional: it only happens when an Upstash/Vercel KV REST
// database is connected (KV_REST_API_URL + KV_REST_API_TOKEN env vars).
// Without it, /dl still redirects - you just lose the counter.

// The public releases-only repo; the app's source repo is private.
const REPO = "ThembaTman0/apex-download-manager-releases";
const ASSET_CACHE_TTL_MS = 5 * 60 * 1000;

// Warm-lambda cache so we don't hit the GitHub API on every click
// (unauthenticated rate limits are shared across Vercel's egress IPs).
let cached = { url: null, version: null, at: 0 };

async function resolveInstaller() {
  if (cached.url && Date.now() - cached.at < ASSET_CACHE_TTL_MS) {
    return cached;
  }

  const headers = {
    "User-Agent": "apex-download-manager-site",
    Accept: "application/vnd.github+json",
  };
  // Optional: raises the API rate limit from 60/hr (shared IP) to 5000/hr.
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers,
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const release = await res.json();

  const assets = release.assets || [];
  const installer =
    assets.find((a) => /x64-setup\.exe$/i.test(a.name)) ||
    assets.find((a) => /\.exe$/i.test(a.name)) ||
    assets.find((a) => /\.msi$/i.test(a.name));
  if (!installer) throw new Error("No installer asset found on latest release");

  cached = {
    url: installer.browser_download_url,
    version: (release.tag_name || "").replace(/^v/, "") || null,
    at: Date.now(),
  };
  return cached;
}

async function recordDownload(version) {
  // Accept both naming schemes: Vercel-KV style and the Upstash
  // marketplace integration's defaults.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  // UTC, so a day bucket means the same thing wherever the lambda runs.
  const day = new Date().toISOString().slice(0, 10);
  const commands = [
    ["INCR", "downloads:total"],
    ["INCR", `downloads:day:${day}`],
  ];
  // Only when the release lookup succeeded; a key named "null" helps nobody.
  if (version) commands.push(["INCR", `downloads:version:${version}`]);

  // One pipelined round trip: three separate fetches would add latency to
  // every download click, and the redirect waits on this.
  await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
}

export default async function handler(req, res) {
  // Resolve first so the counters can name the version, but never let a
  // failed lookup cost the visitor their download.
  let target = null;
  let version = null;
  try {
    ({ url: target, version } = await resolveInstaller());
  } catch {
    // No release yet, rate-limited, or GitHub is down: fall back below.
  }

  // Serverless work can't outlive the response, so count before redirecting.
  try {
    await recordDownload(version);
  } catch {
    // Counting must never block a download.
  }

  // The releases page always exists and lets the visitor grab the file by
  // hand when the asset lookup failed.
  res.redirect(302, target || `https://github.com/${REPO}/releases/latest`);
}
