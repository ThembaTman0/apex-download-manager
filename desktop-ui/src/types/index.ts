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
  /** yt-dlp format selector (kind === "video"). */
  videoFormat?: string;
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
  notifyOnComplete: boolean;
  watchClipboard: boolean;
  autoOrganize: boolean;
  queueDoneAction: QueueDoneAction;
  captureEnabled: boolean;
  captureConfirm: boolean;
  capturePort: number;
  captureToken: string;
}

/** A browser capture awaiting the user's approval before it downloads. */
export interface PendingCapture {
  id: string;
  url: string;
  name: string;
  folder: string;
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

export interface VideoProbe {
  title: string;
  uploader: string | null;
  durationSeconds: number | null;
  thumbnail: string | null;
  hasFfmpeg: boolean;
  options: VideoFormatOption[];
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
