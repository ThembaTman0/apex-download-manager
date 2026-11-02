import { useEffect, useState } from "react";

/** Which download the page leads with. */
export type Platform = "windows" | "linux" | "mobile";

/**
 * Best guess at the visitor's OS. Phones and tablets can't run either
 * build, so they get pointed at the download section instead. Anything
 * unrecognised (macOS included) falls back to Windows, the common case.
 * `?platform=windows|linux|mobile` forces one, for QA and screenshots.
 */
export function detectPlatform(): Platform {
  const forced = new URLSearchParams(window.location.search).get("platform");
  if (forced === "windows" || forced === "linux" || forced === "mobile") return forced;

  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  const iPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (iPad || /Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return "mobile";
  if (/Linux|X11/.test(ua)) return "linux";
  return "windows";
}

/**
 * The page is prerendered without a browser, so it renders the Windows
 * version first and switches after hydration. Only Linux and phone
 * visitors see it change, once, right as the page loads.
 */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("windows");
  useEffect(() => setPlatform(detectPlatform()), []);
  return platform;
}
