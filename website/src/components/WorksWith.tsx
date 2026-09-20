import { FIREFOX_ADDON_URL } from "../lib/latestRelease";
import { Reveal } from "../lib/reveal";

/**
 * Where Linear shows customer logos. Apex has no customer logos to show and
 * faked browser wordmarks read as a placeholder, so this states the fact
 * plainly instead: one mono line, the same treatment as the FIG labels.
 */
export default function WorksWith() {
  return (
    <section className="works" aria-label="Compatibility">
      <div className="container">
        <Reveal>
          <p className="works-line">
            Works with <strong>Chrome</strong>, <strong>Edge</strong>,{" "}
            <strong>Brave</strong> and{" "}
            <a href={FIREFOX_ADDON_URL} target="_blank" rel="noreferrer">
              <strong>Firefox</strong>
            </a>
            , and with{" "}
            <strong>YouTube</strong> and the other sites yt-dlp supports.
          </p>
          <p className="works-caption mono">
            One extension · no page content is ever read
          </p>
        </Reveal>
      </div>
    </section>
  );
}
