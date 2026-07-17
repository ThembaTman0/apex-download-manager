import { Reveal } from "../lib/reveal";
import { ChevronDownIcon } from "./icons";

const ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Is Apex free?",
    a: "Yes, free for personal use. There is no account to create, no ads, and nothing bundled into the installer.",
  },
  {
    q: "Is it safe to replace my browser's downloader?",
    a: "Apex keeps the browser's protections instead of bypassing them: finished files carry the Windows Mark of the Web, so SmartScreen and Defender still scan them, and insecure HTTP links are flagged before the transfer starts. You can also verify a publisher's SHA-256 checksum against the finished file.",
  },
  {
    q: "Which browsers does the extension support?",
    a: "Chrome, Edge, and Brave today, with Firefox support in testing. Even without the extension, you can paste a link, use the clipboard watcher, or drag a URL into the window.",
  },
  {
    q: "What does Apex send over the network?",
    a: "Only your downloads. The app has no telemetry, and the update check talks directly to GitHub Releases. This website counts one anonymous number, total downloads, and nothing else.",
  },
  {
    q: "How do updates work?",
    a: "Apex checks GitHub Releases for new versions and tells you when one is available. Updates install only when you choose; nothing happens in the background.",
  },
  {
    q: "Why does Windows warn me about the installer?",
    a: "Apex isn't code-signed yet, so SmartScreen shows its “not commonly downloaded” notice with an unknown publisher. That reflects reputation, not a scan result: the file comes straight from GitHub's release servers, and the warning fades as downloads accumulate. Choose Keep, then “Show more” → “Keep anyway” to continue. A signed installer is planned as the project grows.",
  },
];

export default function Faq() {
  return (
    <section id="faq">
      <div className="container">
        <Reveal className="section-head">
          <span className="kicker">FAQ</span>
          <h2>Questions, answered</h2>
        </Reveal>

        <div className="faq-list">
          {ITEMS.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <details className="faq-item">
                <summary>
                  {item.q}
                  <ChevronDownIcon />
                </summary>
                <div className="faq-body">
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
