import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clapperboard,
  CornerDownLeft,
  FileDown,
  LayoutDashboard,
  Download,
  PauseCircle,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
} from "lucide-react";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { SETTINGS_TABS, useSettingsNav } from "@/stores/settingsNavStore";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  group: "Actions" | "Go to" | "Downloads" | "Settings";
  label: string;
  /** Extra words that should match (not shown). */
  keywords?: string;
  hint?: string;
  icon: React.ElementType;
  run: () => void;
}

const GROUP_ORDER: Record<Command["group"], number> = {
  Actions: 0,
  "Go to": 1,
  Downloads: 2,
  Settings: 3,
};

/**
 * Rank a command against the typed text: start of the label best, then the
 * start of any word, then anywhere. -1 = no match. Every typed word must
 * match somewhere, so "pause all" finds "Pause all" but not "Pause".
 */
function score(cmd: Command, q: string): number {
  if (!q) return 0;
  const hay = `${cmd.label} ${cmd.keywords ?? ""}`.toLowerCase();
  let total = 0;
  for (const word of q.split(/\s+/).filter(Boolean)) {
    const at = hay.indexOf(word);
    if (at === -1) return -1;
    total += at === 0 ? 0 : hay[at - 1] === " " ? 1 : 3;
  }
  return total;
}

/** Ctrl+K anywhere in the main window: run an action or jump somewhere. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const downloads = useDownloadsStore((s) => s.downloads);

  // Ctrl+K toggles, even while typing in a field (the usual palette rule).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const s = useDownloadsStore.getState();
    const nav = useSettingsNav.getState();
    const hasPaused = downloads.some((d) => d.status === "paused");
    const hasActive = downloads.some((d) => d.status === "downloading" || d.status === "queued");
    const hasFailed = downloads.some((d) => d.status === "failed");

    const list: Command[] = [
      { id: "add", group: "Actions", label: "Add URL", keywords: "new download link", hint: "Ctrl N", icon: Plus, run: () => s.setAddDialogOpen(true) },
      { id: "video", group: "Actions", label: "Grab Video", keywords: "youtube yt-dlp audio", icon: Clapperboard, run: () => s.setVideoDialogOpen(true) },
    ];
    // Only offer what can apply right now.
    if (hasActive) list.push({ id: "pause-all", group: "Actions", label: "Pause all", keywords: "stop", icon: PauseCircle, run: () => void s.pauseAll() });
    if (hasPaused) list.push({ id: "resume-all", group: "Actions", label: "Resume all", keywords: "start continue", icon: PlayCircle, run: () => void s.resumeAll() });
    if (hasFailed) list.push({ id: "retry", group: "Actions", label: "Retry failed", keywords: "error again", icon: RotateCcw, run: () => void s.retryFailed() });

    list.push(
      { id: "go-dashboard", group: "Go to", label: "Dashboard", icon: LayoutDashboard, run: () => s.setActiveNav("dashboard") },
      { id: "go-downloads", group: "Go to", label: "Downloads", icon: Download, run: () => s.setActiveNav("downloads") },
    );
    for (const t of SETTINGS_TABS) {
      list.push({
        id: `go-settings-${t.id}`,
        group: "Go to",
        label: `Settings: ${t.label}`,
        keywords: t.blurb,
        icon: t.icon,
        run: () => {
          nav.setTab(t.id);
          s.setActiveNav("settings");
        },
      });
    }
    for (const d of downloads) {
      list.push({
        id: `dl-${d.id}`,
        group: "Downloads",
        label: d.name,
        icon: FileDown,
        run: () => {
          s.setActiveNav("downloads");
          s.selectOnly(d.id);
          s.setDetailsId(d.id);
        },
      });
    }
    return list;
    // Rebuilt when the palette opens or the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloads, open]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const matched = commands
      .map((c) => ({ c, s: score(c, q) }))
      .filter((x) => x.s >= 0)
      // Downloads only appear once you type, or the list floods with files.
      .filter((x) => q || x.c.group !== "Downloads")
      // Groups stay in a fixed order (so each header shows once); the best
      // match leads within each group.
      .sort((a, b) => GROUP_ORDER[a.c.group] - GROUP_ORDER[b.c.group] || a.s - b.s)
      .slice(0, 50)
      .map((x) => x.c);
    // Always offer a settings search for what was typed: it reuses the
    // Settings page's own search, so no second list of settings to maintain.
    if (q) {
      matched.push({
        id: "search-settings",
        group: "Settings",
        label: `Search settings for "${query.trim()}"`,
        icon: Search,
        run: () => {
          useSettingsNav.getState().setQuery(query.trim());
          useDownloadsStore.getState().setActiveNav("settings");
        },
      });
    }
    return matched;
  }, [commands, q, query]);

  useEffect(() => setActive(0), [q]);

  // Keep the highlighted row in view while arrowing through.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runAt = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    setOpen(false);
    // Let the palette close before opening another dialog.
    setTimeout(cmd.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(active);
    }
  };

  // Group headers appear where the group changes in the ranked list.
  let lastGroup = "";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="fixed inset-0 bg-black/50 z-50"
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              aria-describedby={undefined}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                className="fixed left-1/2 top-[18%] -translate-x-1/2 z-50 w-[min(560px,calc(100vw-2rem))] rounded-xl bg-raised border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.55)] overflow-hidden"
              >
                <Dialog.Title className="sr-only">Command palette</Dialog.Title>
                <div className="flex items-center gap-2.5 px-4 border-b border-white/[0.06]">
                  <Search className="w-4 h-4 text-ink-muted shrink-0" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Type a command, a download or a setting"
                    spellCheck={false}
                    role="combobox"
                    aria-expanded="true"
                    aria-controls="command-palette-list"
                    aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
                    className="flex-1 bg-transparent py-3.5 text-sm text-ink placeholder:text-ink-faint outline-none"
                  />
                  <kbd className="px-1.5 rounded border border-white/[0.1] text-[10px] text-ink-faint font-sans">
                    Esc
                  </kbd>
                </div>

                <div
                  ref={listRef}
                  id="command-palette-list"
                  role="listbox"
                  className="max-h-[min(380px,55vh)] overflow-y-auto p-1.5"
                >
                  {results.length === 0 && (
                    <p className="py-8 text-center text-xs text-ink-muted">Nothing matches</p>
                  )}
                  {results.map((cmd, i) => {
                    const header = cmd.group !== lastGroup ? cmd.group : null;
                    lastGroup = cmd.group;
                    const Icon = cmd.icon;
                    const isActive = i === active;
                    return (
                      <div key={cmd.id}>
                        {header && (
                          <p className="px-2.5 pt-2 pb-1 text-[10px] uppercase tracking-wide text-ink-faint">
                            {header}
                          </p>
                        )}
                        <div
                          id={`cmd-${cmd.id}`}
                          data-index={i}
                          role="option"
                          aria-selected={isActive}
                          onMouseMove={() => setActive(i)}
                          onClick={() => runAt(i)}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer",
                            isActive ? "bg-white/[0.07] text-ink" : "text-ink-mid"
                          )}
                        >
                          <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-accent" : "text-ink-muted")} />
                          <span className="flex-1 min-w-0 truncate">{cmd.label}</span>
                          {cmd.hint && (
                            <kbd className="px-1.5 rounded border border-white/[0.1] text-[10px] text-ink-faint font-sans">
                              {cmd.hint}
                            </kbd>
                          )}
                          {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-ink-faint" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 px-4 py-2 border-t border-white/[0.06] text-[10px] text-ink-faint">
                  <span>↑ ↓ to move</span>
                  <span>Enter to run</span>
                  <span className="flex-1" />
                  <SettingsIcon className="w-3 h-3" />
                  <span>Type part of a setting to search Settings</span>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
