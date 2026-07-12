// GET /dl (rewritten from /dl via vercel.json): bumps an anonymous
// total-downloads counter, then 302s to the latest Windows installer on
// GitHub Releases. No IP, country, or any other request data is read or
// stored; the desktop app itself stays telemetry-free.
//
// Counting is optional: it only happens when an Upstash/Vercel KV REST
// database is connected (KV_REST_API_URL + KV_REST_API_TOKEN env vars).
// Without it, /dl still redirects — you just lose the counter.

// The public releases-only repo; the app's source repo is private.
const REPO = "ThembaTman0/apex-download-manager-releases";
const ASSET_CACHE_TTL_MS = 5 * 60 * 1000;

// Warm-lambda cache so we don't hit the GitHub API on every click
// (unauthenticated rate limits are shared across Vercel's egress IPs).
let cached = { url: null, at: 0 };

async function resolveInstallerUrl() {
  if (cached.url && Date.now() - cached.at < ASSET_CACHE_TTL_MS) {
    return cached.url;
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

  cached = { url: installer.browser_download_url, at: Date.now() };
  return installer.browser_download_url;
}

async function recordDownload() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;
  await fetch(`${url}/incr/downloads:total`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export default async function handler(req, res) {
  // Serverless work can't outlive the response, so count before redirecting.
  try {
    await recordDownload();
  } catch {
    // Counting must never block a download.
  }

  try {
    const url = await resolveInstallerUrl();
    res.redirect(302, url);
  } catch {
    // No release yet, rate-limited, or GitHub is down: the releases page
    // always exists and lets the visitor grab the file manually.
    res.redirect(302, `https://github.com/${REPO}/releases/latest`);
  }
}
