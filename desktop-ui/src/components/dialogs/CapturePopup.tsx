import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  Ban,
  Clapperboard,
  Download,
  File,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Music,
  Package,
  ShieldAlert,
  X,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { backend } from "@/services/backend";
import { categoryForType, formatBytes } from "@/lib/utils";
import type { PendingCapture } from "@/types";
import apexIcon from "@/assets/apex-icon.png";

const appWindow = getCurrentWindow();

const categoryIcons: Record<string, React.ElementType> = {
  Video: Clapperboard,
  Music: Music,
  Programs: Package,
  Archives: Archive,
  Documents: FileText,
  Images: ImageIcon,
  Other: File,
};

/** Hostname of a URL, or the raw string when it doesn't parse. No port —
 * the Rust allow-list check compares bare hostnames (`host_str()`). */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Standalone always-on-top approval prompt (its own OS window, IDM-style).
 * Runs as a second React root in the "capture" window. It owns its own small
 * queue of pending captures and shows/hides the window as that queue fills and
 * empties. Nothing downloads until the user clicks Download.
 */
export function CapturePopup() {
  const [queue, setQueue] = useState<PendingCapture[]>([]);
  const [fileName, setFileName] = useState("");
  const [saveDir, setSaveDir] = useState("");
  const [alwaysAllow, setAlwaysAllow] = useState(false);
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const currentId = useRef<string | null>(null);

  // Load anything already staged (the event may have fired before we mounted),
  // then keep listening for more, plus probe refinements to entries we hold.
  useEffect(() => {
    let unlistenPending: (() => void) | undefined;
    let unlistenUpdated: (() => void) | undefined;
    backend
      .listPendingCaptures()
      .then((initial) => setQueue(initial))
      .catch(() => {});
    backend
      .onCapturePending((c) =>
        setQueue((q) => (q.some((p) => p.id === c.id) ? q : [...q, c]))
      )
      .then((fn) => (unlistenPending = fn));
    backend
      .onCaptureUpdated((c) =>
        setQueue((q) => q.map((p) => (p.id === c.id ? c : p)))
      )
      .then((fn) => (unlistenUpdated = fn));
    return () => {
      unlistenPending?.();
      unlistenUpdated?.();
    };
  }, []);

  const current = queue[0] ?? null;

  // Visibility is driven from Rust (which shows/raises the window on each new
  // capture — a JS show() during the webview's initial load doesn't stick).
  // Here we only need to hide the window once the queue drains, in resolve().

  // Re-seed the editable fields when a new capture reaches the front, and
  // again when the probe refines the front entry's name/folder — but never
  // over a value the user has already edited.
  const seeded = useRef({ name: "", folder: "" });
  useEffect(() => {
    if (!current) return;
    if (current.id !== currentId.current) {
      currentId.current = current.id;
      seeded.current = { name: current.name, folder: current.folder };
      setFileName(current.name);
      setSaveDir(current.folder);
      setAlwaysAllow(false);
      return;
    }
    if (current.name !== seeded.current.name) {
      setFileName((f) => (f === seeded.current.name ? current.name : f));
      seeded.current.name = current.name;
    }
    if (current.folder !== seeded.current.folder) {
      setSaveDir((d) => (d === seeded.current.folder ? current.folder : d));
      seeded.current.folder = current.folder;
    }
  }, [current]);

  const resolve = (approved: boolean) => {
    if (!current) return;
    const { id, url } = current;
    if (approved && alwaysAllow) {
      backend.allowCaptureHost(hostOf(url)).catch(() => {});
    }
    const wasLast = queue.length <= 1;
    setQueue((q) => q.filter((p) => p.id !== id));
    backend
      .resolveCapture(id, approved, saveDir || undefined, fileName || undefined)
      .catch(() => {});
    if (wasLast) appWindow.hide(); // nothing left to approve
  };

  // One click to clear a backlog (e.g. a page that auto-retried a download
  // while nobody was watching) instead of blocking entries one by one.
  const blockAll = () => {
    const ids = queue.map((p) => p.id);
    setQueue([]);
    appWindow.hide();
    for (const id of ids) {
      backend.resolveCapture(id, false).catch(() => {});
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resolve(false);
      else if (e.key === "Enter") resolve(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Free space at the chosen location, to warn before approving a file that
  // won't fit. Debounced — saveDir changes on every keystroke.
  useEffect(() => {
    setFreeBytes(null);
    if (!saveDir.trim()) return;
    const t = setTimeout(() => {
      backend
        .diskFree(saveDir)
        .then(setFreeBytes)
        .catch(() => setFreeBytes(null));
    }, 300);
    return () => clearTimeout(t);
  }, [saveDir]);

  const host = current ? hostOf(current.url) : "";
  const ext = fileName.includes(".")
    ? (fileName.split(".").pop() ?? "").toUpperCase().slice(0, 5)
    : "";
  const CategoryIcon = categoryIcons[categoryForType(ext)] ?? File;
  const notEnoughSpace =
    current !== null &&
    current.sizeBytes > 0 &&
    freeBytes !== null &&
    current.sizeBytes > freeBytes;

  return (
    <div className="h-screen w-screen bg-[#0F131A] overflow-hidden flex flex-col select-none">
      {/* Draggable header (window has no OS chrome). */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 h-9 shrink-0 border-b border-white/[0.06]"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#8A9199] pointer-events-none">
          <img src={apexIcon} alt="" className="w-4 h-4" draggable={false} />
          Apex Download Manager
        </span>
        <button
          onClick={() => resolve(false)}
          className="text-[#8A9199] hover:text-[#E6E1CF] transition-colors"
          title="Block"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-[#E6B450] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4 text-[#0B0E14]" />
                </span>
                <h1 className="text-sm font-semibold text-[#E6E1CF]">
                  Approve download?
                </h1>
                {queue.length > 1 && (
                  <span className="text-[11px] text-[#8A9199] ml-auto">
                    1 of {queue.length}
                  </span>
                )}
              </div>

              <div className="mb-3 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2">
                <span className="text-[10px] font-medium text-[#8A9199] block">
                  From
                </span>
                <span className="text-sm text-[#E6E1CF] font-medium block truncate" title={host}>
                  {host}
                </span>
                <span
                  className="text-[10px] text-[#8A9199]/80 block mt-0.5 truncate"
                  title={current.url}
                >
                  {current.url}
                </span>
                {current.referrer && hostOf(current.referrer) !== host && (
                  <span
                    className="text-[10px] text-[#8A9199] block mt-1 truncate"
                    title={current.referrer}
                  >
                    Page: <span className="text-[#BFBDB6]">{hostOf(current.referrer)}</span>
                  </span>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {ext && (
                    <>
                      <CategoryIcon className="w-3.5 h-3.5 text-[#8A9199]" />
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-semibold text-[#BFBDB6] tracking-wide">
                        {ext}
                      </span>
                    </>
                  )}
                  <span className="text-[11px] text-[#8A9199] tabular-nums">
                    {current.sizeBytes > 0 ? formatBytes(current.sizeBytes) : "Size unknown"}
                  </span>
                </div>
              </div>

              {current.warning && (
                <p className="flex items-start gap-1.5 text-[11px] text-[#FF8F40] mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{current.warning}</span>
                </p>
              )}
              {notEnoughSpace && freeBytes !== null && (
                <p className="flex items-start gap-1.5 text-[11px] text-[#F07178] mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>
                    Not enough space — only {formatBytes(freeBytes)} free at this
                    location
                  </span>
                </p>
              )}

              <label className="block mb-2.5">
                <span className="text-[11px] font-medium text-[#8A9199] mb-1 block">
                  File name
                </span>
                <input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-[#E6E1CF] px-2.5 py-2 outline-none focus:border-[#E6B450]/50 transition-colors"
                />
              </label>

              <label className="block mb-4">
                <span className="text-[11px] font-medium text-[#8A9199] mb-1 block">
                  Save to
                </span>
                <div className="flex gap-1.5">
                  <input
                    value={saveDir}
                    onChange={(e) => setSaveDir(e.target.value)}
                    className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-[#E6E1CF] px-2.5 py-2 outline-none focus:border-[#E6B450]/50 transition-colors"
                  />
                  <button
                    onClick={async () => {
                      const { open } = await import("@tauri-apps/plugin-dialog");
                      const dir = await open({
                        directory: true,
                        defaultPath: saveDir || undefined,
                        title: "Choose download folder",
                      });
                      if (typeof dir === "string") setSaveDir(dir);
                    }}
                    className="px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.1] transition-colors shrink-0"
                    title="Browse…"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              </label>

              <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alwaysAllow}
                  onChange={(e) => setAlwaysAllow(e.target.checked)}
                  className="accent-[#E6B450] w-3.5 h-3.5 shrink-0"
                />
                <span className="text-[11px] text-[#BFBDB6] truncate" title={host}>
                  Always allow downloads from {host}
                </span>
              </label>

              <div className="flex justify-end gap-2">
                {queue.length > 1 && (
                  <button
                    onClick={blockAll}
                    className="mr-auto px-3 py-2 rounded-lg text-[12px] font-medium text-[#8A9199] hover:text-[#F07178] hover:bg-[#F07178]/10 transition-colors"
                  >
                    Block all {queue.length}
                  </button>
                )}
                <button
                  onClick={() => resolve(false)}
                  className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-[#F07178] hover:bg-[#F07178]/10 transition-colors flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Block
                </button>
                <button
                  autoFocus
                  onClick={() => resolve(true)}
                  className="px-4 py-2 rounded-lg bg-[#E6B450] hover:bg-[#F0C266] text-[#0B0E14] text-[13px] font-semibold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
