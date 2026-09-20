import { useState } from "react";
import { useLatestRelease } from "../lib/latestRelease";
import { CheckIcon, CopyIcon } from "./icons";

/**
 * The installer's SHA-256, read from the release asset's own digest, so the
 * hash on the page always describes the file /dl hands out. Hidden when the
 * API cannot answer: a stale hash would be worse than none.
 */
export default function Checksum() {
  const { sha256, fileName } = useLatestRelease();
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
