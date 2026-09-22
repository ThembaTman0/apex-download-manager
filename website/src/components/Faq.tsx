import { Reveal } from "../lib/reveal";
import { PlusIcon } from "./icons";

const ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Is Apex free?",
    a: "Yes. Apex is free and open source under the GPL v3, so anyone can read, build and audit the code. There is no account to create, no ads, and nothing bundled into the installer.",
  },
  {
    q: "Is it safe to replace my browser's downloader?",
    a: "Apex keeps the browser's protections instead of bypassing them: finished files carry the Windows Mark of the Web, so SmartScreen and Defender still scan them, and insecure HTTP links are flagged before the transfer starts. You can also verify a publisher's SHA-256 checksum against the finished file.",
  },
  {
    q: "Which browsers does the extension support?",
    a: "Chrome, Edge, Brave and Firefox. The extension is published in the Chrome Web Store, Microsoft Edge Add-ons and on addons.mozilla.org; Brave installs the Chrome listing. Even without the extension, you can paste a link, use the clipboard watcher, or drag a URL into the window.",
  },
  {
    q: "What does Apex send over the network?",
    a: "Only your downloads. The app has no telemetry, and the update check talks directly to GitHub Releases. This website is different: it counts total downloads and uses Vercel Web Analytics for aggregated page views, with no cookies and nothing tied to you. The privacy policy lists exactly what that records.",
  },
  {
    q: "How do updates work?",
    a: "Apex checks GitHub Releases for new versions and tells you when one is available. Updates install only when you choose; nothing happens in the background.",
  },
  {
    q: "Why does Windows warn me about the installer?",
    a: "Apex isn't code-signed yet, so SmartScreen shows its “not commonly downloaded” notice with an unknown publisher. That reflects reputation, not a scan result: the file comes straight from GitHub's release servers, and the warning fades as downloads accumulate. Choose Keep, then “Show more” and “Keep anyway” to continue. The installer's SHA-256 is published next to the download button, so you can confirm the file is the one that was built. A signed installer is planned as the project grows.",
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
