import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  DiskUsage,
  Download,
  PendingCapture,
  Segment,
  Settings,
  ToolsProgress,
  ToolsStatus,
  VideoProbe,
} from "@/types";

/** Wire format: dates come across as unix millis. */
interface RawDownload extends Omit<Download, "modifiedAt" | "createdAt"> {
  modifiedAt: number;
  createdAt: number;
}

function toDownload(raw: RawDownload): Download {
  return {
    ...raw,
    modifiedAt: new Date(raw.modifiedAt),
    createdAt: new Date(raw.createdAt),
  };
}

export const backend = {
  async listDownloads(): Promise<Download[]> {
    const raw = await invoke<RawDownload[]>("list_downloads");
    return raw.map(toDownload);
  },

  async addDownload(
    url: string,
    saveDir?: string,
    fileName?: string
  ): Promise<Download> {
    const raw = await invoke<RawDownload>("add_download", {
      url,
      saveDir: saveDir || null,
      fileName: fileName || null,
    });
    return toDownload(raw);
  },

  pauseDownload: (id: string) => invoke<void>("pause_download", { id }),
  resumeDownload: (id: string) => invoke<void>("resume_download", { id }),
  restartDownload: (id: string) => invoke<void>("restart_download", { id }),
  scheduleDownload: (id: string, startAt: number | null) =>
    invoke<void>("schedule_download", { id, startAt }),
  getDownloadSegments: (id: string) =>
    invoke<Segment[]>("get_download_segments", { id }),
  computeChecksum: (id: string) => invoke<string>("compute_checksum", { id }),
  listPendingCaptures: () =>
    invoke<PendingCapture[]>("list_pending_captures"),
  resolveCapture: (
    id: string,
    approved: boolean,
    saveDir?: string,
    fileName?: string
  ) =>
    invoke<RawDownload | null>("resolve_capture", {
      id,
      approved,
      saveDir: saveDir || null,
      fileName: fileName || null,
    }),
  executeQueueAction: (action: string) =>
    invoke<void>("execute_queue_action", { action }),
  removeDownload: (id: string, deleteFile: boolean) =>
    invoke<void>("remove_download", { id, deleteFile }),
  pauseAll: () => invoke<void>("pause_all"),
  resumeAll: () => invoke<void>("resume_all"),
  openDownload: (id: string) => invoke<void>("open_download", { id }),
  showInFolder: (id: string) => invoke<void>("show_in_folder", { id }),

  // --- Video grabber (yt-dlp) ---
  ytdlpStatus: () => invoke<ToolsStatus>("ytdlp_status"),
  installYtdlp: () => invoke<ToolsStatus>("install_ytdlp"),
  installFfmpeg: () => invoke<ToolsStatus>("install_ffmpeg"),
  probeVideo: (url: string) => invoke<VideoProbe>("probe_video", { url }),
  async addVideo(
    url: string,
    title: string,
    ext: string,
    selector: string,
    saveDir?: string
  ): Promise<Download> {
    const raw = await invoke<RawDownload>("add_video", {
      url,
      title,
      ext,
      selector,
      saveDir: saveDir || null,
    });
    return toDownload(raw);
  },
  onToolsProgress(cb: (p: ToolsProgress) => void): Promise<UnlistenFn> {
    return listen<ToolsProgress>("tools:progress", (e) => cb(e.payload));
  },

  getSettings: () => invoke<Settings>("get_settings"),
  regenerateCaptureToken: () => invoke<Settings>("regenerate_capture_token"),
  updateSettings: (settings: Settings) =>
    invoke<Settings>("update_settings", { settings }),
  getDiskUsage: () => invoke<DiskUsage>("get_disk_usage"),

  onDownloadChanged(cb: (d: Download) => void): Promise<UnlistenFn> {
    return listen<RawDownload>("download:changed", (e) => cb(toDownload(e.payload)));
  },

  onDownloadRemoved(cb: (id: string) => void): Promise<UnlistenFn> {
    return listen<string>("download:removed", (e) => cb(e.payload));
  },

  onClipboardUrl(cb: (url: string) => void): Promise<UnlistenFn> {
    return listen<string>("clipboard:url", (e) => cb(e.payload));
  },

  onQueueEmpty(cb: (action: string) => void): Promise<UnlistenFn> {
    return listen<string>("queue:empty", (e) => cb(e.payload));
  },

  onCapturePending(cb: (c: PendingCapture) => void): Promise<UnlistenFn> {
    return listen<PendingCapture>("capture:pending", (e) => cb(e.payload));
  },
};
