import { useEffect, useState } from "react";
import { GitHubIcon, LogoMark } from "./icons";

// The public releases repo - the source repo is private.
const REPO_URL = "https://github.com/ThembaTman0/apex-download-manager-releases";

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
          <LogoMark />
          Apex
        </a>
        <nav className="nav-links" aria-label="Main">
          <a href="#features">Features</a>
          <a href="#capture">Capture</a>
          <a href="#safety">Safety</a>
          <a href="#faq">FAQ</a>
          <a href="#support">Support</a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Apex on GitHub"
            style={{ display: "inline-flex" }}
          >
            <GitHubIcon size={17} />
          </a>
          <a className="btn btn-primary btn-sm" href="#download">
            Download
          </a>
        </nav>
      </div>
    </header>
  );
}
