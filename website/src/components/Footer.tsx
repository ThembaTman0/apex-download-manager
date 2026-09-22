import {
  CHROME_EXT_URL,
  EDGE_EXT_URL,
  FIREFOX_ADDON_URL,
  ISSUES_URL,
  RELEASES_URL,
  REPO_URL,
} from "../lib/latestRelease";
import { LogoMark } from "./icons";

type L = { label: string; href: string; external?: boolean };

const COLUMNS: Array<{ title: string; links: L[] }> = [
  {
    title: "Product",
    links: [
      { label: "Engine", href: "#engine" },
      { label: "Speed test", href: "#benchmark" },
      { label: "Browser capture", href: "#capture" },
      { label: "Video grabber", href: "#video" },
      { label: "Safety", href: "#safety" },
      { label: "Download", href: "/dl" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Releases", href: RELEASES_URL, external: true },
      { label: "Chrome extension", href: CHROME_EXT_URL, external: true },
      { label: "Edge add-on", href: EDGE_EXT_URL, external: true },
      { label: "Firefox add-on", href: FIREFOX_ADDON_URL, external: true },
      { label: "Changelog", href: "#changelog" },
      { label: "Issues", href: ISSUES_URL, external: true },
      { label: "Source code", href: REPO_URL, external: true },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Report a bug", href: `${ISSUES_URL}/new`, external: true },
      { label: "If something breaks", href: "#support" },
    ],
  },
  {
    title: "Legal",
    links: [{ label: "Privacy policy", href: "/privacy.html" }],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <a href="#top" className="footer-logo" aria-label="Apex Download Manager, back to top">
            <LogoMark size={18} />
          </a>
          <p className="footer-stance">
            No account. No telemetry.
            <br />
            One anonymous download total.
          </p>
          <p className="footer-copy mono">© 2026 Apex Download Manager</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="footer-col">
            <h2>{col.title}</h2>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
