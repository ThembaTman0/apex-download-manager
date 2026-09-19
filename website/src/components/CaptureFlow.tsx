import CaptureCard from "./CaptureCard";
import { LockIcon } from "./icons";

/**
 * Browser on the left, the local hand-off in the middle, Apex's approval
 * window on the right. The headers listed are exactly the ones the capture
 * server forwards (desktop-ui/src-tauri/src/capture.rs).
 */
export default function CaptureFlow() {
  return (
    <div
      className="flow"
      role="img"
      aria-label="A download clicked in the browser is handed over a local, token-gated connection on 127.0.0.1 to Apex, which asks for approval before anything is saved"
    >
      <div className="flow-browser" aria-hidden="true">
        <div className="br-tabs">
          <span className="br-dots"><i /><i /><i /></span>
          <span className="br-tab">Download LibreOffice</span>
        </div>
        <div className="br-bar">
          <span className="br-url">
            <LockIcon size={10} />{" "}
            <span className="ell">download.documentfoundation.org/libreoffice/stable/25.2.1/win/</span>
          </span>
        </div>
        <div className="br-page">
          <span className="br-h" />
          <span className="br-l w80" />
          <span className="br-l w64" />
          <div className="br-files">
            {[
              ["LibreOffice_25.2.1_Win_x86-64.msi", "348 MB", true],
              ["LibreOffice_25.2.1_Win_x86-64_helppack_en-US.msi", "3.1 MB", false],
              ["LibreOffice_25.2.1_Win_aarch64.msi", "331 MB", false],
            ].map(([name, size, hot]) => (
              <span key={name as string} className={`br-file${hot ? " hot" : ""}`}>
                <span className="br-link">{name}</span>
                <span className="mono">{size}</span>
                {hot && (
                  <svg className="br-cursor" viewBox="0 0 16 20" width="14" height="18">
                    <path d="M1 1v15l4-3.6 2.6 6 2.4-1-2.6-5.8H13Z" />
                  </svg>
                )}
              </span>
            ))}
          </div>
          <span className="br-l w72" />
          <span className="br-l w48" />
        </div>
      </div>

      <div className="flow-link" aria-hidden="true">
        <span className="flow-line" />
        <span className="flow-label mono">
          <strong>127.0.0.1:43666</strong>
          <span>token checked</span>
          <span>cookie · referer</span>
          <span>user-agent</span>
        </span>
        <span className="flow-line" />
      </div>

      <div className="flow-app" aria-hidden="true">
        <CaptureCard
          host="download.documentfoundation.org"
          url="https://download.documentfoundation.org/libreoffice/stable/25.2.1/win/x86_64/LibreOffice_25.2.1_Win_x86-64.msi"
          file="LibreOffice_25.2.1_Win_x86-64.msi"
          ext="MSI"
          size="348 MB"
          folder="C:\Users\you\Downloads\Programs"
        />
      </div>
    </div>
  );
}
