import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, FolderOpen, X } from "lucide-react";
import { backend } from "@/services/backend";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { formatBytes, formatETA, formatSpeed } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import type { Segment } from "@/types";

export function DetailsPanel() {
  const detailsId = useDownloadsStore((s) => s.detailsId);
  const setDetailsId = useDownloadsStore((s) => s.setDetailsId);
  const download = useDownloadsStore((s) =>
    s.downloads.find((d) => d.id === s.detailsId)
  );
  const showInFolder = useDownloadsStore((s) => s.showInFolder);
  const copyUrls = useDownloadsStore((s) => s.copyUrls);

  const [segments, setSegments] = useState<Segment[]>([]);

  // Segment progress is persisted every ~2s while downloading; poll it while
  // the panel is open so the per-connection bars move.
  useEffect(() => {
    if (!detailsId) return;
    let stop = false;
    const load = () =>
      backend
        .getDownloadSegments(detailsId)
        .then((s) => !stop && setSegments(s))
        .catch(() => {});
    load();
    const t = setInterval(load, 1000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [detailsId, download?.status]);

  // Close if the download was removed.
  useEffect(() => {
    if (detailsId && !download) setDetailsId(null);
  }, [detailsId, download, setDetailsId]);

  return (
    <AnimatePresence>
      {download && (
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-80 shrink-0 border-l border-white/[0.06] bg-[#0E1219] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
            <h2 className="text-sm font-semibold text-[#E6E1CF]">Properties</h2>
            <button
              onClick={() => setDetailsId(null)}
              className="text-[#8A9199] hover:text-[#E6E1CF] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div>
              <p className="text-sm text-[#E6E1CF] font-medium break-all">{download.name}</p>
              <div className="mt-1.5">
                <StatusBadge status={download.status} />
              </div>
              {download.error && (
                <p className="text-xs text-[#F07178] mt-2 break-all">{download.error}</p>
              )}
            </div>

            <Row label="Size">
              {download.sizeBytes > 0 ? formatBytes(download.sizeBytes) : "Unknown"}
            </Row>
            <Row label="Downloaded">
              {formatBytes(download.downloadedBytes)}
              {download.sizeBytes > 0 && ` (${Math.round(download.progress)}%)`}
            </Row>
            {download.status === "downloading" && (
              <>
                <Row label="Speed">{formatSpeed(download.speedBytesPerSec)}</Row>
                <Row label="ETA">{formatETA(download.etaSeconds)}</Row>
              </>
            )}
            <Row label="Connections">
              {download.segments} {download.supportsRanges ? "(resumable)" : "(no resume support)"}
            </Row>
            <SpeedLimitRow id={download.id} limit={download.speedLimitKbps} />
            <Row label="Added">{download.createdAt.toLocaleString()}</Row>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#8A9199]">URL</span>
                <button
                  onClick={() => copyUrls([download.id])}
                  className="text-[#8A9199] hover:text-[#E6E1CF] transition-colors"
                  title="Copy URL"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-[#BFBDB6] break-all font-mono leading-relaxed select-text">
                {download.url}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#8A9199]">Folder</span>
                <button
                  onClick={() => showInFolder(download.id)}
                  className="text-[#8A9199] hover:text-[#E6E1CF] transition-colors"
                  title="Show in folder"
                >
                  <FolderOpen className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-[#BFBDB6] break-all font-mono leading-relaxed select-text">
                {download.savePath}
              </p>
            </div>

            {segments.length > 1 && (
              <div>
                <span className="text-[11px] text-[#8A9199] block mb-2">
                  Segments
                </span>
                <div className="flex flex-col gap-1.5">
                  {segments.map((s, i) => {
                    const total = s.end - s.start + 1;
                    const pct =
                      total > 0 ? Math.min(100, (s.downloaded / total) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5 text-[10px] text-[#8A9199]/60 tabular-nums text-right">
                          {i + 1}
                        </span>
                        <div className="flex-1 h-1 bg-white/[0.07] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#E6B450] rounded-full transition-[width] duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-9 text-[10px] text-[#8A9199] tabular-nums text-right">
                          {Math.round(pct)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** Editable per-download cap (KB/s). Applies live to a running download. */
function SpeedLimitRow({ id, limit }: { id: string; limit: number }) {
  const setDownloadSpeedLimit = useDownloadsStore((s) => s.setDownloadSpeedLimit);
  const [value, setValue] = useState(limit === 0 ? "" : String(limit));

  // Re-sync when the panel switches downloads or the backend confirms a change.
  useEffect(() => {
    setValue(limit === 0 ? "" : String(limit));
  }, [id, limit]);

  const apply = () => {
    const kbps = Math.max(0, parseInt(value, 10) || 0);
    if (kbps !== limit) setDownloadSpeedLimit(id, kbps);
  };

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-[#8A9199] shrink-0">Speed limit</span>
      <span className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={apply}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="unlimited"
          className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-md text-xs text-[#E6E1CF] text-right px-2 py-1 outline-none focus:border-[#E6B450]/50 transition-colors tabular-nums placeholder:text-[#8A9199]/50"
        />
        <span className="text-[10px] text-[#8A9199]">KB/s</span>
      </span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-[#8A9199] shrink-0">{label}</span>
      <span className="text-xs text-[#BFBDB6] text-right tabular-nums">{children}</span>
    </div>
  );
}
