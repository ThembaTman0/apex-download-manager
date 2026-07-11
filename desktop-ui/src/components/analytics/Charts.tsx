import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { formatSpeed } from "@/lib/utils";

// Chart mark colors validated for CVD + contrast on the card surface (see
// dataviz checks). Recharts needs literal values, so these mirror the
// @theme tokens in index.css (--color-info / --color-ink-muted / --color-card).
const CYAN = "#39BAE6";
const GRAY = "#8A9199";
const CARD = "#0F131A";

export function SpeedChart() {
  const speedHistory = useDownloadsStore((s) => s.speedHistory);
  const chartData = speedHistory.map((s) => ({ time: s.time, speed: s.speed }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="rounded-[10px] bg-card border border-white/[0.06] p-5"
    >
      <h2 className="text-sm font-semibold text-ink mb-1">Download Speed</h2>
      <p className="text-[11px] text-ink-muted mb-4">
        Combined transfer rate · last 2 minutes
      </p>
      <div className="h-48">
        {chartData.length < 2 ? (
          <div className="h-full flex items-center justify-center text-xs text-ink-faint">
            Speed data appears once downloads are running
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CYAN} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleTimeString([], {
                    minute: "2-digit",
                    second: "2-digit",
                  })
                }
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: GRAY, fontSize: 10 }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) => (v > 0 ? formatSpeed(v) : "0")}
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: GRAY, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { time: number; speed: number };
                  return (
                    <div className="rounded-lg bg-raised border border-white/[0.08] px-3 py-2 text-xs shadow-xl">
                      <p className="text-ink-muted">
                        {new Date(p.time).toLocaleTimeString()}
                      </p>
                      <p className="text-ink font-semibold tabular-nums">
                        {formatSpeed(p.speed)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="speed"
                stroke={CYAN}
                strokeWidth={2}
                fill="url(#speedFill)"
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, fill: CYAN, stroke: CARD, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

export function FileTypesCard() {
  const downloads = useDownloadsStore((s) => s.downloads);

  const typeDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of downloads) {
      counts.set(d.type, (counts.get(d.type) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6);
    const otherCount = sorted.slice(6).reduce((a, [, n]) => a + n, 0);
    if (otherCount > 0) top.push(["Other", otherCount]);
    return top;
  }, [downloads]);

  const maxTypeCount = Math.max(1, ...typeDist.map(([, n]) => n));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="rounded-[10px] bg-card border border-white/[0.06] p-5"
    >
      <h2 className="text-sm font-semibold text-ink mb-1">File Types</h2>
      <p className="text-[11px] text-ink-muted mb-4">Downloads by extension</p>
      {typeDist.length === 0 ? (
        <p className="text-xs text-ink-faint py-6 text-center">No downloads yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {typeDist.map(([type, count]) => (
            <div
              key={type}
              className="flex items-center gap-3 group"
              title={`${type}: ${count}`}
            >
              <span className="w-14 text-xs text-ink-muted font-mono text-right shrink-0">
                {type}
              </span>
              <div className="flex-1 h-4 flex items-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxTypeCount) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-3.5 rounded-[4px] min-w-[3px] group-hover:opacity-80 transition-opacity"
                  style={{ background: GRAY }}
                />
              </div>
              <span className="w-8 text-xs text-ink tabular-nums shrink-0">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
