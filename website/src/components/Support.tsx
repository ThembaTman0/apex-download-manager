import { Reveal } from "../lib/reveal";
import { DownloadIcon, GitHubIcon } from "./icons";

const ISSUES_URL =
  "https://github.com/ThembaTman0/apex-download-manager-releases/issues";
const RELEASES_URL =
  "https://github.com/ThembaTman0/apex-download-manager-releases/releases";

export default function Support() {
  return (
    <section id="support">
      <div className="container">
        <Reveal className="section-head">
          <span className="kicker">Support</span>
          <h2>If something breaks</h2>
          <p className="lead">
            No ticket queue, no chatbot. Reports go straight to the developer,
            and most fixes ship in the next release.
          </p>
        </Reveal>

        <div className="features-grid support-grid">
          <Reveal>
            <a
              className="feature-card"
              href={ISSUES_URL}
              target="_blank"
              rel="noreferrer"
            >
              <div className="feature-ico">
                <GitHubIcon size={18} />
              </div>
              <h3>Report a bug or request a feature</h3>
              <p>
                Open an issue on GitHub. Include your Apex version and what you
                expected to happen. Screenshots help.
              </p>
            </a>
          </Reveal>
          <Reveal delay={70}>
            <a
              className="feature-card"
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
            >
              <div className="feature-ico">
                <DownloadIcon size={18} />
              </div>
              <h3>Grab the newest build</h3>
              <p>
                Update trouble is usually solved by installing the latest
                release directly. Every version is listed with what changed.
              </p>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
