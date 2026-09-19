import { Reveal } from "../lib/reveal";
import {
  FALLBACK_SIZE_MB,
  FALLBACK_VERSION,
  ISSUES_URL,
  RELEASES_URL,
  useLatestRelease,
} from "../lib/latestRelease";
import { ArrowRight, DownloadIcon } from "./icons";

// Below this, a counter reads as an absence of users rather than proof.
const COUNTER_MIN = 1000;

export default function DownloadCta() {
  const { version, sizeMb, total } = useLatestRelease();
  const showCount = typeof total === "number" && total >= COUNTER_MIN;

  return (
    <section className="band cta" id="download" aria-labelledby="download-title">
      <div className="container">
        <Reveal className="cta-grid">
          <h2 id="download-title" className="section-title">
            Get Apex.
            <br />
            <span className="muted">Free for Windows 10 and 11.</span>
          </h2>
          <div className="cta-side">
            <a className="btn btn-primary" href="/dl">
              <DownloadIcon size={15} />
              Download for Windows
            </a>
            <p className="cta-meta mono">
              v{version ?? FALLBACK_VERSION} · {sizeMb ?? FALLBACK_SIZE_MB} MB · x64 installer
            </p>
            <p className="cta-note">
              Pair the browser extension from Apex Settings, then downloads you
              click are caught automatically.
            </p>
            {showCount && (
              <p className="cta-count mono">
                {total.toLocaleString("en-US")} downloads counted. That is all we know.
              </p>
            )}
          </div>
        </Reveal>

        <div className="support-row" id="support">
          <h3>If something breaks</h3>
          <div className="support-body">
          <p>
            No ticket queue, no chatbot. Reports go straight to the developer,
            and most fixes ship in the next release.
          </p>
          <div className="support-links">
            <a className="text-link" href={ISSUES_URL} target="_blank" rel="noreferrer">
              Open an issue
              <ArrowRight size={13} />
            </a>
            <a className="text-link" href={RELEASES_URL} target="_blank" rel="noreferrer">
              Latest release
              <ArrowRight size={13} />
            </a>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
