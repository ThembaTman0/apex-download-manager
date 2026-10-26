import { cn } from "@/lib/utils";
import { useDownloadsStore } from "@/stores/downloadsStore";
import type { DownloadStatus } from "@/types";

const config: Record<DownloadStatus, { label: string; dot: string }> = {
  downloading: { label: "Downloading", dot: "bg-info" },
  paused: { label: "Paused", dot: "bg-warning" },
  completed: { label: "Completed", dot: "bg-success" },
  failed: { label: "Failed", dot: "bg-error-soft" },
  queued: { label: "Queued", dot: "bg-ink-dim" },
  merging: { label: "Merging", dot: "bg-accent" },
};

/** `id` lets a completed download show "File missing" when its file is gone (#33). */
export function StatusBadge({ status, id }: { status: DownloadStatus; id?: string }) {
  const missing = useDownloadsStore(
    (s) => status === "completed" && id !== undefined && s.missingIds.includes(id)
  );
  const { label, dot } = missing
    ? { label: "File missing", dot: "bg-warning" }
    : config[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] text-ink-mid"
      title={missing ? "The file is no longer in its folder (moved or deleted)" : undefined}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}
