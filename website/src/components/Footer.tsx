import { GitHubIcon, LogoMark } from "./icons";

const REPO_URL = "https://github.com/ThembaTman0/apex-download-manager";

export default function Footer() {
  return (
    <footer>
      <div className="container footer-inner">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          <LogoMark size={16} />
          © 2026 Apex Download Manager
        </span>
        <nav aria-label="Footer">
          <a href="#features">Features</a>
          <a href="#safety">Safety</a>
          <a href="#faq">FAQ</a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <GitHubIcon size={14} />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
