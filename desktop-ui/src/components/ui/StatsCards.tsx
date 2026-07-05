import { motion } from "framer-motion";
import { Download, CheckCircle, TrendingUp, Clock } from "lucide-react";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { formatBytes, formatSpeed } from "@/lib/utils";

export function StatsCards() {
  const downloads = useDownloadsStore((s) => s.downloads);
  const active = downloads.filter((d) => d.status === "downloading");
  const completed = downloads.filter((d) => d.status === "completed");
  const totalSpeed = active.reduce((a, d) => a + d.speedBytesPerSec, 0);
  const totalDownloaded = downloads.reduce((a, d) => a + d.downloadedBytes, 0);

  const cards = [
    { label: "Active", value: active.length.toString(), sub: "Downloading", icon: Download },
    { label: "Completed", value: completed.length.toString(), sub: "Total files", icon: CheckCircle },
    { label: "Total Speed", value: totalSpeed > 0 ? formatSpeed(totalSpeed) : "—", sub: "Combined", icon: TrendingUp },
    { label: "Downloaded", value: formatBytes(totalDownloaded), sub: "All time", icon: Clock },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 p-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-[10px] bg-[#0F131A] border border-white/[0.06]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#8A9199] font-medium">{card.label}</span>
              <Icon className="w-4 h-4 text-[#8A9199]/70" />
            </div>
            <p className="text-xl font-semibold text-[#E6E1CF] tabular-nums">{card.value}</p>
            <p className="text-[10px] text-[#8A9199] mt-0.5">{card.sub}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
