import type { ReactNode } from "react";
import { Reveal } from "../lib/reveal";
import { ArrowRight } from "./icons";

export interface ChapterProps {
  id: string;
  title: [string, string];
  body: ReactNode;
  link?: { href: string; label: string; external?: boolean };
  /** Extra links shown beside `link`, e.g. the three extension stores. */
  links?: Array<{ href: string; label: string; external?: boolean }>;
  visual: ReactNode;
  features: string[];
}

/**
 * One feature chapter, Linear-style: two-line heading left, paragraph right,
 * a full-width product visual, then a compact features list.
 */
export default function Chapter({ id, title, body, link, links, visual, features }: ChapterProps) {
  const half = Math.ceil(features.length / 2);
  return (
    <section className="band chapter" id={id} aria-labelledby={`${id}-title`}>
      <div className="container">
        <Reveal className="chapter-head">
          <h2 id={`${id}-title`}>
            {title[0]}
            <br />
            {title[1]}
          </h2>
          <div className="chapter-copy">
            <p>{body}</p>
            {[...(link ? [link] : []), ...(links ?? [])].map((l) => (
              <a
                key={l.href + l.label}
                className="text-link"
                href={l.href}
                {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {l.label}
                <ArrowRight size={13} />
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={80} className="chapter-visual">
          {visual}
        </Reveal>

        <div className="chapter-features">
          <h3>Features</h3>
          <div className="chapter-features-lists">
            <ul>
              {features.slice(0, half).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <ul>
              {features.slice(half).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
