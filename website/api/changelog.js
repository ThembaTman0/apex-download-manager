// GET /api/changelog: the three newest public releases, trimmed to what the
// site's changelog strip shows: [{ version, date, url, headline, teaser }].
// Fetched server-side so visitors' browsers never talk to GitHub directly,
// and cached per warm lambda to stay far below the anonymous rate limit.
// Serves [] when GitHub is unreachable; the site then hides the section.

const REPO = "ThembaTman0/apex-download-manager-releases";
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache = { at: 0, entries: null };

/** Strip markdown emphasis/link syntax down to plain text. */
function plain(s) {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Release notes follow one shape: a teaser line, then "**New**" and bullets
 * of the form "- Short title. Longer explanation". The headline is the first
 * bullet's title (the most prominent new thing); the teaser is the first
 * content line, exactly as the in-app update toast picks it.
 */
function summarize(body) {
  const lines = (body || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let teaser = "";
  for (const l of lines) {
    const t = plain(l.replace(/^(#+|[-*+]|\d+\.)\s*/, ""));
    if (t && !/^(new|improvements?( & fixes)?|fixes|security)$/i.test(t)) {
      teaser = t;
      break;
    }
  }
  let headline = "";
  const bullet = lines.find((l) => /^[-*+]\s+/.test(l));
  if (bullet) {
    const text = plain(bullet.replace(/^[-*+]\s+/, ""));
    const first = text.split(/(?<=[.!?:])\s/)[0].replace(/[.:]$/, "");
    if (first.length >= 8 && first.length <= 60) headline = first;
  }
  if (!headline && teaser) {
    // Terse notes ("Responsive toolbar (icon-only ...), fix for ...") lead
    // with their subject: use the first clause when it reads as a title.
    const clause = teaser.split(/\s*[(,;:.]\s*/)[0].trim();
    if (clause.length >= 8 && clause.length <= 48) headline = clause;
  }
  return { headline, teaser: clip(teaser, 110) };
}

/** Shorten at a word boundary, never mid-word. */
function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return `${cut.slice(0, at > 40 ? at : max).replace(/[\s,;:(-]+$/, "")}…`;
}

async function releases() {
  if (cache.entries && Date.now() - cache.at < CACHE_TTL_MS) return cache.entries;
  const headers = {
    "User-Agent": "apex-download-manager-site",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`, {
    headers,
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const list = await res.json();
  const entries = list
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => ({
      version: (r.tag_name || "").replace(/^v/, ""),
      date: r.published_at,
      url: r.html_url,
      ...summarize(r.body),
    }))
    // Show only releases with notes and a real title.
    .filter((e) => e.version && e.teaser && e.headline)
    .slice(0, 3);
  cache = { at: Date.now(), entries };
  return entries;
}

export default async function handler(req, res) {
  let entries = [];
  try {
    entries = await releases();
  } catch {
    // Serve an empty list; the changelog strip is optional.
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(entries);
}
