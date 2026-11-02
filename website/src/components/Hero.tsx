import { usePlatform } from "../lib/platform";
import { Reveal } from "../lib/reveal";
import {
  FALLBACK_SIZE_MB,
  FALLBACK_VERSION,
  RELEASES_URL,
  useChangelog,
  useLatestRelease,
} from "../lib/latestRelease";
import AppMockup from "./AppMockup";
import Checksum from "./Checksum";
import CaptureCard from "./CaptureCard";
import { ArrowRight, DownloadIcon, LinuxIcon, WindowsIcon } from "./icons";

export default function Hero() {
  const { version, sizeMb } = useLatestRelease();
  const changelog = useChangelog();
  const latest = changelog?.[0];
  const shownVersion = version ?? latest?.version ?? FALLBACK_VERSION;
  const platform = usePlatform();

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="container">
        <Reveal>
          <h1 id="hero-title">A free, open source download manager for Windows and Linux</h1>
        </Reveal>
        <Reveal delay={60}>
          <p className="hero-sub">
            It uses your whole connection: up to 32 connections per file,
            resume from the exact byte, and SHA-256 verification. No ads, no
            account, no telemetry, and every line is yours to read.
          </p>
        </Reveal>
        <Reveal delay={120}>
          {/* Two deliberate rows instead of one row that wraps wherever the
              width runs out: the choice (button and the other platforms),
              then the details (version, checksum, what's new). */}
          <div className="hero-actions">
            <div className="hero-choice">
              {platform === "linux" ? (
                <>
                  <a className="btn btn-primary" href="/dl?os=linux">
                    <LinuxIcon size={15} />
                    Download for Linux
                  </a>
                  <span className="hero-meta hero-linux mono">
                    AppImage, any distro · <a className="text-link" href="/dl?os=deb">.deb</a> ·{" "}
                    <a className="text-link" href="/dl">
                      <WindowsIcon size={12} />
                      Windows
                    </a>
                  </span>
                </>
              ) : platform === "mobile" ? (
                <a className="btn btn-primary" href="#download">
                  <DownloadIcon size={15} />
                  Free for Windows and Linux
                </a>
              ) : (
                <>
                  <a className="btn btn-primary" href="/dl">
                    <WindowsIcon size={15} />
                    Download for Windows
                  </a>
                  <span className="hero-meta hero-linux mono">
                    <LinuxIcon size={13} />
                    Linux: <a className="text-link" href="/dl?os=linux">AppImage</a> ·{" "}
                    <a className="text-link" href="/dl?os=deb">.deb</a> (x64)
                  </span>
                </>
              )}
            </div>
            <div className="hero-details">
              {platform === "linux" ? (
                <span className="hero-meta mono">v{shownVersion} · x64 · GPL v3</span>
              ) : platform === "mobile" ? (
                <span className="hero-meta mono">
                  v{shownVersion} · A desktop app: download it on your computer
                </span>
              ) : (
                <>
                  <span className="hero-meta mono">
                    v{shownVersion} · {sizeMb ?? FALLBACK_SIZE_MB} MB · Windows 10/11 x64 · GPL v3
                  </span>
                  {/* The published hash is the Windows installer's. */}
                  <Checksum compact />
                </>
              )}
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
          </div>
        </Reveal>
      </div>

      <Reveal delay={200} className="hero-stage">
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
