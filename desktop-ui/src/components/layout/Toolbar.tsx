import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Clapperboard,
  ListOrdered,
  Pause,
  PauseCircle,
  Play,
  PlayCircle,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDownloadsStore } from "@/stores/downloadsStore";
import type { QueueDoneAction } from "@/types";

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
    setVideoDialogOpen,
    setDeleteDialogOpen,
    settings,
    saveSettings,
    setLastError,
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
    <div className="flex items-center gap-1 px-3 py-1.5 bg-surface border-b border-white/[0.06] shrink-0">
      <button
        onClick={() => setAddDialogOpen(true)}
        title="Add URL"
        aria-label="Add URL"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-accent hover:bg-accent-hover text-on-accent transition-colors whitespace-nowrap"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Add URL</span>
      </button>

      <button
        onClick={() => setVideoDialogOpen(true)}
        title="Download video/audio from YouTube and other sites"
        aria-label="Grab Video"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-ink transition-colors ml-1 whitespace-nowrap"
      >
        <Clapperboard className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Grab Video</span>
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

      {settings && (
        <>
          <div className="w-px h-4 bg-white/[0.08] mx-1.5" />

          {/* Queue: how many run at once; the rest wait their turn */}
          <QueueSelect
            icon={ListOrdered}
            title="How many downloads run at once — the rest wait in the queue"
            value={String(settings.maxConcurrent)}
            onChange={(v) =>
              saveSettings({ ...settings, maxConcurrent: Number(v) }).catch((e) =>
                setLastError(String(e))
              )
            }
            options={Array.from({ length: 10 }, (_, i) => ({
              value: String(i + 1),
              label: i === 0 ? "1 at a time" : `${i + 1} at once`,
            }))}
          />

          {/* Post-queue power action, with a cancellable countdown */}
          <QueueSelect
            icon={Power}
            title="Run when the last download finishes (30s cancellable countdown)"
            active={settings.queueDoneAction !== "none"}
            value={settings.queueDoneAction}
            onChange={(v) =>
              saveSettings({
                ...settings,
                queueDoneAction: v as QueueDoneAction,
              }).catch((e) => setLastError(String(e)))
            }
            options={[
              { value: "none", label: "When done: nothing" },
              { value: "sleep", label: "When done: sleep" },
              { value: "hibernate", label: "When done: hibernate" },
              { value: "shutdown", label: "When done: shut down" },
            ]}
          />
        </>
      )}

      <div className="flex-1" />

      {/* Search — scoped to this list */}
      <div
        className={cn(
          "relative flex items-center w-52 rounded-md border bg-white/[0.04] transition-colors",
          focused ? "border-accent/50" : "border-white/[0.08]"
        )}
      >
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-ink-muted" />
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search downloads"
          aria-label="Search downloads"
          className="w-full bg-transparent text-xs text-ink placeholder:text-ink-faint pl-8 pr-12 py-1.5 outline-none"
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="absolute right-2.5 text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="absolute right-2 text-[10px] text-ink-faint border border-white/[0.08] rounded px-1 select-none">
            Ctrl F
          </kbd>
        )}
      </div>

      <span className="text-[11px] text-ink-faint tabular-nums ml-2 shrink-0">
        {hasSelection
          ? `${selected.length} of ${downloads.length} selected`
          : `${downloads.length} item${downloads.length !== 1 ? "s" : ""}`}
      </span>
    </div>
  );
}

function QueueSelect({
  icon: Icon,
  title,
  value,
  onChange,
  options,
  active,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  active?: boolean;
}) {
  return (
    <label
      title={title}
      className={cn(
        "relative flex items-center gap-1.5 pl-2 max-xl:pr-2 max-xl:py-1.5 rounded-md border bg-white/[0.04] cursor-pointer transition-colors",
        active
          ? "border-warning/40 text-warning"
          : "border-white/[0.08] text-ink-muted hover:text-ink"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <ChevronDown className="w-3 h-3 shrink-0 xl:hidden" />
      {/* Below xl the select overlays the whole control invisibly so the
          native dropdown still opens from the icon-only trigger. */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={title}
        className={cn(
          "bg-transparent text-xs font-medium outline-none cursor-pointer [color-scheme:dark] xl:py-1.5 xl:pr-1.5 max-xl:absolute max-xl:inset-0 max-xl:w-full max-xl:opacity-0",
          active ? "text-warning" : "text-inherit"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-raised text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
      title={label}
      aria-label={label}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
        disabled
          ? "opacity-30 cursor-not-allowed text-ink-muted"
          : danger
          ? "text-ink-muted hover:bg-error/10 hover:text-error-soft"
          : "text-ink-muted hover:bg-white/[0.06] hover:text-ink"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}
