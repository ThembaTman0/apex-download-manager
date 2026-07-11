import { Reveal } from "../lib/reveal";
import { CheckIcon, FileIcon, LogoMark, ShieldCheckIcon } from "./icons";

export default function Capture() {
  return (
    <section id="capture">
      <div className="container capture-grid">
        <Reveal>
          <span className="kicker">Browser capture</span>
          <h2>From your browser to Apex, automatically</h2>
          <p className="lead">
            Click a download like you always do. The extension hands it to
            Apex before the browser's own downloader starts.
          </p>
          <ol className="capture-steps">
            <li>
              <span className="step-num">1</span>
              <span>
                <strong>Apex catches the download</strong> and shows the file
                name, size and host before anything is saved.
              </span>
            </li>
            <li>
              <span className="step-num">2</span>
              <span>
                <strong>It checks first</strong> — probes the server for resume
                support, skips duplicates you already have, and confirms the
                disk has room.
              </span>
            </li>
            <li>
              <span className="step-num">3</span>
              <span>
                <strong>You stay in control.</strong> Accept once, always allow
                the host, or keep the download in the browser — your choice is
                remembered.
              </span>
            </li>
          </ol>
        </Reveal>

        <Reveal delay={120}>
          <div className="popup-stage">
            <div
              className="popup"
              role="img"
              aria-label="Apex capture window asking whether to download dataset-2026-archive.zip with Apex or keep it in the browser"
            >
              <div aria-hidden="true">
                <div className="popup-head">
                  <span className="mk-brand-mark"><LogoMark size={14} /></span>
                  Apex caught a download
                </div>
                <div className="popup-file">
                  <span className="mk-file-ico"><FileIcon size={15} /></span>
                  <span style={{ minWidth: 0 }}>
                    <div className="popup-file-name">dataset-2026-archive.zip</div>
                    <div className="popup-file-meta">1.2 GB · files.example.org · resumable</div>
                  </span>
                </div>
                <div className="popup-check">
                  <span className="popup-checkbox"><CheckIcon size={10} /></span>
                  Always allow downloads from files.example.org
                </div>
                <div className="popup-actions">
                  <span className="mk-btn amber">Download with Apex</span>
                  <span className="mk-btn">Keep in browser</span>
                </div>
                <div className="popup-note">
                  <ShieldCheckIcon size={12} />
                  214 GB free on C: · no duplicate found
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
