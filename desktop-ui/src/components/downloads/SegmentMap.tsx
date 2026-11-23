import type { Segment } from "@/types";
import { cn, formatBytes } from "@/lib/utils";

/**
 * One row per connection: where in the file it works (a mini track positioned
 * by byte offset) and how far it got. Running ranges pulse amber, finished
 * ones turn green, so re-splitting is visible as new short rows appearing
 * inside the tails of long ones.
 */
export function ConnectionList({
  segments,
  running,
}: {
  segments: Segment[];
  running: boolean;
}) {
  if (segments.length < 2) return null;
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const start = sorted[0].start;
  const span = sorted.reduce((m, s) => Math.max(m, s.end), 0) - start + 1;
  if (span <= 0) return null;

  return (
    <ol className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
      {sorted.map((s, i) => {
        const len = s.end - s.start + 1;
        const got = Math.min(s.downloaded, len);
        const done = got >= len;
        const pct = Math.floor((got / len) * 100);
        const live = running && !done && got > 0;
        return (
          <li
            key={`${s.start}-${s.end}`}
            className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-2 text-[10px] tabular-nums"
            title={`Bytes ${s.start.toLocaleString()} to ${s.end.toLocaleString()} · ${formatBytes(got)} of ${formatBytes(len)}`}
          >
            <span className="flex items-center gap-1 text-ink-faint">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  done ? "bg-success/70" : live ? "bg-accent motion-safe:animate-pulse" : "bg-white/[0.15]"
                )}
              />
              {i + 1}
            </span>
            <div className="relative h-1.5 rounded-full bg-white/[0.05]">
              {/* The connection's own range on the file-wide track, filled to its progress. */}
              <div
                className="absolute inset-y-0 rounded-full bg-white/[0.08]"
                style={{
                  left: `${((s.start - start) / span) * 100}%`,
                  width: `${Math.max((len / span) * 100, 0.6)}%`,
                }}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    done ? "bg-success/60" : "bg-accent"
                  )}
                  style={{ width: `${(got / len) * 100}%` }}
                />
              </div>
            </div>
            <span className={cn("text-right", done ? "text-ink-faint" : "text-ink-mid")}>
              {pct}%
            </span>
          </li>
        );
      })}
    </ol>
  );
}

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
