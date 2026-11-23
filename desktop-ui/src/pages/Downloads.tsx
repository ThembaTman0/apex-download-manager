import { motion } from "framer-motion";
import { DownloadsTable } from "@/components/downloads/DownloadsTable";
import { DetailsPanel } from "@/components/downloads/DetailsPanel";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
] as const;

const CATEGORIES: ("all" | Category)[] = [
  "all",
  "Video",
  "Music",
  "Programs",
  "Archives",
  "Documents",
  "Images",
  "Other",
];

export function DownloadsPage() {
  const statusFilter = useDownloadsStore((s) => s.statusFilter);
  const setStatusFilter = useDownloadsStore((s) => s.setStatusFilter);
  const categoryFilter = useDownloadsStore((s) => s.categoryFilter);
  const setCategoryFilter = useDownloadsStore((s) => s.setCategoryFilter);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Status is a segmented control, type a dropdown: one line at any
          window width (13 chips used to wrap onto a second row). */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          role="group"
          aria-label="Filter by status"
          className="flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
        >
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.id}
              label={f.label}
              active={statusFilter === f.id}
              onClick={() => setStatusFilter(f.id)}
            />
          ))}
        </div>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-[11px] text-ink-muted">
          Type
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | Category)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium outline-none transition-colors [color-scheme:dark] focus:border-accent/50",
              categoryFilter === "all"
                ? "bg-white/[0.03] border-white/[0.06] text-ink-mid"
                : "bg-accent/[0.12] border-accent/30 text-accent"
            )}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-raised text-ink">
                {c === "all" ? "Any type" : c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex-1 overflow-hidden mx-4 mb-4 rounded-[10px] bg-card border border-white/[0.06] flex">
        <DownloadsTable />
        <DetailsPanel />
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative px-3 py-1 rounded-md text-[11px] font-medium transition-colors",
        active ? "text-ink" : "text-ink-muted hover:text-ink"
      )}
    >
      {/* Same sliding pill as the sidebar, so filters feel like the nav. */}
      {active && (
        <motion.span
          layoutId="status-filter-active"
          className="absolute inset-0 rounded-md bg-white/[0.08] border border-white/[0.08]"
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        />
      )}
      <span className="relative">{label}</span>
    </button>
  );
}
