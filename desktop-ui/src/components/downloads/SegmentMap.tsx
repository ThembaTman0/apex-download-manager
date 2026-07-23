import type { Segment } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  segments: Segment[];
  className?: string;
}

/**
 * Byte-coverage map of the file: colored spans are downloaded ranges, dark is
 * still missing. Spans are positioned by byte offset on one continuous track
 * (adjacent finished ranges merge), so many segments never crowd each other
 * out and a completed file renders as a single solid bar.
 */
export function SegmentMap({ segments, className }: Props) {
  if (segments.length < 2) return null;
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const start = sorted[0].start;
  const span = sorted.reduce((m, s) => Math.max(m, s.end), 0) - start + 1;
  if (span <= 0) return null;

  type Run = { from: number; to: number; done: boolean };
  const runs: Run[] = [];
  for (const s of sorted) {
    if (s.downloaded <= 0) continue;
    const len = s.end - s.start + 1;
    const to = s.start + Math.min(s.downloaded, len);
    const done = s.downloaded >= len;
    const prev = runs[runs.length - 1];
    if (prev && prev.done === done && s.start <= prev.to) {
      prev.to = Math.max(prev.to, to);
    } else {
      runs.push({ from: s.start, to, done });
    }
  }

  return (
    <div
      className={cn(
        "relative w-full rounded-full bg-white/[0.07] overflow-hidden",
        className
      )}
    >
      {runs.map((r) => (
        <div
          key={r.from}
          className={cn(
            "absolute inset-y-0 transition-[width] duration-500",
            r.done ? "bg-success/60" : "bg-accent"
          )}
          style={{
            left: `${((r.from - start) / span) * 100}%`,
            width: `${((r.to - r.from) / span) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
