import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Toolbar } from "@/components/layout/Toolbar";
import { StatusBar } from "@/components/layout/StatusBar";
import { AddUrlDialog } from "@/components/dialogs/AddUrlDialog";
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

  useEffect(() => {
    init();
  }, [init]);

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
      if (s.addDialogOpen || s.deleteDialogOpen || s.checksumTarget || s.scheduleTarget) {
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
    <div className="flex flex-col h-screen bg-[#0B0E14] overflow-hidden rounded-[10px]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar column */}
        <div className="flex flex-col h-full bg-[#0D1017] border-r border-white/[0.06] w-56 shrink-0">
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {activeNav === "downloads" && <Toolbar />}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNav}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {pageMap[activeNav]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <StatusBar />

      <AddUrlDialog />
      <DeleteDialog />
      <ChecksumDialog />
      <ScheduleDialog />
      <ClipboardToast />
      <QueueActionToast />

      {/* Error toast */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 right-4 z-50 max-w-sm rounded-xl bg-[#161B24] border border-[#D95757]/30 shadow-2xl shadow-black/50 p-3 flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-[#F07178] shrink-0 mt-0.5" />
            <p className="text-xs text-[#BFBDB6] break-all flex-1">{lastError}</p>
            <button
              onClick={() => setLastError(null)}
              className="text-[#8A9199] hover:text-[#E6E1CF] transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
