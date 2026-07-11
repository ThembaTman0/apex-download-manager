import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Toolbar } from "@/components/layout/Toolbar";
import { StatusBar } from "@/components/layout/StatusBar";
import { AddUrlDialog } from "@/components/dialogs/AddUrlDialog";
import { GrabVideoDialog } from "@/components/dialogs/GrabVideoDialog";
import { DeleteDialog } from "@/components/dialogs/DeleteDialog";
import { ChecksumDialog } from "@/components/dialogs/ChecksumDialog";
import { ScheduleDialog } from "@/components/dialogs/ScheduleDialog";
import { ClipboardToast, QueueActionToast } from "@/components/ui/Toasts";
import { DashboardPage } from "@/pages/Dashboard";
import { DownloadsPage } from "@/pages/Downloads";
import { SettingsPage } from "@/pages/Settings";
import { useDownloadsStore } from "@/stores/downloadsStore";

const pageMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardPage />,
  downloads: <DownloadsPage />,
  settings: <SettingsPage />,
};

export default function App() {
  const activeNav = useDownloadsStore((s) => s.activeNav);
  const init = useDownloadsStore((s) => s.init);
  const lastError = useDownloadsStore((s) => s.lastError);
  const setLastError = useDownloadsStore((s) => s.setLastError);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  // Quiet update check shortly after launch (no-op in dev / when offline).
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) setUpdateVersion(update.version);
      } catch {
        // unsigned dev build or no network — ignore
      }
    }, 10_000);
    return () => clearTimeout(t);
  }, []);

  const installUpdate = async () => {
    setUpdateBusy(true);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      }
      setUpdateVersion(null);
    } catch (e) {
      setLastError(String(e));
      setUpdateBusy(false);
    }
  };

  // Keyboard shortcuts: Del delete · Space pause/resume · Ctrl+A select all
  // · Enter open · Esc clear selection / close panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        t.isContentEditable
      ) {
        return;
      }
      const s = useDownloadsStore.getState();
      if (
        s.addDialogOpen ||
        s.videoDialogOpen ||
        s.deleteDialogOpen ||
        s.checksumTarget ||
        s.scheduleTarget
      ) {
        return;
      }
      const selected = s.downloads.filter((d) => s.selectedIds.has(d.id));

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        s.setAddDialogOpen(true);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "f" &&
        s.activeNav !== "downloads"
      ) {
        e.preventDefault();
        s.setActiveNav("downloads");
        setTimeout(() => window.dispatchEvent(new Event("apex:focus-search")), 80);
      } else if (e.key === "Delete" && selected.length > 0) {
        s.setDeleteDialogOpen(true);
      } else if (e.key === " " && selected.length > 0) {
        e.preventDefault();
        for (const d of selected) {
          if (d.status === "downloading" || d.status === "queued") {
            s.pauseDownload(d.id);
          } else if (d.status === "paused" || d.status === "failed") {
            s.resumeDownload(d.id);
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        s.selectAll();
      } else if (e.key === "Enter" && selected.length === 1 && selected[0].status === "completed") {
        s.openFile(selected[0].id);
      } else if (e.key === "Escape") {
        s.clearSelection();
        s.setDetailsId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Drop a URL anywhere on the window to start a download.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const text =
        e.dataTransfer?.getData("text/uri-list") ||
        e.dataTransfer?.getData("text/plain") ||
        "";
      const url = text.split(/[\r\n]/).find((l) => /^https?:\/\/\S+$/i.test(l.trim()));
      if (url) {
        const s = useDownloadsStore.getState();
        s.setPendingUrl(url.trim());
        s.setAddDialogOpen(true);
      }
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden rounded-[10px]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar column */}
        <div className="flex flex-col h-full bg-surface border-r border-white/[0.06] w-56 shrink-0">
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {activeNav === "downloads" && <Toolbar />}
          {/* Enter-only fade on page switch. An AnimatePresence mode="wait"
              crossfade here wedged under React 19 StrictMode (the exit's
              completion was swallowed, leaving the old page stuck at
              opacity 0), so pages swap instantly and fade in. */}
          <motion.div
            key={activeNav}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {pageMap[activeNav]}
          </motion.div>
        </main>
      </div>
      <StatusBar />

      <AddUrlDialog />
      <GrabVideoDialog />
      <DeleteDialog />
      <ChecksumDialog />
      <ScheduleDialog />
      <ClipboardToast />
      <QueueActionToast />

      {/* Update-available toast */}
      <AnimatePresence>
        {updateVersion && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-raised border border-accent/30 shadow-2xl shadow-black/50 px-4 py-3 flex items-center gap-3"
          >
            <p className="text-xs text-ink-mid">
              Apex v{updateVersion} is available.
            </p>
            <button
              onClick={installUpdate}
              disabled={updateBusy}
              className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold disabled:opacity-60 transition-colors"
            >
              {updateBusy ? "Installing…" : "Install & Restart"}
            </button>
            <button
              onClick={() => setUpdateVersion(null)}
              aria-label="Dismiss update notification"
              className="text-ink-muted hover:text-ink transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 right-4 z-50 max-w-sm rounded-xl bg-raised border border-error/30 shadow-2xl shadow-black/50 p-3 flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-error-soft shrink-0 mt-0.5" />
            <p className="text-xs text-ink-mid break-all flex-1">{lastError}</p>
            <button
              onClick={() => setLastError(null)}
              aria-label="Dismiss error"
              className="text-ink-muted hover:text-ink transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
