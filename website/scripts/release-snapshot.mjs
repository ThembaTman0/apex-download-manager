// Writes src/lib/release-snapshot.json from the newest published installer,
// so the version, size and hash baked into the page are the ones that were
// current when the site was built.
//
// These values used to be constants edited by hand, which meant the served
// HTML and the JSON-LD kept whatever version someone last remembered to set.
// Readers with JavaScript never saw it, because the page fetches /api/stats
// and corrects itself, but crawlers and anyone without scripting did.
//
// A failure here is not a build failure: the committed snapshot stays and the
// page is no more wrong than it was before. Offline builds work for the same
// reason.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = "ThembaTman0/apex-download-manager-releases";
const out = fileURLToPath(new URL("../src/lib/release-snapshot.json", import.meta.url));

function committed() {
  try {
    return JSON.parse(readFileSync(out, "utf8"));
  } catch {
    return null;
  }
}

const headers = {
  "User-Agent": "apex-download-manager-site",
  Accept: "application/vnd.github+json",
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

try {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers,
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const release = await res.json();

  const installer = (release.assets || []).find((a) => /x64-setup\.exe$/i.test(a.name));
  if (!installer) throw new Error("no x64 installer on the latest release");

  const snapshot = {
    version: (release.tag_name || "").replace(/^v/, ""),
    sizeMb: Math.max(1, Math.round(installer.size / 1048576)),
    fileName: installer.name,
    // GitHub publishes each asset's digest as "sha256:<hex>".
    sha256:
      typeof installer.digest === "string"
        ? installer.digest.replace(/^sha256:/, "")
        : null,
    capturedAt: new Date().toISOString(),
  };
  if (!snapshot.version) throw new Error("release has no tag name");

  const before = committed();
  writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `release snapshot: ${snapshot.version}, ${snapshot.sizeMb} MB${
      before && before.version !== snapshot.version ? ` (was ${before.version})` : ""
    }`,
  );
} catch (err) {
  const before = committed();
  if (!before) {
    throw new Error(
      `release snapshot: the lookup failed and there is no committed file to fall back on: ${err.message}`,
    );
  }
  console.warn(
    `release snapshot: keeping ${before.version} from the committed file (${err.message})`,
  );
}
