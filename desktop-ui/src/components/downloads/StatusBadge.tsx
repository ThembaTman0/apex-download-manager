import { cn } from "@/lib/utils";
import type { DownloadStatus } from "@/types";

const config: Record<DownloadStatus, { label: string; dot: string }> = {
  downloading: { label: "Downloading", dot: "bg-[#39BAE6]" },
  paused: { label: "Paused", dot: "bg-[#FF8F40]" },
  completed: { label: "Completed", dot: "bg-[#7FD962]" },
  failed: { label: "Failed", dot: "bg-[#F07178]" },
  queued: { label: "Queued", dot: "bg-[#565B66]" },
  merging: { label: "Merging", dot: "bg-[#E6B450]" },
};

export function StatusBadge({ status }: { status: DownloadStatus }) {
  const { label, dot } = config[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#BFBDB6]">
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}
