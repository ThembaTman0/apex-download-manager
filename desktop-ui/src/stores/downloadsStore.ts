import { useMemo } from "react";
import { create } from "zustand";
import type {
  Category,
  DiskUsage,
  Download,
  NavItem,
  Settings,
  SpeedSample,
} from "@/types";
import { backend } from "@/services/backend";
import { categoryForType } from "@/lib/utils";

const SPEED_HISTORY_LENGTH = 120; // ~2 minutes at 1 sample/s

interface DownloadsState {
  downloads: Download[];
  selectedIds: Set<string>;
  searchQuery: string;
  activeNav: NavItem;
  settings: Settings | null;
  diskUsage: DiskUsage | null;
  speedHistory: SpeedSample[];
  addDialogOpen: boolean;
  deleteDialogOpen: boolean;
  lastError: string | null;
  /** URL to pre-fill the Add dialog with (from clipboard toast). */
  pendingUrl: string | null;
  /** URL the clipboard watcher spotted; shown as a toast. */
  clipboardUrl: string | null;
  scheduleTarget: Download | null;
  checksumTarget: Download | null;
  /** Download whose properties panel is open. */
  detailsId: string | null;
  statusFilter: "all" | "active" | "scheduled" | "completed" | "failed";
  categoryFilter: "all" | Category;
  /** Pending post-queue action ("sleep"/"shutdown") awaiting countdown. */
  queueEmptyAction: string | null;

  init: () => Promise<void>;
  setSearchQuery: (q: string) => void;
  setActiveNav: (nav: NavItem) => void;
  setAddDialogOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setLastError: (e: string | null) => void;
  setPendingUrl: (url: string | null) => void;
  setClipboardUrl: (url: string | null) => void;
  setScheduleTarget: (d: Download | null) => void;
  setChecksumTarget: (d: Download | null) => void;
  setDetailsId: (id: string | null) => void;
  setStatusFilter: (
    f: "all" | "active" | "scheduled" | "completed" | "failed"
  ) => void;
  setCategoryFilter: (f: "all" | Category) => void;
  setQueueEmptyAction: (a: string | null) => void;
  scheduleDownload: (id: string, startAt: number | null) => Promise<void>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  addDownload: (url: string, saveDir?: string, fileName?: string) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  restartDownload: (id: string) => Promise<void>;
  removeDownloads: (ids: string[], deleteFile: boolean) => Promise<void>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  openFile: (id: string) => Promise<void>;
  showInFolder: (id: string) => Promise<void>;
  copyUrls: (ids: string[]) => Promise<void>;

  loadSettings: () => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  refreshDiskUsage: () => Promise<void>;
}

function sortDownloads(list: Download[]): Download[] {
  return [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

let initialized = false;

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  downloads: [],
  selectedIds: new Set(),
  searchQuery: "",
  activeNav: "downloads",
  settings: null,
  diskUsage: null,
  speedHistory: [],
  addDialogOpen: false,
  deleteDialogOpen: false,
  lastError: null,
  pendingUrl: null,
  clipboardUrl: null,
  scheduleTarget: null,
  checksumTarget: null,
  detailsId: null,
  statusFilter: "all",
  categoryFilter: "all",
  queueEmptyAction: null,

  init: async () => {
    if (initialized) return;
    initialized = true;
    try {
      const [downloads, settings, diskUsage] = await Promise.all([
        backend.listDownloads(),
        backend.getSettings(),
        backend.getDiskUsage().catch(() => null),
      ]);
      set({ downloads: sortDownloads(downloads), settings, diskUsage });
    } catch (e) {
      set({ lastError: String(e) });
    }

    await backend.onDownloadChanged((d) => {
      set((s) => {
        const exists = s.downloads.some((x) => x.id === d.id);
        const downloads = exists
          ? s.downloads.map((x) => (x.id === d.id ? d : x))
          : sortDownloads([d, ...s.downloads]);
        return { downloads };
      });
    });

    await backend.onDownloadRemoved((id) => {
      set((s) => ({
        downloads: s.downloads.filter((d) => d.id !== id),
        selectedIds: new Set([...s.selectedIds].filter((i) => i !== id)),
      }));
    });

    await backend.onClipboardUrl((url) => {
      // Ignore URLs we already track; don't interrupt an open dialog.
      const { downloads, addDialogOpen } = get();
      if (addDialogOpen || downloads.some((d) => d.url === url)) return;
      set({ clipboardUrl: url });
    });

    await backend.onQueueEmpty((action) => {
      set({ queueEmptyAction: action });
    });

    // Sample aggregate speed once per second for the analytics chart.
    setInterval(() => {
      const { downloads } = get();
      const speed = downloads
        .filter((d) => d.status === "downloading")
        .reduce((a, d) => a + d.speedBytesPerSec, 0);
      set((s) => ({
        speedHistory: [
          ...s.speedHistory.slice(-(SPEED_HISTORY_LENGTH - 1)),
          { time: Date.now(), speed },
        ],
      }));
    }, 1000);

    // Disk usage changes slowly; refresh once a minute.
    setInterval(() => {
      get().refreshDiskUsage();
    }, 60_000);
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  setAddDialogOpen: (open) =>
    set((s) => ({
      addDialogOpen: open,
      pendingUrl: open ? s.pendingUrl : null,
    })),
  setDeleteDialogOpen: (open) => set({ deleteDialogOpen: open }),
  setLastError: (e) => set({ lastError: e }),
  setPendingUrl: (url) => set({ pendingUrl: url }),
  setClipboardUrl: (url) => set({ clipboardUrl: url }),
  setScheduleTarget: (d) => set({ scheduleTarget: d }),
  setChecksumTarget: (d) => set({ checksumTarget: d }),
  setDetailsId: (id) => set({ detailsId: id }),
  setStatusFilter: (f) => set({ statusFilter: f }),
  setCategoryFilter: (f) => set({ categoryFilter: f }),
  setQueueEmptyAction: (a) => set({ queueEmptyAction: a }),

  scheduleDownload: async (id, startAt) => {
    try {
      await backend.scheduleDownload(id, startAt);
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  selectAll: () =>
    set((s) => ({ selectedIds: new Set(s.downloads.map((d) => d.id)) })),

  clearSelection: () => set({ selectedIds: new Set() }),

  addDownload: async (url, saveDir, fileName) => {
    const d = await backend.addDownload(url, saveDir, fileName);
    set((s) => ({
      downloads: s.downloads.some((x) => x.id === d.id)
        ? s.downloads.map((x) => (x.id === d.id ? d : x))
        : sortDownloads([d, ...s.downloads]),
    }));
  },

  pauseDownload: async (id) => {
    try {
      await backend.pauseDownload(id);
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  resumeDownload: async (id) => {
    try {
      await backend.resumeDownload(id);
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  restartDownload: async (id) => {
    try {
      await backend.restartDownload(id);
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  removeDownloads: async (ids, deleteFile) => {
    for (const id of ids) {
      try {
        await backend.removeDownload(id, deleteFile);
      } catch (e) {
        set({ lastError: String(e) });
      }
    }
    set((s) => ({
      selectedIds: new Set([...s.selectedIds].filter((i) => !ids.includes(i))),
    }));
  },

  pauseAll: async () => {
    try {
      await backend.pauseAll();
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  resumeAll: async () => {
    try {
      await backend.resumeAll();
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  openFile: async (id) => {
    try {
      await backend.openDownload(id);
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  showInFolder: async (id) => {
    try {
      await backend.showInFolder(id);
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  copyUrls: async (ids) => {
    const { downloads } = get();
    const urls = downloads
      .filter((d) => ids.includes(d.id))
      .map((d) => d.url)
      .join("\n");
    if (!urls) return;
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(urls);
  },

  loadSettings: async () => {
    try {
      set({ settings: await backend.getSettings() });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  saveSettings: async (s) => {
    const saved = await backend.updateSettings(s);
    set({ settings: saved });
  },

  refreshDiskUsage: async () => {
    try {
      set({ diskUsage: await backend.getDiskUsage() });
    } catch {
      // non-critical
    }
  },
}));

export const useFilteredDownloads = (): Download[] => {
  const downloads = useDownloadsStore((s) => s.downloads);
  const searchQuery = useDownloadsStore((s) => s.searchQuery);
  const statusFilter = useDownloadsStore((s) => s.statusFilter);
  const categoryFilter = useDownloadsStore((s) => s.categoryFilter);
  return useMemo(() => {
    const q = searchQuery.toLowerCase();
    return downloads.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q) && !d.url.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter === "active") {
        const scheduledForLater =
          d.status === "queued" && d.startAt && d.startAt > Date.now();
        if (
          scheduledForLater ||
          !["downloading", "queued", "merging", "paused"].includes(d.status)
        ) {
          return false;
        }
      }
      if (statusFilter === "completed" && d.status !== "completed") return false;
      if (statusFilter === "failed" && d.status !== "failed") return false;
      if (
        statusFilter === "scheduled" &&
        !(d.status === "queued" && d.startAt && d.startAt > Date.now())
      ) {
        return false;
      }
      if (categoryFilter !== "all" && categoryForType(d.type) !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [downloads, searchQuery, statusFilter, categoryFilter]);
};
