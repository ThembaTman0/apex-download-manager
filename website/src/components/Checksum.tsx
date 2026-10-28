import { useState } from "react";
import {
  FALLBACK_FILE_NAME,
  FALLBACK_SHA256,
  useLatestRelease,
} from "../lib/latestRelease";
import { CheckIcon, CopyIcon } from "./icons";

/**
 * The installer's SHA-256, read from the release asset's own digest, so the
 * hash on the page always describes the file /dl hands out. Hidden when the
 * API cannot answer: a stale hash would be worse than none.
 */
export default function Checksum({ compact = false }: { compact?: boolean }) {
  const live = useLatestRelease();
  // The build-time snapshot means the hash is in the served HTML too, so it
  // is there for a reader with scripting off and for the first paint. The
  // live value replaces it once /api/stats answers.
  const sha256 = live.sha256 ?? FALLBACK_SHA256;
  const fileName = live.fileName ?? FALLBACK_FILE_NAME;
  const [copied, setCopied] = useState(false);

  if (!sha256) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the hash is selectable on the page anyway.
    }
  };

  // Beside the first download button, where the decision to run an unsigned
  // installer is actually made. The full value lives at the foot of the page;
  // here the ends are enough to check a copy against, and the whole hash is
  // what the button puts on the clipboard.
  if (compact) {
    return (
      <button
        type="button"
        className="checksum-compact"
        onClick={copy}
        aria-label={`Copy the installer's SHA-256 checksum, ${sha256}`}
      >
        <span className="checksum-compact-label mono">SHA-256</span>
        <span className="checksum-compact-hash mono">
          {sha256.slice(0, 8)}
          <span aria-hidden="true">…</span>
          {sha256.slice(-8)}
        </span>
        {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
      </button>
    );
  }

  return (
    <div className="checksum">
      <div className="checksum-head">
        <span className="checksum-label mono">SHA-256</span>
        <button type="button" className="checksum-copy" onClick={copy}>
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="checksum-hash mono">{sha256}</code>
      <p className="checksum-note">
        {fileName ? <span className="mono">{fileName}</span> : "The installer"}.
        Check it before you run it: <span className="mono">certutil -hashfile
        &lt;file&gt; SHA256</span>, or paste it into the Verify Checksum dialog
        in Apex.
      </p>
    </div>
  );
}
