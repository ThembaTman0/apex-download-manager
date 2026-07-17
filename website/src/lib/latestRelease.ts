import { useEffect, useState } from "react";

/** Subset of /api/stats consumed by version/size displays. */
export interface LatestRelease {
  version?: string;
  sizeMb?: number;
}

// One fetch shared by every consumer on the page.
let pending: Promise<LatestRelease> | null = null;

function load(): Promise<LatestRelease> {
  if (!pending) {
    pending = fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return pending;
}

/**
 * Latest released version and installer size from /api/stats.
 * Empty until the API answers (or forever if it can't) — callers keep a
 * static fallback so the page never shows a hole.
 */
export function useLatestRelease(): LatestRelease {
  const [release, setRelease] = useState<LatestRelease>({});
  useEffect(() => {
    let cancelled = false;
    load().then((d) => {
      if (!cancelled) setRelease(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return release;
}
