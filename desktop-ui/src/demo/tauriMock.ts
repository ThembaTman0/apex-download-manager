// Browser-only Tauri shim so the UI can run under plain `npm run dev`
// (no Rust backend) for design work and website screenshots.
// Inside the real app `window.__TAURI_INTERNALS__` already exists,
// so this file does nothing there.
//
// Write commands (add/pause/resume/remove/…) are implemented against an
// in-memory table with simulated transfer progress, so the whole UI is
// exercisable in a browser - not just rendered.

const now = Date.now();
const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

type RawDemoDownload = {
  id: string;
  name: string;
  url: string;
  type: string;
  sizeBytes: number;
  downloadedBytes: number;
  progress: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  status: string;
  segments: number;
  modifiedAt: number;
  createdAt: number;
  savePath: string;
  supportsRanges: boolean;
  startAt: number | null;
  kind: string;
  speedLimitKbps: number;
  error?: string | null;
  segmentStates?: DemoSegment[];
};

type DemoSegment = { start: number; end: number; downloaded: number };

/** Even segment plan over sizeBytes, partially filled to match progress. */
const planSegments = (
  sizeBytes: number,
  n: number,
  progress: number,
): DemoSegment[] => {
  const chunk = Math.floor(sizeBytes / n);
  return Array.from({ length: n }, (_, i) => {
    const start = i * chunk;
    const end = i === n - 1 ? sizeBytes - 1 : (i + 1) * chunk - 1;
    // Stagger fills so the map looks organic rather than uniform.
    const fill = Math.min(1, (progress / 100) * (0.55 + ((i * 7) % 10) / 10));
    return { start, end, downloaded: Math.round((end - start + 1) * fill) };
  });
};

const demoDownloads: RawDemoDownload[] = [
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
  launchAtStartup: true,
  schedulerEnabled: false,
  offpeakStartMin: 23 * 60,
  offpeakEndMin: 7 * 60,
  peakLimitKbps: 512,
};

if (!("__TAURI_INTERNALS__" in window)) {
  const state = new Map<string, RawDemoDownload>(
    demoDownloads.map((d) => [d.id, d]),
  );
  let nextId = state.size;

  // --- event plumbing -------------------------------------------------
  let callbackId = 0;
  const listeners = new Map<string, Set<(e: unknown) => void>>();

  const emit = (event: string, payload: unknown) => {
    for (const cb of listeners.get(event) ?? []) {
      cb({ event, id: 0, payload });
    }
  };

  const touch = (d: RawDemoDownload) => {
    d.modifiedAt = Date.now();
    emit("download:changed", { ...d });
  };

  // Seed live-looking segment layouts for the demo rows.
  for (const d of state.values()) {
    if (d.supportsRanges && d.segments > 1 && d.status !== "queued") {
      d.segmentStates = planSegments(d.sizeBytes, d.segments, d.progress);
    }
  }

  // --- transfer simulation ---------------------------------------------
  const TICK_MS = 800;
  setInterval(() => {
    for (const d of state.values()) {
      if (d.status !== "downloading") continue;
      const base = 25 * MB + (d.id.charCodeAt(d.id.length - 1) % 5) * 4 * MB;
      d.speedBytesPerSec = Math.round(base * (0.85 + Math.random() * 0.3));
      d.downloadedBytes = Math.min(
        d.sizeBytes,
        d.downloadedBytes + d.speedBytesPerSec * (TICK_MS / 1000),
      );
      d.progress = Math.min(100, (d.downloadedBytes / d.sizeBytes) * 100);
      d.etaSeconds = Math.max(
        0,
        Math.round((d.sizeBytes - d.downloadedBytes) / d.speedBytesPerSec),
      );

      // Advance segments unevenly; when one finishes, re-split the largest
      // remainder, mirroring the real engine's dynamic re-splitting.
      if (d.segmentStates) {
        const gained = d.speedBytesPerSec * (TICK_MS / 1000);
        const unfinished = d.segmentStates.filter(
          (s) => s.downloaded < s.end - s.start + 1,
        );
        for (const s of unfinished) {
          const len = s.end - s.start + 1;
          const share = (gained / unfinished.length) * (0.4 + Math.random() * 1.2);
          const before = s.downloaded;
          s.downloaded = Math.min(len, s.downloaded + share);
          if (before < len && s.downloaded >= len && d.segmentStates.length < 24) {
            const donor = d.segmentStates.reduce((a, b) =>
              b.end - b.start + 1 - b.downloaded > a.end - a.start + 1 - a.downloaded
                ? b
                : a,
            );
            const remaining = donor.end - donor.start + 1 - donor.downloaded;
            if (remaining > 4 * MB) {
              const mid = donor.start + donor.downloaded + Math.floor(remaining / 2);
              const newSeg = { start: mid, end: donor.end, downloaded: 0 };
              donor.end = mid - 1;
              d.segmentStates.push(newSeg);
              d.segmentStates.sort((a, b) => a.start - b.start);
            }
          }
        }
        d.segments = d.segmentStates.length;
      }

      if (d.downloadedBytes >= d.sizeBytes) {
        d.status = "completed";
        d.progress = 100;
        d.speedBytesPerSec = 0;
        d.etaSeconds = 0;
        if (d.segmentStates) {
          for (const s of d.segmentStates) s.downloaded = s.end - s.start + 1;
        }
      }
      touch(d);
    }
  }, TICK_MS);

  // --- command handlers --------------------------------------------------
  const fileNameFromUrl = (url: string): string => {
    try {
      const base = decodeURIComponent(
        new URL(url).pathname.split("/").pop() ?? "",
      );
      return base || "download.bin";
    } catch {
      return "download.bin";
    }
  };

  const commands: Record<string, (args: any) => unknown> = {
    list_downloads: () => [...state.values()],
    get_settings: () => demoSettings,
    update_settings: (a) => Object.assign(demoSettings, a?.settings),
    get_disk_usage: () => ({
      usedBytes: Math.round(317 * GB),
      totalBytes: Math.round(512 * GB),
      label: "C:",
    }),
    list_pending_captures: () => [],
    ytdlp_status: () => ({ ytdlpPath: null, ytdlpVersion: null, ffmpegPath: null }),
    disk_free: () => Math.round(195 * GB),

    add_download: (a) => {
      const name = a?.fileName || fileNameFromUrl(a?.url ?? "");
      const ext = name.includes(".") ? name.split(".").pop()! : "";
      const d: RawDemoDownload = {
        id: `demo-${++nextId}`,
        name,
        url: a?.url ?? "",
        type: ext.length <= 4 ? ext.toUpperCase() : "",
        sizeBytes: Math.round((80 + Math.random() * 900) * MB),
        downloadedBytes: 0,
        progress: 0,
        speedBytesPerSec: 0,
        etaSeconds: 0,
        status: "downloading",
        segments: demoSettings.segmentsPerDownload,
        modifiedAt: Date.now(),
        createdAt: Date.now(),
        savePath: `${a?.saveDir || demoSettings.downloadDir}\\${name}`,
        supportsRanges: true,
        startAt: null,
        kind: "http",
        speedLimitKbps: 0,
      };
      d.segmentStates = planSegments(d.sizeBytes, d.segments, 0);
      state.set(d.id, d);
      return { ...d };
    },

    pause_download: (a) => {
      const d = state.get(a?.id);
      if (d && (d.status === "downloading" || d.status === "queued")) {
        d.status = "paused";
        d.speedBytesPerSec = 0;
        d.etaSeconds = 0;
        touch(d);
      }
    },
    resume_download: (a) => {
      const d = state.get(a?.id);
      if (d && (d.status === "paused" || d.status === "failed")) {
        d.status = "downloading";
        d.error = null;
        touch(d);
      }
    },
    restart_download: (a) => {
      const d = state.get(a?.id);
      if (d) {
        d.status = "downloading";
        d.downloadedBytes = 0;
        d.progress = 0;
        d.error = null;
        touch(d);
      }
    },
    remove_download: (a) => {
      if (state.delete(a?.id)) emit("download:removed", a.id);
    },
    pause_all: () => {
      for (const d of state.values()) {
        if (d.status === "downloading" || d.status === "queued") {
          d.status = "paused";
          d.speedBytesPerSec = 0;
          d.etaSeconds = 0;
          touch(d);
        }
      }
    },
    resume_all: () => {
      for (const d of state.values()) {
        if (d.status === "paused" || d.status === "failed") {
          d.status = "downloading";
          touch(d);
        }
      }
    },
    schedule_download: (a) => {
      const d = state.get(a?.id);
      if (d) {
        d.startAt = a?.startAt ?? null;
        if (d.startAt) {
          d.status = "queued";
          d.speedBytesPerSec = 0;
        }
        touch(d);
      }
    },
    set_download_speed_limit: (a) => {
      const d = state.get(a?.id);
      if (d) {
        d.speedLimitKbps = a?.kbps ?? 0;
        touch(d);
      }
    },
    get_download_segments: (a) => {
      const d = state.get(a?.id);
      if (!d) return [];
      return (
        d.segmentStates ?? planSegments(d.sizeBytes, d.segments, d.progress)
      );
    },
    compute_checksum: () =>
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    open_download: () => null,
    show_in_folder: () => null,
    execute_queue_action: () => null,
  };

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
    async invoke(cmd: string, args?: any) {
      if (cmd === "plugin:event|listen") {
        const cb = (window as any)[`_${args?.handler}`];
        if (args?.event && typeof cb === "function") {
          if (!listeners.has(args.event)) listeners.set(args.event, new Set());
          listeners.get(args.event)!.add(cb);
        }
        return ++callbackId;
      }
      if (cmd === "plugin:event|unlisten") return null;
      if (cmd in commands) return commands[cmd](args);
      return null;
    },
  };
}

export {};
