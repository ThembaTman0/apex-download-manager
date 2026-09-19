import { Reveal } from "../lib/reveal";
import {
  FALLBACK_SIZE_MB,
  FALLBACK_VERSION,
  RELEASES_URL,
  useChangelog,
  useLatestRelease,
} from "../lib/latestRelease";
import AppMockup from "./AppMockup";
import CaptureCard from "./CaptureCard";
import { ArrowRight, DownloadIcon } from "./icons";

export default function Hero() {
  const { version, sizeMb } = useLatestRelease();
  const changelog = useChangelog();
  const latest = changelog?.[0];
  const shownVersion = version ?? latest?.version ?? FALLBACK_VERSION;

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="container">
        <Reveal>
          <h1 id="hero-title">A download manager that uses your whole connection</h1>
        </Reveal>
        <Reveal delay={60}>
          <p className="hero-sub">
            Up to 32 connections per file, resume from the exact byte, and
            SHA-256 verification. Free for Windows.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/dl">
              <DownloadIcon size={15} />
              Download for Windows
            </a>
            <span className="hero-meta mono">
              v{shownVersion} · {sizeMb ?? FALLBACK_SIZE_MB} MB · Windows 10/11 x64
            </span>
            <a
              className="hero-new"
              href={latest?.url ?? RELEASES_URL}
              target="_blank"
              rel="noreferrer"
            >
              <strong>New in {latest?.version ?? shownVersion}</strong>
              <span>
                {latest?.headline || "Release notes"}
                <ArrowRight size={13} />
              </span>
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal delay={200} className="hero-stage">
        <div className="hero-floor" aria-hidden="true" />
        <div className="hero-frame">
          <AppMockup />
          <div
            className="hero-capture"
            role="img"
            aria-label="The capture window floating over Apex, asking whether to download a LibreOffice installer caught from the browser"
          >
            <CaptureCard
              host="download.documentfoundation.org"
              url="https://download.documentfoundation.org/libreoffice/stable/25.2.1/win/x86_64/LibreOffice_25.2.1_Win_x86-64.msi"
              file="LibreOffice_25.2.1_Win_x86-64.msi"
              ext="MSI"
              size="348 MB"
              folder="C:\Users\you\Downloads\Programs"
              of={2}
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
