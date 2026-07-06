import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Download, FolderOpen, ShieldAlert, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { backend } from "@/services/backend";
import type { PendingCapture } from "@/types";
import apexIcon from "@/assets/apex-icon.png";

const appWindow = getCurrentWindow();

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
  const currentId = useRef<string | null>(null);

  // Load anything already staged (the event may have fired before we mounted),
  // then keep listening for more.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    backend
      .listPendingCaptures()
      .then((initial) => setQueue(initial))
      .catch(() => {});
    backend
      .onCapturePending((c) =>
        setQueue((q) => (q.some((p) => p.id === c.id) ? q : [...q, c]))
      )
      .then((fn) => (unlisten = fn));
    return () => unlisten?.();
  }, []);

  const current = queue[0] ?? null;

  // Visibility is driven from Rust (which shows/raises the window on each new
  // capture — a JS show() during the webview's initial load doesn't stick).
  // Here we only need to hide the window once the queue drains, in resolve().

  // Re-seed the editable fields when a new capture reaches the front.
  useEffect(() => {
    if (current && current.id !== currentId.current) {
      currentId.current = current.id;
      setFileName(current.name);
      setSaveDir(current.folder);
    }
  }, [current]);

  const resolve = (approved: boolean) => {
    if (!current) return;
    const { id } = current;
    const wasLast = queue.length <= 1;
    setQueue((q) => q.filter((p) => p.id !== id));
    backend
      .resolveCapture(id, approved, saveDir || undefined, fileName || undefined)
      .catch(() => {});
    if (wasLast) appWindow.hide(); // nothing left to approve
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resolve(false);
      else if (e.key === "Enter") resolve(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let host = current?.url ?? "";
  try {
    if (current) host = new URL(current.url).host;
  } catch {
    // keep raw url as the label
  }

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
                <span className="text-sm text-[#E6E1CF] font-medium break-all">
                  {host}
                </span>
                <span
                  className="text-[10px] text-[#8A9199]/80 block mt-0.5 break-all line-clamp-1"
                  title={current.url}
                >
                  {current.url}
                </span>
              </div>

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

              <div className="flex justify-end gap-2">
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
