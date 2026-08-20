// GET /api/stats: anonymous totals plus the latest release's version and
// installer size, { total, updated, version?, sizeMb? }.
// Nothing per-user or per-region is stored, so nothing more can be served.
// Returns { total: 0 } until a KV database is connected; the site hides
// the counter when the total is 0. version/sizeMb are omitted when the
// GitHub API is unreachable - the site falls back to static text.

const REPO = "ThembaTman0/apex-download-manager-releases";
const RELEASE_CACHE_TTL_MS = 5 * 60 * 1000;

// Warm-lambda cache; unauthenticated GitHub rate limits are shared across
// Vercel's egress IPs, so don't ask on every stats poll.
let releaseCache = { at: 0, version: null, sizeMb: null };

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
  };
  return releaseCache;
}

export default async function handler(req, res) {
  let total = 0;

  // Accept both naming schemes: Vercel-KV style and the Upstash
  // marketplace integration's defaults.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const r = await fetch(`${url}/get/downloads:total`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      total = data.result ? parseInt(data.result, 10) : 0;
    } catch {
      // Serve 0 rather than an error; the counter is decorative.
    }
  }

  let version = null;
  let sizeMb = null;
  try {
    ({ version, sizeMb } = await latestRelease());
  } catch {
    // Omitted from the response; the site keeps its static fallback.
  }

  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({
    total,
    updated: new Date().toISOString(),
    ...(version && { version }),
    ...(sizeMb && { sizeMb }),
  });
}
