import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  LayoutDashboard,
  Download,
  Search,
  Settings,
  HardDrive,
  X,
} from "lucide-react";
import {
  SETTINGS_GROUPS,
  SETTINGS_TABS,
  useSettingsNav,
} from "@/stores/settingsNavStore";

// Critically damped: settles without overshoot (nothing was flicked).
const SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;
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
            <div key={item.id}>
              <motion.button
                onClick={() => setActiveNav(item.id)}
                aria-expanded={item.id === "settings" ? active : undefined}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-left w-full",
                  active
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink hover:bg-white/[0.04]"
                )}
              >
                {/* Settings expands instead of taking the pill: its pages
                    below carry the "you are here" marker. */}
                {active && item.id !== "settings" && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-md bg-white/[0.06]"
                    transition={SPRING}
                  />
                )}
                <Icon className="w-4 h-4 shrink-0 relative z-10" />
                <span className="relative z-10 flex-1">{item.label}</span>
                {item.id === "settings" && (
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 relative z-10 text-ink-faint transition-transform duration-200",
                      active && "rotate-90"
                    )}
                  />
                )}
              </motion.button>
              {item.id === "settings" && (
                <AnimatePresence initial={false}>
                  {active && <SettingsSubnav />}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </nav>

      {/* Disk usage */}
      <DiskUsageWidget />
    </aside>
  );
}

/** Settings' own pages, nested under the Settings item while it's open. */
function SettingsSubnav() {
  const { tab, query, setTab, setQuery } = useSettingsNav();
  const searchRef = useRef<HTMLInputElement>(null);
  const searching = query.trim() !== "";

  // "/" jumps to the settings search; Esc (in the box) clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={SPRING}
      className="overflow-hidden"
    >
      <div className="pl-3 pr-0.5 pt-2 pb-1">
        <label className="flex items-center gap-2 mb-1 px-2.5 py-1.5 rounded-md bg-black/25 border border-white/[0.06] focus-within:border-white/[0.14] transition-colors">
          <Search className="w-3.5 h-3.5 text-ink-muted shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search settings"
            aria-label="Search settings"
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent text-[13px] text-ink placeholder:text-ink-muted outline-none"
          />
          {searching ? (
            <button
              onClick={() => setQuery("")}
              className="text-ink-muted hover:text-ink"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="px-1.5 rounded border border-white/[0.1] text-[10px] text-ink-faint font-sans">
              /
            </kbd>
          )}
        </label>

        {SETTINGS_GROUPS.map((g) => (
          <div key={g.label} className="mt-2.5">
            <p className="px-2.5 mb-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
              {g.label}
            </p>
            {g.tabs.map((id) => {
              const t = SETTINGS_TABS.find((x) => x.id === id)!;
              const Icon = t.icon;
              const active = !searching && t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative w-full flex items-center gap-2.5 px-2.5 py-[5px] rounded-md text-[13px] text-left transition-colors",
                    active ? "text-ink" : "text-ink-muted hover:text-ink hover:bg-white/[0.03]"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="settings-sub-active"
                      className="absolute inset-0 rounded-md bg-white/[0.07] border border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]"
                      transition={SPRING}
                    />
                  )}
                  <Icon className={cn("w-3.5 h-3.5 relative z-10", active && "text-accent")} />
                  <span className="relative z-10">{t.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
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
