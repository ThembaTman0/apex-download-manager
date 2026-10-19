import { useEffect, useState } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";

/** The one host whose numbers we actually want. */
const PRODUCTION_HOST = "apexdownloadmanager.com";

/**
 * Global Privacy Control and Do Not Track are the visitor saying, in the only
 * way a browser offers, that they would rather not be counted. Honouring them
 * costs a few page views and is the whole point of measuring this quietly.
 *
 * Neither property exists on the server, and the page is prerendered, so this
 * can only be read in the browser. It is also not worth re-reading: a visitor
 * does not toggle GPC mid-visit.
 */
function visitorDeclined(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

/**
 * Preview deployments and localhost would otherwise fold our own testing into
 * the real numbers. Checking the host rather than a build variable means this
 * keeps working without any Vercel env wiring, and a preview of this very
 * commit stays silent.
 */
function isProductionSite(): boolean {
  const { hostname } = window.location;
  return hostname === PRODUCTION_HOST || hostname === `www.${PRODUCTION_HOST}`;
}

/**
 * Query strings and fragments can carry anything a link author put there,
 * including identifiers from a campaign URL someone pasted. We want to know
 * which page was read, never how the reader got labelled, so only the path
 * survives.
 */
function pathOnly(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const u = new URL(event.url);
    // /pulse reads the numbers this site collects. Counting visits to it
    // would fold our own checking into the figures being checked. It mounts
    // its own root rather than App, so it never loads this component in the
    // first place; this is the belt to that pair of braces.
    if (u.pathname === "/pulse" || u.pathname.startsWith("/pulse/")) return null;
    return { ...event, url: u.origin + u.pathname };
  } catch {
    // A URL we cannot parse is one we cannot sanitise, so drop the event.
    return null;
  }
}

/**
 * Renders nothing until hydration has run, so the prerendered markup is
 * identical with and without analytics, and nothing is decided on the server.
 */
export default function SiteAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isProductionSite() && !visitorDeclined()) setAllowed(true);
  }, []);

  if (!allowed) return null;
  return <Analytics beforeSend={pathOnly} />;
}
