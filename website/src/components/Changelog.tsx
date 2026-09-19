import { Reveal } from "../lib/reveal";
import { RELEASES_URL, useChangelog } from "../lib/latestRelease";
import { ArrowRight } from "./icons";

const fmtDate = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .toUpperCase();

/** Last three public releases, from /api/changelog. Hidden when unavailable. */
export default function Changelog() {
  const entries = useChangelog();
  if (!entries || entries.length === 0) return null;

  return (
    <section className="band changelog" id="changelog" aria-labelledby="changelog-title">
      <div className="container">
        <Reveal>
          <h2 id="changelog-title" className="section-title">Changelog</h2>
        </Reveal>
        <ol className="cl-list">
          {entries.map((e, i) => (
            <li key={e.version}>
              <Reveal delay={i * 70}>
                <span className={`cl-dot${i === 0 ? " latest" : ""}`} aria-hidden="true" />
                <a className="cl-item" href={e.url} target="_blank" rel="noreferrer">
                  <span className="cl-version mono">v{e.version}</span>
                  <span className="cl-title">{e.headline}</span>
                  <span className="cl-teaser">{e.teaser}</span>
                  <time className="cl-date mono" dateTime={e.date}>{fmtDate(e.date)}</time>
                </a>
              </Reveal>
            </li>
          ))}
        </ol>
        <a className="text-link" href={RELEASES_URL} target="_blank" rel="noreferrer">
          All releases
          <ArrowRight size={13} />
        </a>
      </div>
    </section>
  );
}
