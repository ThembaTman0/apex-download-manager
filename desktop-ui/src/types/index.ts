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
}

export type Category =
  | "Video"
  | "Music"
  | "Programs"
  | "Archives"
  | "Documents"
  | "Images"
  | "Other";

export type QueueDoneAction = "none" | "sleep" | "shutdown";

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
  capturePort: number;
  captureToken: string;
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
