import { motion } from "framer-motion";
import { StatsCards } from "@/components/ui/StatsCards";
import { SpeedChart, FileTypesCard } from "@/components/analytics/Charts";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { ProgressCell } from "@/components/downloads/ProgressCell";
import { StatusBadge } from "@/components/downloads/StatusBadge";
import { formatBytes } from "@/lib/utils";
import { LogoMark } from "@/components/ui/LogoMark";

export function DashboardPage() {
  const downloads = useDownloadsStore((s) => s.downloads);
  const recent = downloads.slice(0, 6);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <StatsCards />
      <div className="px-4 pb-4 flex flex-col gap-4">
        <SpeedChart />
        <div className="grid grid-cols-2 gap-4 items-start">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="rounded-[10px] bg-card border border-white/[0.06] overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-ink">Recent Downloads</h2>
            </div>
            {recent.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <LogoMark className="w-20 text-ink opacity-30 select-none" />
                <p className="text-xs text-ink-faint text-center">
                  No downloads yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {recent.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-4 px-5 py-2.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium truncate">{d.name}</p>
                      <p className="text-[10px] text-ink-muted mt-0.5">
                        {d.sizeBytes > 0 ? formatBytes(d.sizeBytes) : "-"}
                      </p>
                    </div>
                    <div className="w-28 shrink-0">
                      <ProgressCell progress={d.progress} status={d.status} />
                    </div>
                    <div className="w-24 shrink-0">
                      <StatusBadge status={d.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
          <FileTypesCard />
        </div>
      </div>
    </div>
  );
}
