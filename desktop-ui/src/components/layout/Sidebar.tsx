import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Download,
  Settings,
  HardDrive,
} from "lucide-react";
import { LogoBadge } from "@/components/ui/LogoMark";
import { cn, formatBytes } from "@/lib/utils";
import { useDownloadsStore } from "@/stores/downloadsStore";
import type { NavItem } from "@/types";

interface NavEntry {
  id: NavItem;
  label: string;
  icon: React.ElementType;
}

const navItems: NavEntry[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { activeNav, setActiveNav } = useDownloadsStore();

  return (
    <aside className="flex flex-col flex-1 py-4 gap-1 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 mb-4">
        <LogoBadge className="w-7 h-7" />
        <div>
          <p className="text-sm font-bold text-ink leading-none">Apex</p>
          <p className="text-[10px] text-ink-muted leading-none mt-0.5">Download Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={cn(
                "relative flex items-center gap-3 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-left w-full",
                active
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-white/[0.06]"
                  transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}
                />
              )}
              <Icon className="w-4 h-4 shrink-0 relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Disk usage */}
      <DiskUsageWidget />
    </aside>
  );
}

function DiskUsageWidget() {
  const diskUsage = useDownloadsStore((s) => s.diskUsage);
  if (!diskUsage || diskUsage.totalBytes === 0) return null;

  const pct = Math.round((diskUsage.usedBytes / diskUsage.totalBytes) * 100);

  return (
    <div className="mx-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="w-3.5 h-3.5 text-ink-muted" />
        <span className="text-xs text-ink-muted font-medium">
          Disk {diskUsage.label}
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden mb-1.5">
        <motion.div
          className="h-full bg-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-ink-muted">
          {formatBytes(diskUsage.usedBytes)} used
        </span>
        <span className="text-[10px] text-ink-muted">{pct}%</span>
      </div>
    </div>
  );
}
