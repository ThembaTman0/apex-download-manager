import type { Segment } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  segments: Segment[];
  className?: string;
}

/**
 * Proportional map of the file: each block is one connection's byte range,
 * sized by its share of the file and filled by its own progress. Dynamic
 * re-splitting shows up live as blocks subdividing.
 */
export function SegmentMap({ segments, className }: Props) {
  if (segments.length < 2) return null;
  const start = segments[0].start;
  const span = Math.max(...segments.map((s) => s.end)) - start + 1;
  if (span <= 0) return null;
  return (
    <div className={cn("flex w-full gap-px", className)}>
      {segments.map((s) => {
        const len = s.end - s.start + 1;
        const pct = len > 0 ? Math.min(100, (s.downloaded / len) * 100) : 0;
        return (
          <div
            key={s.start}
            className="h-full bg-white/[0.07] first:rounded-l-full last:rounded-r-full overflow-hidden"
            style={{ width: `${(len / span) * 100}%` }}
          >
            <div
              className={cn(
                "h-full transition-[width] duration-500",
                pct >= 100 ? "bg-success/60" : "bg-accent"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
