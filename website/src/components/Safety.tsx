import { Reveal } from "../lib/reveal";
import { CheckIcon } from "./icons";

const POINTS = [
  "Finished files carry the Windows Mark of the Web, so SmartScreen and Defender scan them like any browser download.",
  "Resume checks notice when a file has changed on the server and start over instead of saving a corrupted mix.",
  "The browser extension requests no access to page content.",
  "Links served over plain HTTP are flagged before the download starts.",
  "No account, no ads, no telemetry. The only network traffic is your downloads.",
];

export default function Safety() {
  return (
    <section id="safety">
      <div className="container">
        <Reveal>
          <div className="safety-card">
            <div>
              <span className="kicker">Safety</span>
              <h2>The browser's safety checks, kept</h2>
              <p className="lead" style={{ marginBottom: 0 }}>
                External download tools usually skip the checks your browser
                performs. Apex keeps them in place and adds its own.
              </p>
            </div>
            <ul className="safety-list">
              {POINTS.map((p) => (
                <li key={p}>
                  <CheckIcon />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
