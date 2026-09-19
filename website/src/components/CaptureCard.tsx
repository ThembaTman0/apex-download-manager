import {
  BanIcon,
  CheckIcon,
  DownloadIcon,
  FolderIcon,
  LogoBadge,
  ShieldAlertIcon,
  XIcon,
} from "./icons";

export interface CaptureCardProps {
  host: string;
  url: string;
  file: string;
  ext: string;
  size: string;
  folder: string;
  of?: number;
  className?: string;
}

/**
 * Static replica of the app's capture-approval window
 * (desktop-ui/src/components/dialogs/CapturePopup.tsx).
 * Decorative: callers wrap it in a labelled role="img" element.
 */
export default function CaptureCard({
  host,
  url,
  file,
  ext,
  size,
  folder,
  of,
  className = "",
}: CaptureCardProps) {
  return (
    <div className={`cap ${className}`.trim()} aria-hidden="true">
      <div className="cap-head">
        <span className="cap-app">
          <LogoBadge size={16} />
          Apex Download Manager
        </span>
        <XIcon size={12} />
      </div>
      <div className="cap-body">
        <div className="cap-title">
          <span className="cap-title-ico"><ShieldAlertIcon size={15} /></span>
          Approve download?
          {of && <span className="cap-of">1 of {of}</span>}
        </div>

        <div className="cap-from">
          <span className="cap-label">From</span>
          <span className="cap-host">{host}</span>
          <span className="cap-url">{url}</span>
          <span className="cap-meta">
            <span className="cap-ext">{ext}</span>
            {size}
          </span>
        </div>

        <span className="cap-label">File name</span>
        <span className="cap-input"><span className="ell">{file}</span></span>

        <span className="cap-label">Save to</span>
        <span className="cap-row">
          <span className="cap-input grow"><span className="ell">{folder}</span></span>
          <span className="cap-browse"><FolderIcon size={14} /></span>
        </span>

        <span className="cap-check">
          <span className="cap-box"><CheckIcon size={9} strokeWidth={3} /></span>
          <span className="ell">Always allow downloads from {host}</span>
        </span>

        <div className="cap-actions">
          <span className="cap-block"><BanIcon /> Block</span>
          <span className="cap-go"><DownloadIcon size={13} /> Download</span>
        </div>
      </div>
    </div>
  );
}
