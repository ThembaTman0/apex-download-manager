import { Analytics } from "@vercel/analytics/react";
import {
  CHROME_EXT_URL,
  EDGE_EXT_URL,
  FIREFOX_ADDON_URL,
} from "./lib/latestRelease";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import WorksWith from "./components/WorksWith";
import Principles from "./components/Principles";
import Chapter from "./components/Chapter";
import EngineViz from "./components/EngineViz";
import BenchmarkViz from "./components/BenchmarkViz";
import CaptureFlow from "./components/CaptureFlow";
import VideoGrab from "./components/VideoGrab";
import SafetyViz from "./components/SafetyViz";
import Changelog from "./components/Changelog";
import Faq from "./components/Faq";
import DownloadCta from "./components/DownloadCta";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <WorksWith />
        <Principles />
        <Chapter
          id="engine"
          title={["Thirty-two connections,", "one file"]}
          body="Every file is split into up to 32 ranges, all written into one preallocated file. A connection that finishes early takes over half of the largest range left, so the tail never crawls."
          visual={<EngineViz />}
          features={[
            "Up to 32 connections per file",
            "Dynamic range re-splitting",
            "Resume from the exact byte",
            "ETag and If-Range resume checks",
            "Queue with a concurrency limit",
            "Speed limits and scheduling",
          ]}
        />
        <Chapter
          id="benchmark"
          title={["Measured,", "not claimed"]}
          body="One 756 MB file, downloaded twice on the same idle line: once over a single connection, the way a browser does it, then once with Apex. The Apex timing is read from the app's own database."
          visual={<BenchmarkViz />}
          features={[
            "1.36x faster on a throttled mirror",
            "49 seconds saved on 756 MB",
            "80 ranges after re-splitting",
            "No gain when your line is the limit",
            "Single run per arm, back to back",
            "Re-runnable: the method is published",
          ]}
        />
        <Chapter
          id="capture"
          title={["From your browser", "to Apex"]}
          body="Click a download like you always do. The extension hands it to Apex before any Save As dialog, and if Apex isn't running, the browser simply downloads it as usual."
          links={[
            { href: CHROME_EXT_URL, label: "Chrome and Brave", external: true },
            { href: EDGE_EXT_URL, label: "Edge", external: true },
            { href: FIREFOX_ADDON_URL, label: "Firefox", external: true },
          ]}
          visual={<CaptureFlow />}
          features={[
            "Chrome, Edge, Brave and Firefox",
            "Right-click: Download with Apex",
            "Always allow, per host",
            "Duplicate and disk space checks",
            "Clipboard watcher",
            "Local, token-gated hand-off",
          ]}
        />
        <Chapter
          id="video"
          title={["Videos, with", "their subtitles"]}
          body="Paste a video page and pick a quality, from the best available down to audio only. Subtitles come along in your language, embedded when FFmpeg is installed."
          visual={<VideoGrab />}
          features={[
            "YouTube and other sites via yt-dlp",
            "Whole playlists, or a selection",
            "Subtitle tracks by language",
            "Audio-only downloads",
            "One-click yt-dlp and FFmpeg setup",
            "Signed-in retry, only when you ask",
          ]}
        />
        <Chapter
          id="safety"
          title={["The browser's checks,", "kept"]}
          body="External download tools usually skip the checks your browser performs. Apex marks every file as coming from the internet, and can check it against the publisher's hash."
          link={{ href: "/privacy.html", label: "Read the privacy policy" }}
          visual={<SafetyViz />}
          features={[
            "Mark of the Web on every file",
            "SHA-256 verification",
            "Plain HTTP links flagged",
            "Changed-file detection on resume",
            "Extension reads no page content",
            "No account, ads or telemetry",
          ]}
        />
        <Changelog />
        <Faq />
        <DownloadCta />
      </main>
      <Footer />
      <Analytics />
    </>
  );
}
