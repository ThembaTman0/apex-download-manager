import {
  CHROME_EXT_URL,
  EDGE_EXT_URL,
  FIREFOX_ADDON_URL,
} from "../lib/latestRelease";
import { Reveal } from "../lib/reveal";

/**
 * Where Linear shows customer logos. Apex has no customer logos to show, so
 * this states the fact plainly and links each browser to its store listing.
 * Brave runs Chrome extensions, so it points at the Chrome Web Store.
 */
export default function WorksWith() {
  return (
    <section className="works" aria-label="Compatibility">
      <div className="container">
        <Reveal>
          <p className="works-line">
            Works with{" "}
            <a href={CHROME_EXT_URL} target="_blank" rel="noreferrer">
              <strong>Chrome</strong>
            </a>
            ,{" "}
            <a href={EDGE_EXT_URL} target="_blank" rel="noreferrer">
              <strong>Edge</strong>
            </a>
            ,{" "}
            <a href={CHROME_EXT_URL} target="_blank" rel="noreferrer">
              <strong>Brave</strong>
            </a>{" "}
            and{" "}
            <a href={FIREFOX_ADDON_URL} target="_blank" rel="noreferrer">
              <strong>Firefox</strong>
            </a>
            , and with <strong>YouTube</strong> and the other sites yt-dlp
            supports.
          </p>
          <p className="works-caption mono">
            One extension · no page content is ever read
          </p>
        </Reveal>
      </div>
    </section>
  );
}
