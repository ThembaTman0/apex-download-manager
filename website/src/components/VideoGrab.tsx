import AppMockup from "./AppMockup";
import {
  ClapperIcon,
  ChevronDownIcon,
  DownloadIcon,
  FolderIcon,
  LinkIcon,
  MusicIcon,
  SearchIcon,
  XIcon,
} from "./icons";

const OPTIONS: Array<{ label: string; ext: string; size: string; audio?: boolean }> = [
  { label: "Best available", ext: "mp4", size: "≈ 1.9 GB" },
  { label: "1080p60", ext: "mp4", size: "≈ 1.2 GB" },
  { label: "720p", ext: "mp4", size: "≈ 612 MB" },
  { label: "Audio only", ext: "m4a", size: "≈ 66 MB", audio: true },
];
const SELECTED = 1;

/** The Grab Video dialog over a dimmed main window, as in the app. */
export default function VideoGrab() {
  return (
    <div
      className="vg"
      role="img"
      aria-label="The Grab Video dialog: a video page analyzed, qualities from Best available and 1080p60 down to audio only, with English subtitles selected"
    >
      <div className="vg-backdrop" aria-hidden="true">
        <AppMockup still />
      </div>

      <div className="vg-dialog" aria-hidden="true">
        <div className="vg-title">
          <span className="cap-title-ico"><ClapperIcon size={15} /></span>
          Grab Video
          <XIcon size={13} className="vg-x" />
        </div>

        <span className="cap-label">Video page URL</span>
        <span className="cap-row">
          <span className="cap-input grow icon">
            <LinkIcon size={13} /> <span className="ell">https://www.youtube.com/watch?v=R4u5t-a5yNc</span>
          </span>
          <span className="vg-analyze"><SearchIcon size={12} /> Analyze</span>
        </span>

        <div className="vg-probe">
          <span className="vg-thumb">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7Z" fill="currentColor" /></svg>
            <span className="vg-dur mono">48:12</span>
          </span>
          <span className="vg-meta">
            <span className="vg-name">Async Rust in practice: streaming large files without buffering</span>
            <span className="vg-by">Systems Programming Talks · 48:12</span>
          </span>
        </div>

        <span className="cap-label">Quality</span>
        <div className="vg-opts">
          {OPTIONS.map((o, i) => (
            <span key={o.label} className={`vg-opt${i === SELECTED ? " on" : ""}`}>
              <span className="vg-radio" />
              {o.audio ? <MusicIcon size={13} /> : <ClapperIcon size={13} />}
              <span className="vg-q">{o.label}</span>
              <span className="vg-ext">{o.ext}</span>
              <span className="vg-size">{o.size}</span>
            </span>
          ))}
        </div>

        <span className="cap-label">Subtitles</span>
        <span className="cap-input select">
          <span className="ell">
            English <span className="vg-dim">(from the uploader)</span>
          </span>
          <ChevronDownIcon size={13} />
        </span>
        <span className="vg-note">Saved as an .srt file next to the video, and embedded in it.</span>

        <span className="cap-label">Save to</span>
        <span className="cap-row">
          <span className="cap-input grow"><span className="ell">C:\Users\you\Videos</span></span>
          <span className="cap-browse"><FolderIcon size={14} /></span>
        </span>

        <div className="cap-actions">
          <span className="vg-cancel">Cancel</span>
          <span className="cap-go"><DownloadIcon size={13} /> Download</span>
        </div>
      </div>
    </div>
  );
}
