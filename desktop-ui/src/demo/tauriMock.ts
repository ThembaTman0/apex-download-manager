// Browser-only Tauri shim so the UI can run under plain `npm run dev`
// (no Rust backend) for design work and website screenshots.
// Inside the real app `window.__TAURI_INTERNALS__` already exists,
// so this file does nothing there.

const now = Date.now();
const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

const demoDownloads = [
  {
    id: "demo-1",
    name: "ubuntu-24.04.2-desktop-amd64.iso",
    url: "https://releases.ubuntu.com/24.04.2/ubuntu-24.04.2-desktop-amd64.iso",
    type: "ISO",
    sizeBytes: Math.round(5.8 * GB),
    downloadedBytes: Math.round(5.8 * GB * 0.64),
    progress: 64,
    speedBytesPerSec: Math.round(42.1 * MB),
    etaSeconds: 51,
    status: "downloading",
    segments: 8,
    modifiedAt: now,
    createdAt: now - 2 * 60_000,
    savePath: "C:\\Users\\Alex\\Downloads\\Apex\\Programs\\ubuntu-24.04.2-desktop-amd64.iso",
    supportsRanges: true,
    startAt: null,
    kind: "http",
    speedLimitKbps: 0,
  },
  {
    id: "demo-2",
    name: "course-videos-part-04.mkv",
    url: "https://cdn.example.com/course/course-videos-part-04.mkv",
    type: "MKV",
    sizeBytes: Math.round(0.87 * GB),
    downloadedBytes: Math.round(0.87 * GB * 0.31),
    progress: 31,
    speedBytesPerSec: Math.round(18.6 * MB),
    etaSeconds: 33,
    status: "downloading",
    segments: 8,
    modifiedAt: now,
    createdAt: now - 6 * 60_000,
    savePath: "C:\\Users\\Alex\\Downloads\\Apex\\Video\\course-videos-part-04.mkv",
    supportsRanges: true,
    startAt: null,
    kind: "http",
    speedLimitKbps: 0,
  },
  {
    id: "demo-3",
    name: "node-v22.4.0-x64.msi",
    url: "https://nodejs.org/dist/v22.4.0/node-v22.4.0-x64.msi",
    type: "MSI",
    sizeBytes: Math.round(31 * MB),
    downloadedBytes: 0,
    progress: 0,
    speedBytesPerSec: 0,
    etaSeconds: 0,
    status: "queued",
    segments: 1,
    modifiedAt: now,
    createdAt: now - 9 * 60_000,
    savePath: "C:\\Users\\Alex\\Downloads\\Apex\\Programs\\node-v22.4.0-x64.msi",
    supportsRanges: false,
    startAt: null,
    kind: "http",
    speedLimitKbps: 0,
  },
  {
    id: "demo-4",
    name: "dataset-2026-archive.zip",
    url: "https://data.example.org/exports/dataset-2026-archive.zip",
    type: "ZIP",
    sizeBytes: Math.round(1.2 * GB),
    downloadedBytes: Math.round(1.2 * GB * 0.23),
    progress: 23,
    speedBytesPerSec: 0,
    etaSeconds: 0,
    status: "paused",
    segments: 8,
    modifiedAt: now - 40 * 60_000,
    createdAt: now - 55 * 60_000,
    savePath: "C:\\Users\\Alex\\Downloads\\Apex\\Archives\\dataset-2026-archive.zip",
    supportsRanges: true,
    startAt: null,
    kind: "http",
    speedLimitKbps: 0,
  },
  {
    id: "demo-5",
    name: "blender-4.2.1-windows-x64.msi",
    url: "https://download.blender.org/release/Blender4.2/blender-4.2.1-windows-x64.msi",
    type: "MSI",
    sizeBytes: Math.round(336 * MB),
    downloadedBytes: Math.round(336 * MB),
    progress: 100,
    speedBytesPerSec: 0,
    etaSeconds: 0,
    status: "completed",
    segments: 8,
    modifiedAt: now - 3 * 3_600_000,
    createdAt: now - 3 * 3_600_000,
    savePath: "C:\\Users\\Alex\\Downloads\\Apex\\Programs\\blender-4.2.1-windows-x64.msi",
    supportsRanges: true,
    startAt: null,
    kind: "http",
    speedLimitKbps: 0,
  },
];

const demoSettings = {
  downloadDir: "C:\\Users\\Alex\\Downloads\\Apex",
  maxConcurrent: 3,
  segmentsPerDownload: 8,
  speedLimitKbps: 0,
  proxyUrl: "",
  notifyOnComplete: true,
  watchClipboard: true,
  autoOrganize: true,
  queueDoneAction: "none",
  captureEnabled: true,
  captureConfirm: true,
  capturePort: 43666,
  captureToken: "demo",
  captureAllowedHosts: [],
};

const responses: Record<string, unknown> = {
  list_downloads: demoDownloads,
  get_settings: demoSettings,
  update_settings: demoSettings,
  get_disk_usage: {
    usedBytes: Math.round(317 * GB),
    totalBytes: Math.round(512 * GB),
    label: "C:",
  },
  list_pending_captures: [],
  ytdlp_status: { ytdlpPath: null, ytdlpVersion: null, ffmpegPath: null },
};

if (!("__TAURI_INTERNALS__" in window)) {
  let callbackId = 0;
  (window as any).__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main", windowLabel: "main" },
    },
    transformCallback(cb?: (r: unknown) => void) {
      const id = ++callbackId;
      (window as any)[`_${id}`] = cb ?? (() => {});
      return id;
    },
    async invoke(cmd: string) {
      if (cmd in responses) return responses[cmd];
      if (cmd === "plugin:event|listen") return ++callbackId;
      return null;
    },
  };
}

export {};
