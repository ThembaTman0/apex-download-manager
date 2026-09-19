import { Reveal } from "../lib/reveal";
import { PlusIcon } from "./icons";

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
    <section className="band" id="faq" aria-labelledby="faq-title">
      <div className="container faq-grid">
        <Reveal>
          <h2 id="faq-title" className="section-title">
            Questions,
            <br />
            answered
          </h2>
        </Reveal>

        <div className="faq-list">
          {ITEMS.map((item) => (
            <details className="faq-item" key={item.q}>
              <summary>
                {item.q}
                <PlusIcon size={14} strokeWidth={1.6} />
              </summary>
              <div className="faq-body">
                <div>
                  <p>{item.a}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
