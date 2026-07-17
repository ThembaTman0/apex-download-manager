import { Reveal } from "../lib/reveal";
import { useLatestRelease } from "../lib/latestRelease";
import AppMockup from "./AppMockup";
import { DownloadIcon } from "./icons";

export default function Hero() {
  const { version, sizeMb } = useLatestRelease();
  return (
    <section className="hero" id="top">
      <div className="container">
        <Reveal>
          <span className="hero-pill">
            <span className="dot" />
            Free for Windows 10 and 11
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1>A download manager that uses your whole connection</h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="hero-sub">
            Apex splits each file across up to 32 connections, resumes
            interrupted transfers from the exact byte they stopped at, and
            verifies checksums before you run what you downloaded.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="/dl">
              <DownloadIcon />
              Download for Windows
            </a>
            <a className="btn btn-ghost" href="#features">
              See features
            </a>
          </div>
          <p className="hero-meta">
            Version {version ?? "1.0.1"} · {sizeMb ?? 4} MB installer · native
            Rust engine
          </p>
        </Reveal>

        <Reveal delay={340} className="hero-visual">
          <AppMockup />
        </Reveal>
      </div>
    </section>
  );
}
