// GET /api/stats: anonymous totals plus the latest release's version,
// installer size, file name and SHA-256,
// { total, today, thisVersion?, updated, version?, sizeMb?, fileName?, sha256? }.
// Nothing per-user or per-region is stored, so nothing more can be served.
// `today` is this UTC day's /dl count and `thisVersion` is the running count
// for the current release; both are plain integers written by /dl.
//
// `days` is the daily series, oldest first, so a campaign can be read against
// the day it ran. 14 days by default; ?days=N serves 1 to 60. Buckets began on
// 2026-10-12, and days before that, or with no clicks, are absent from KV and
// reported as 0.
// Returns { total: 0 } until a KV database is connected; the site hides
// the counter when the total is 0. version/sizeMb are omitted when the
// GitHub API is unreachable - the site falls back to static text.

const REPO = "ThembaTman0/apex-download-manager-releases";
const RELEASE_CACHE_TTL_MS = 5 * 60 * 1000;

// Warm-lambda cache; unauthenticated GitHub rate limits are shared across
// Vercel's egress IPs, so don't ask on every stats poll.
let releaseCache = { at: 0, version: null, sizeMb: null, fileName: null, sha256: null };

async function latestRelease() {
  if (releaseCache.version && Date.now() - releaseCache.at < RELEASE_CACHE_TTL_MS) {
    return releaseCache;
  }
  const headers = {
    "User-Agent": "apex-download-manager-site",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers,
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const release = await res.json();
  const installer = (release.assets || []).find((a) =>
    /x64-setup\.exe$/i.test(a.name)
  );
  releaseCache = {
    at: Date.now(),
    version: (release.tag_name || "").replace(/^v/, "") || null,
    sizeMb: installer ? Math.max(1, Math.round(installer.size / 1048576)) : null,
    fileName: installer ? installer.name : null,
    // GitHub publishes each asset's digest as "sha256:<hex>". Serving it
    // here means the hash on the page always matches the file /dl hands out.
    sha256:
      installer && typeof installer.digest === "string"
        ? installer.digest.replace(/^sha256:/, "")
        : null,
  };
  return releaseCache;
}

export default async function handler(req, res) {
  let total = 0;
  let today = 0;
  let thisVersion = null;
  let days = [];

  // Bounded so the MGET path cannot be grown without limit by a query string.
  const requested = parseInt((req.query && req.query.days) || "", 10);
  const window = Math.min(Math.max(Number.isNaN(requested) ? 14 : requested, 1), 60);

  // UTC throughout, matching the keys /dl writes.
  const dates = [];
  for (let i = window - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Accept both naming schemes: Vercel-KV style and the Upstash
  // marketplace integration's defaults.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  let version = null;
  let sizeMb = null;
  let fileName = null;
  let sha256 = null;
  try {
    ({ version, sizeMb, fileName, sha256 } = await latestRelease());
  } catch {
    // Omitted from the response; the site keeps its static fallback.
  }

  if (url && token) {
    try {
      // One MGET for the lot. Keys that were never written come back null,
      // which reads as 0: a quiet day simply has no key yet.
      const keys = ["downloads:total"];
      if (version) keys.push(`downloads:version:${version}`);
      const firstDay = keys.length;
      for (const d of dates) keys.push(`downloads:day:${d}`);

      const r = await fetch(`${url}/mget/${keys.join("/")}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      const vals = Array.isArray(data.result) ? data.result : [];
      const num = (v) => (v ? parseInt(v, 10) || 0 : 0);

      total = num(vals[0]);
      if (version) thisVersion = num(vals[1]);
      days = dates.map((date, i) => ({ date, count: num(vals[firstDay + i]) }));
      today = days.length ? days[days.length - 1].count : 0;
    } catch {
      // Serve 0 rather than an error; the counter is decorative.
    }
  }

  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({
    total,
    today,
    ...(thisVersion !== null && { thisVersion }),
    days,
    updated: new Date().toISOString(),
    ...(version && { version }),
    ...(sizeMb && { sizeMb }),
    ...(fileName && { fileName }),
    ...(sha256 && { sha256 }),
  });
}
