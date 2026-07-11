import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DownloadStatus } from "@/types";

interface Props {
  progress: number;
  status: DownloadStatus;
}

export function ProgressCell({ progress, status }: Props) {
  const color =
    status === "completed"
      ? "bg-success"
      : status === "failed"
      ? "bg-error"
      : status === "paused"
      ? "bg-warning"
      : "bg-accent";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
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
  );
}
