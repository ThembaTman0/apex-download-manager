import { useEffect, useState } from "react";

/** Subset of /api/stats consumed by version/size/counter displays. */
export interface LatestRelease {
  version?: string;
  sizeMb?: number;
  total?: number;
  /** Installer asset name, e.g. Apex.Download.Manager_1.0.9_x64-setup.exe. */
  fileName?: string;
  /** SHA-256 of that installer, straight from the release asset's digest. */
  sha256?: string;
}

/** One entry of /api/changelog. */
export interface ChangelogEntry {
  version: string;
  date: string;
  url: string;
  headline: string;
  teaser: string;
}

/**
 * Static fallbacks, shared by every place that prints them, so the page can
 * never disagree with itself while the API is slow or unreachable.
 * 4 MB matches the real installer (about 4.0 MiB for 1.0.x).
 */
export const FALLBACK_VERSION = "1.0.9";
export const FALLBACK_SIZE_MB = 4;

export const RELEASES_URL =
  "https://github.com/ThembaTman0/apex-download-manager-releases/releases";
export const ISSUES_URL =
  "https://github.com/ThembaTman0/apex-download-manager-releases/issues";
export const REPO_URL =
  "https://github.com/ThembaTman0/apex-download-manager-releases";
/** Published extension listings. Brave installs the Chrome one. */
export const CHROME_EXT_URL =
  "https://chromewebstore.google.com/detail/apex-download-manager/gopdilekdjnfekbmhedjidlmaahnnhco";
export const EDGE_EXT_URL =
  "https://microsoftedge.microsoft.com/addons/detail/apex-download-manager/bjpggfmgbhafacbcmhpncjaapdknohjg";
export const FIREFOX_ADDON_URL =
  "https://addons.mozilla.org/en-US/firefox/addon/apex-download-manager/";

function once<T>(url: string, fallback: T): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) {
      pending = fetch(url)
        .then((r) =>
          r.ok && (r.headers.get("content-type") ?? "").includes("json")
            ? (r.json() as Promise<T>)
            : fallback,
        )
        .catch(() => fallback);
    }
    return pending;
  };
}

// One fetch per endpoint, shared by every consumer on the page.
const loadStats = once<LatestRelease>("/api/stats", {});
const loadChangelog = once<ChangelogEntry[]>("/api/changelog", []);

function useLoaded<T>(load: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let cancelled = false;
    load().then((d) => {
      if (!cancelled) setValue(d);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);
  return value;
}

/**
 * Latest released version, installer size and anonymous download total.
 * Empty until the API answers (or forever if it can't): callers use the
 * FALLBACK_* constants so the page never shows a hole.
 */
export function useLatestRelease(): LatestRelease {
  return useLoaded(loadStats, {});
}

/** Newest releases with notes, or [] (callers hide themselves). */
export function useChangelog(): ChangelogEntry[] | null {
  const list = useLoaded<ChangelogEntry[] | null>(loadChangelog, null);
  return Array.isArray(list) ? list : list === null ? null : [];
}
