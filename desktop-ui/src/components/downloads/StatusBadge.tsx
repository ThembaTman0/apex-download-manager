import { cn } from "@/lib/utils";
import type { DownloadStatus } from "@/types";

const config: Record<DownloadStatus, { label: string; dot: string }> = {
  downloading: { label: "Downloading", dot: "bg-info" },
  paused: { label: "Paused", dot: "bg-warning" },
  completed: { label: "Completed", dot: "bg-success" },
  failed: { label: "Failed", dot: "bg-error-soft" },
  queued: { label: "Queued", dot: "bg-ink-dim" },
  merging: { label: "Merging", dot: "bg-accent" },
};

export function StatusBadge({ status }: { status: DownloadStatus }) {
  const { label, dot } = config[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-mid">
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}
