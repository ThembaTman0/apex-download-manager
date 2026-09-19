import { CheckCircleIcon, CopyIcon, ShieldCheckIcon, XIcon } from "./icons";

// Illustrative digest; the dialog computes the real one from the file.
const HASH = "9d1c4f0b7e2a86c35f41d0e9a7b3c2186e5f04d9c1a8b72e3f60d5c4b9a1e087";

/**
 * Left: the app's Verify Checksum dialog. Right: the Mark of the Web Apex
 * writes on every finished file, exactly as engine.rs formats it (origin
 * only in HostUrl, never the full URL).
 */
export default function SafetyViz() {
  return (
    <div
      className="sv"
      role="img"
      aria-label="Two panels. The Verify Checksum dialog showing that the downloaded file's SHA-256 matches the publisher's hash. The file's Zone.Identifier stream with ZoneId 3 and only the site origin as HostUrl."
    >
      <div className="sv-panel sv-check" aria-hidden="true">
        <div className="vg-title">
          <span className="cap-title-ico green"><ShieldCheckIcon size={15} /></span>
          Verify Checksum
          <XIcon size={13} className="vg-x" />
        </div>
        <span className="sv-file">LibreOffice_25.2.1_Win_x86-64.msi</span>

        <span className="cap-label">SHA-256 of downloaded file</span>
        <span className="cap-row">
          <code className="cap-input grow hash">{HASH}</code>
          <span className="cap-browse"><CopyIcon size={13} /></span>
        </span>

        <span className="cap-label">
          Expected hash <span className="vg-dim">(paste from the download page)</span>
        </span>
        <code className="cap-input hash">{HASH}</code>

        <span className="sv-match">
          <CheckCircleIcon size={15} />
          Checksums match: file is authentic
        </span>
      </div>

      <div className="sv-panel sv-motw" aria-hidden="true">
        <div className="sv-motw-head mono">
          <span>LibreOffice_25.2.1_Win_x86-64.msi</span>
          <span className="sv-stream">:Zone.Identifier</span>
        </div>
        <pre className="sv-code mono">
          <span className="ln">1</span><span className="k">[ZoneTransfer]</span>{"\n"}
          <span className="ln">2</span>ZoneId=<span className="v">3</span>{"\n"}
          <span className="ln">3</span>HostUrl=<span className="v">https://download.documentfoundation.org/</span>
        </pre>
        <dl className="sv-notes">
          <div>
            <dt className="mono">ZoneId=3</dt>
            <dd>The Internet zone. SmartScreen and Defender treat the file like any browser download.</dd>
          </div>
          <div>
            <dt className="mono">HostUrl</dt>
            <dd>The site origin only. Full URLs often carry signed tokens, so they are never written.</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
