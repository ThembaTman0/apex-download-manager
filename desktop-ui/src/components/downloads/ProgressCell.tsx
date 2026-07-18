import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DownloadStatus, Segment } from "@/types";
import { SegmentMap } from "./SegmentMap";

interface Props {
  progress: number;
  status: DownloadStatus;
  segments?: Segment[];
}

export function ProgressCell({ progress, status, segments }: Props) {
  const color =
    status === "completed"
      ? "bg-success"
      : status === "failed"
      ? "bg-error"
      : status === "paused"
      ? "bg-warning"
      : "bg-accent";

  const showMap =
    status === "downloading" && segments !== undefined && segments.length > 1;

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", color)}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs text-ink-muted w-8 text-right tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
      {showMap && (
        <div className="flex items-center gap-2 mt-1">
          <SegmentMap segments={segments} className="flex-1 h-[3px]" />
          <span className="w-8" />
        </div>
      )}
    </div>
  );
}
