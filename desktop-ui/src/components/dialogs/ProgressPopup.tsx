import { useEffect, useRef, useState } from "react";
import { FolderOpen, Pause, Play, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { backend } from "@/services/backend";
import { formatBytes, formatETA, formatSpeed } from "@/lib/utils";
import type { Download } from "@/types";
import { LogoBadge } from "@/components/ui/LogoMark";
import { ProgressCell } from "@/components/downloads/ProgressCell";

const appWindow = getCurrentWindow();

/** Once everything shown has finished, the window closes itself this long
 * after, unless the pointer is over it. */
const AUTO_CLOSE_MS = 10_000;
/** Rows before the list scrolls instead of the window growing. */
const MAX_VISIBLE_ROWS = 4;

const isFinished = (d: Download) => d.status === "completed" || d.status === "failed";

/**
 * Small always-on-top window (its own OS window, like the capture prompt)
 * showing browser captures that have started downloading, so there is a sign
 * a download began before its completion notification. Rust adds rows via
 * `progress:track`; `download:changed` keeps them current.
 */
export function ProgressPopup() {
  const [rows, setRows] = useState<Download[]>([]);
  const [hovered, setHovered] = useState(false);

  // Rows already tracked before this window mounted, then any new ones.
  useEffect(() => {
    const add = async (ids: string[]) => {
      const all = await backend.listDownloads().catch(() => [] as Download[]);
      setRows((current) => {
        const have = new Set(current.map((d) => d.id));
        const fresh = ids
          .filter((id) => !have.has(id))
          .map((id) => all.find((d) => d.id === id))
          .filter((d): d is Download => !!d);
        return [...current, ...fresh];
      });
    };
    backend.listProgressTracked().then(add).catch(() => {});

    const unlisten = [
      backend.onProgressTrack((id) => add([id])),
      backend.onDownloadChanged((d) =>
        setRows((current) => current.map((r) => (r.id === d.id ? d : r)))
      ),
      backend.onDownloadRemoved((id) =>
        setRows((current) => current.filter((r) => r.id !== id))
      ),
    ];
    return () => unlisten.forEach((p) => p.then((fn) => fn()));
  }, []);

  const close = () => {
    setRows([]);
    backend.dismissProgress().catch(() => {});
  };

  // Nothing left to watch: close a while after the last one finishes, or
  // right away if every row was removed.
  const allDone = rows.every(isFinished);
  useEffect(() => {
    if (!allDone || hovered) return;
    const t = setTimeout(close, rows.length ? AUTO_CLOSE_MS : 0);
    return () => clearTimeout(t);
  }, [allDone, hovered, rows.length]);

  // Fit the OS window to the rows (no window chrome to resize by hand).
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const items = listRef.current?.children;
      if (!items || !items.length) return;
      const shown = Math.min(items.length, MAX_VISIBLE_ROWS);
      let h = 0;
      for (let i = 0; i < shown; i++) h += (items[i] as HTMLElement).offsetHeight;
      // 36px header, 12px list padding top and bottom, 8px between rows.
      appWindow.setSize(new LogicalSize(380, 36 + 24 + h + 8 * (shown - 1))).catch(() => {});
    });
    return () => cancelAnimationFrame(raf);
  });

  const active = rows.filter((d) => !isFinished(d)).length;

  return (
    <div
      className="h-screen w-screen bg-card overflow-hidden flex flex-col select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 h-9 shrink-0 border-b border-white/[0.06]"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted pointer-events-none">
          <LogoBadge className="w-4 h-4" />
          {active > 0
            ? `Downloading ${active} ${active === 1 ? "file" : "files"}`
            : "Downloads finished"}
        </span>
        <button
          onClick={close}
          className="text-ink-muted hover:text-ink transition-colors"
          title="Close (downloads keep going)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {rows.map((d) => (
          <ProgressRow key={d.id} d={d} />
        ))}
      </div>
    </div>
  );
}

function sizeSoFar(d: Download) {
  return `${formatBytes(d.downloadedBytes)}${d.sizeBytes ? ` of ${formatBytes(d.sizeBytes)}` : ""}`;
}

function ProgressRow({ d }: { d: Download }) {
  const done = d.status === "completed";
  const detail = done
    ? formatBytes(d.sizeBytes || d.downloadedBytes)
    : d.status === "failed"
      ? d.error || "Failed"
      : d.status === "paused"
        ? `Paused · ${sizeSoFar(d)}`
        : d.status === "queued"
          ? "Waiting in queue"
          : `${sizeSoFar(d)} · ${formatSpeed(d.speedBytesPerSec)} · ${formatETA(d.etaSeconds)} left`;

  return (
    <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink font-medium truncate flex-1" title={d.name}>
          {d.name}
        </span>
        {done ? (
          <>
            <button
              onClick={() => backend.openDownload(d.id).catch(() => {})}
              className="text-[11px] text-accent hover:underline"
            >
              Open
            </button>
            <button
              onClick={() => backend.showInFolder(d.id).catch(() => {})}
              className="text-ink-muted hover:text-ink transition-colors"
              title="Show in folder"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          </>
        ) : d.status === "paused" ? (
          <button
            onClick={() => backend.resumeDownload(d.id).catch(() => {})}
            className="text-ink-muted hover:text-ink transition-colors"
            title="Resume"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        ) : d.status === "downloading" || d.status === "queued" ? (
          <button
            onClick={() => backend.pauseDownload(d.id).catch(() => {})}
            className="text-ink-muted hover:text-ink transition-colors"
            title="Pause"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      <div className="mt-1.5">
        <ProgressCell progress={d.progress} status={d.status} />
      </div>
      <span className="text-[10px] text-ink-muted block mt-0.5 truncate tabular-nums" title={detail}>
        {detail}
      </span>
    </div>
  );
}
