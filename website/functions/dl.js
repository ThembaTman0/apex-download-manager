// GET /dl: bumps an anonymous total-downloads counter, then 302s to the
// latest Windows installer on GitHub Releases. No IP, country, or any other
// request data is read or stored; the desktop app itself stays telemetry-free.

const REPO = "ThembaTman0/apex-download-manager";
const ASSET_CACHE_KEY = "latest_asset_url";
const ASSET_CACHE_TTL_SECONDS = 300;
const TOTAL_KEY = "downloads:total";

async function resolveInstallerUrl(env) {
  const cached = await env.STATS.get(ASSET_CACHE_KEY);
  if (cached) return cached;

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { "User-Agent": "apex-download-manager-site", Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const release = await res.json();

  const assets = release.assets || [];
  const installer =
    assets.find((a) => /x64-setup\.exe$/i.test(a.name)) ||
    assets.find((a) => /\.exe$/i.test(a.name)) ||
    assets.find((a) => /\.msi$/i.test(a.name));
  if (!installer) throw new Error("No installer asset found on latest release");

  await env.STATS.put(ASSET_CACHE_KEY, installer.browser_download_url, {
    expirationTtl: ASSET_CACHE_TTL_SECONDS,
  });
  return installer.browser_download_url;
}

async function recordDownload(env) {
  const current = await env.STATS.get(TOTAL_KEY);
  const next = (current ? parseInt(current, 10) : 0) + 1;
  await env.STATS.put(TOTAL_KEY, String(next));
}

export async function onRequest(context) {
  const { env, waitUntil } = context;

  waitUntil(recordDownload(env));

  try {
    const url = await resolveInstallerUrl(env);
    return Response.redirect(url, 302);
  } catch (err) {
    return new Response(
      `Couldn't reach the latest release. Please try the GitHub Releases page directly: https://github.com/${REPO}/releases/latest`,
      { status: 502 }
    );
  }
}
