import { useEffect, useState } from "react";
import { REPO_URL } from "../lib/latestRelease";
import { GitHubIcon, LogoMark } from "./icons";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`.trim()}>
      <div className="container nav-inner">
        <a className="brand" href="#top" aria-label="Apex Download Manager, back to top">
          <LogoMark size={18} />
          Apex
        </a>
        <nav className="nav-links" aria-label="Main">
          <a href="#engine">Engine</a>
          <a href="#benchmark">Speed</a>
          <a href="#capture">Capture</a>
          <a href="#video">Video</a>
          <a href="#safety">Safety</a>
          <a href="#faq">FAQ</a>
          <span className="nav-sep" aria-hidden="true" />
          <a
            className="nav-icon"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Apex on GitHub"
          >
            <GitHubIcon size={16} />
          </a>
          <a className="btn btn-pill" href="#download">
            Download
          </a>
        </nav>
      </div>
    </header>
  );
}
