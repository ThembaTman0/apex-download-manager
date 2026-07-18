export type DownloadStatus =
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "queued"
  | "merging";

export interface Download {
  id: string;
  name: string;
  url: string;
  type: string;
  sizeBytes: number;
  downloadedBytes: number;
  progress: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  status: DownloadStatus;
  segments: number;
  modifiedAt: Date;
  createdAt: Date;
  savePath: string;
  supportsRanges: boolean;
  error?: string;
  /** Unix millis; when set and in the future the download is scheduled. */
  startAt: number | null;
  /** "http" = segmented engine, "video" = fetched via yt-dlp. */
  kind: "http" | "video";
  /** Per-download speed cap in KB/s; 0 = uncapped (global limit still applies). */
  speedLimitKbps: number;
  /** yt-dlp format selector (kind === "video"). */
  videoFormat?: string;
  /** Live per-connection layout; grows while re-splitting is active. */
  segmentStates?: Segment[];
}

export type Category =
  | "Video"
  | "Music"
  | "Programs"
  | "Archives"
  | "Documents"
  | "Images"
  | "Other";

export type QueueDoneAction = "none" | "sleep" | "hibernate" | "shutdown";

export interface Settings {
  downloadDir: string;
  maxConcurrent: number;
  segmentsPerDownload: number;
  /** 0 = unlimited */
  speedLimitKbps: number;
  /** "" = direct connection; http://, https:// or socks5:// URL otherwise. */
  proxyUrl: string;
  notifyOnComplete: boolean;
  watchClipboard: boolean;
  autoOrganize: boolean;
  queueDoneAction: QueueDoneAction;
  captureEnabled: boolean;
  captureConfirm: boolean;
  capturePort: number;
  captureToken: string;
  /** Hosts whose captures skip the approval prompt (lowercase). */
  captureAllowedHosts: string[];
  /** Launch Apex hidden in the tray when the user signs in. */
  launchAtStartup: boolean;
  /** Bandwidth scheduler: full speed in the off-peak window, capped outside. */
  schedulerEnabled: boolean;
  /** Off-peak window bounds, minutes since local midnight (wraps midnight). */
  offpeakStartMin: number;
  offpeakEndMin: number;
  /** Cap outside the off-peak window (KB/s); 0 disables the cap. */
  peakLimitKbps: number;
}

/** A browser capture awaiting the user's approval before it downloads. */
export interface PendingCapture {
  id: string;
  url: string;
  name: string;
  folder: string;
  /** Page that linked the file ("" when unknown). */
  referrer: string;
  /** Filled by a quick probe after staging; 0 while unknown. */
  sizeBytes: number;
  /** Probe hint, e.g. the link already returns 403 ("" = nothing to warn). */
  warning: string;
}

/** yt-dlp / ffmpeg availability, shown in Settings → Video Grabber. */
export interface ToolsStatus {
  ytdlpPath: string | null;
  ytdlpVersion: string | null;
  ffmpegPath: string | null;
}

export interface ToolsProgress {
  tool: "yt-dlp" | "ffmpeg";
  downloaded: number;
  total: number;
}

/** One pickable quality in the video grabber dialog. */
export interface VideoFormatOption {
  selector: string;
  label: string;
  ext: string;
  audioOnly: boolean;
  sizeBytes: number | null;
}

export interface PlaylistEntry {
  url: string;
  title: string;
  durationSeconds: number | null;
}

export interface VideoProbe {
  title: string;
  uploader: string | null;
  durationSeconds: number | null;
  thumbnail: string | null;
  hasFfmpeg: boolean;
  options: VideoFormatOption[];
  /** Present when the URL is a playlist; options are generic ladders. */
  playlist: PlaylistEntry[] | null;
}

export interface YtdlpUpdateCheck {
  current: string | null;
  latest: string | null;
  outdated: boolean;
}

export interface DiskUsage {
  usedBytes: number;
  totalBytes: number;
  label: string;
}

export interface Segment {
  start: number;
  end: number;
  downloaded: number;
}

export interface SpeedSample {
  time: number;
  speed: number;
}

export type NavItem = "dashboard" | "downloads" | "settings";
