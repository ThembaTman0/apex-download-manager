import { Reveal } from "../lib/reveal";

const ITEMS: Array<{ name: string; via: string }> = [
  { name: "Chrome", via: "Extension" },
  { name: "Edge", via: "Extension" },
  { name: "Brave", via: "Extension" },
  { name: "Firefox", via: "Extension" },
  { name: "YouTube", via: "Video grabber" },
];

/** Where Linear shows customer logos: the places Apex plugs into. */
export default function WorksWith() {
  return (
    <section className="works" aria-label="Works with">
      <div className="container">
        <Reveal>
          <ul className="works-list">
            {ITEMS.map((it) => (
              <li key={it.name}>
                <span className="works-name">{it.name}</span>
                <span className="works-via mono">{it.via}</span>
              </li>
            ))}
          </ul>
          <p className="works-caption mono">
            Works with the browser you already use, and the sites you watch
          </p>
        </Reveal>
      </div>
    </section>
  );
}
