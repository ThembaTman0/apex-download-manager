import { cn } from "@/lib/utils";
import type { DownloadStatus } from "@/types";

const config: Record<DownloadStatus, { label: string; dot: string }> = {
  downloading: { label: "Downloading", dot: "bg-cyan-400" },
  paused: { label: "Paused", dot: "bg-yellow-400" },
  completed: { label: "Completed", dot: "bg-green-400" },
  failed: { label: "Failed", dot: "bg-red-400" },
  queued: { label: "Queued", dot: "bg-[#64748b]" },
  merging: { label: "Merging", dot: "bg-[#cbd5e1]" },
};

export function StatusBadge({ status }: { status: DownloadStatus }) {
  const { label, dot } = config[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#cbd5e1]">
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}
