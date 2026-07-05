import { useEffect, useRef, useState } from "react";
import {
  Pause,
  PauseCircle,
  Play,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDownloadsStore } from "@/stores/downloadsStore";

export function Toolbar() {
  const {
    selectedIds,
    downloads,
    searchQuery,
    setSearchQuery,
    pauseDownload,
    resumeDownload,
    pauseAll,
    resumeAll,
    setAddDialogOpen,
    setDeleteDialogOpen,
  } = useDownloadsStore();

  const selected = [...selectedIds];
  const hasSelection = selected.length > 0;
  const anyRunning = downloads.some(
    (d) => d.status === "downloading" || d.status === "queued"
  );
  const anyResumable = downloads.some(
    (d) => d.status === "paused" || d.status === "failed"
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    const onFocusRequest = () => {
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("apex:focus-search", onFocusRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("apex:focus-search", onFocusRequest);
    };
  }, []);

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-[#0d1117] border-b border-white/[0.06] shrink-0">
      <button
        onClick={() => setAddDialogOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[#E2E8F0] hover:bg-white text-[#0B0F17] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add URL
      </button>

      <div className="w-px h-4 bg-white/[0.08] mx-1.5" />

      <GhostButton
        icon={Play}
        label="Resume"
        disabled={!hasSelection}
        onClick={() => selected.forEach(resumeDownload)}
      />
      <GhostButton
        icon={Pause}
        label="Pause"
        disabled={!hasSelection}
        onClick={() => selected.forEach(pauseDownload)}
      />
      <GhostButton
        icon={Trash2}
        label="Delete"
        danger
        disabled={!hasSelection}
        onClick={() => setDeleteDialogOpen(true)}
      />

      <div className="w-px h-4 bg-white/[0.08] mx-1.5" />

      {anyRunning ? (
        <GhostButton icon={PauseCircle} label="Pause All" onClick={pauseAll} />
      ) : (
        <GhostButton
          icon={PlayCircle}
          label="Resume All"
          disabled={!anyResumable}
          onClick={resumeAll}
        />
      )}

      <div className="flex-1" />

      {/* Search — scoped to this list */}
      <div
        className={cn(
          "relative flex items-center w-52 rounded-md border bg-white/[0.04] transition-colors",
          focused ? "border-white/25" : "border-white/[0.08]"
        )}
      >
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-[#94A3B8]" />
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search downloads"
          className="w-full bg-transparent text-xs text-white placeholder:text-[#94A3B8]/50 pl-8 pr-12 py-1.5 outline-none"
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="absolute right-2 text-[10px] text-[#94A3B8]/50 border border-white/[0.08] rounded px-1 select-none">
            Ctrl F
          </kbd>
        )}
      </div>

      <span className="text-[11px] text-[#94A3B8]/70 tabular-nums ml-2 shrink-0">
        {hasSelection
          ? `${selected.length} of ${downloads.length} selected`
          : `${downloads.length} item${downloads.length !== 1 ? "s" : ""}`}
      </span>
    </div>
  );
}

function GhostButton({
  icon: Icon,
  label,
  danger,
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
        disabled
          ? "opacity-30 cursor-not-allowed text-[#94A3B8]"
          : danger
          ? "text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400"
          : "text-[#94A3B8] hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
