// GET /api/pulse: aggregate project numbers for the hidden /pulse page.
// Stars, forks and open issues from the source repo, plus installer download
// counts per release from the public releases repo.
//
// Visitors' browsers never call GitHub: the same rule the changelog endpoint
// follows, so reading this page does not hand anyone's IP to a third party.
// Everything here is a project-wide total. Nothing is per-user, and the page
// that renders it shows no more than this returns.
//
// Failure is not an error: a missing piece comes back null or empty and the
// page omits that card.

const SOURCE_REPO = "ThembaTman0/apex-download-manager";
const RELEASES_REPO = "ThembaTman0/apex-download-manager-releases";
const CACHE_TTL_MS = 5 * 60 * 1000;

// Warm-lambda cache; unauthenticated GitHub rate limits are shared across
// Vercel's egress IPs, so don't ask on every page load.
let cache = { at: 0, data: null };

function headers() {
  const h = {
    "User-Agent": "apex-download-manager-site",
    Accept: "application/vnd.github+json",
  };
  // Optional: raises the API rate limit from 60/hr (shared IP) to 5000/hr.
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function gh(path) {
  const res = await fetch(`https://api.github.com/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return res.json();
}

/** Installers only: the updater's latest.json and the .sig files are not downloads. */
function isInstaller(name) {
  return /\.(exe|msi)$/i.test(name);
}

async function repoFacts() {
  const r = await gh(`repos/${SOURCE_REPO}`);

  // The repo object's open_issues_count counts pull requests as issues, so
  // it reads high and means nothing on its own. The issues list has the same
  // quirk, but each pull request carries a pull_request key to filter on.
  // Capped at 100: past that the count would silently under-report, so say so
  // rather than print a confident wrong number.
  let openIssues = null;
  let more = false;
  try {
    const list = await gh(
      `repos/${SOURCE_REPO}/issues?state=open&per_page=100`,
    );
    openIssues = list.filter((i) => !i.pull_request).length;
    more = list.length === 100;
  } catch {
    // Leave it null; the page omits the figure rather than guessing.
  }

  return {
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    openIssues,
    openIssuesCapped: more,
  };
}

async function releaseFacts() {
  const list = await gh(`repos/${RELEASES_REPO}/releases?per_page=30`);
  return list
    .filter((r) => !r.draft)
    .map((r) => {
      const assets = (r.assets || []).filter((a) => isInstaller(a.name));
      const sum = (re) =>
        assets
          .filter((a) => re.test(a.name))
          .reduce((n, a) => n + (a.download_count || 0), 0);
      const exe = sum(/\.exe$/i);
      const msi = sum(/\.msi$/i);
      return {
        version: (r.tag_name || "").replace(/^v/, ""),
        published: r.published_at || null,
        exe,
        msi,
        total: exe + msi,
      };
    })
    .filter((r) => r.version);
}

export default async function handler(req, res) {
  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(cache.data);
    return;
  }

  // Settled rather than all: stars failing should not cost us the releases.
  const [repoResult, releaseResult] = await Promise.allSettled([
    repoFacts(),
    releaseFacts(),
  ]);

  const data = {
    repo: repoResult.status === "fulfilled" ? repoResult.value : null,
    releases: releaseResult.status === "fulfilled" ? releaseResult.value : [],
    updated: new Date().toISOString(),
  };

  // Only cache a useful answer, so a rate-limited minute does not pin an
  // empty payload in the lambda for the next five.
  if (data.repo || data.releases.length) cache = { at: Date.now(), data };

  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(data);
}
