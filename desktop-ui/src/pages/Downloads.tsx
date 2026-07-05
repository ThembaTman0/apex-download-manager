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
      <div className="flex items-center gap-1.5 px-4 py-3 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            active={statusFilter === f.id}
            onClick={() => setStatusFilter(f.id)}
          />
        ))}
        <div className="w-px h-4 bg-white/[0.08] mx-1.5" />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c === "all" ? "Any type" : c}
            active={categoryFilter === c}
            onClick={() => setCategoryFilter(c)}
          />
        ))}
      </div>
      <div className="flex-1 overflow-hidden mx-4 mb-4 rounded-[10px] bg-[#151B26] border border-white/[0.06] flex">
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
      className={cn(
        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border",
        active
          ? "bg-white/[0.08] border-white/25 text-white"
          : "bg-white/[0.03] border-white/[0.07] text-[#94A3B8] hover:text-white hover:bg-white/[0.06]"
      )}
    >
      {label}
    </button>
  );
}
