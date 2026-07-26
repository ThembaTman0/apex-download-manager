import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clapperboard,
  Download,
  FolderOpen,
  Link2,
  ListVideo,
  Loader2,
  Music,
  Search,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { backend } from "@/services/backend";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { cn, formatBytes } from "@/lib/utils";
import type { ToolsStatus, VideoProbe } from "@/types";

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export function GrabVideoDialog() {
  const open = useDownloadsStore((s) => s.videoDialogOpen);
  const setOpen = useDownloadsStore((s) => s.setVideoDialogOpen);
  const pendingVideoUrl = useDownloadsStore((s) => s.pendingVideoUrl);
  const settings = useDownloadsStore((s) => s.settings);
  const addVideo = useDownloadsStore((s) => s.addVideo);
  const setActiveNav = useDownloadsStore((s) => s.setActiveNav);

  const [url, setUrl] = useState("");
  const [saveDir, setSaveDir] = useState("");
  const [tools, setTools] = useState<ToolsStatus | null>(null);
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<VideoProbe | null>(null);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [updateHint, setUpdateHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(0);
  /** Playlist entries the user unticked (indices into probe.playlist). */
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setUrl("");
    setProbe(null);
    setError(null);
    setUpdateHint(false);
    setProbing(false);
    setBusy(false);
    setQueued(0);
    setSelected(0);
    setExcluded(new Set());
    setSaveDir(settings?.downloadDir ?? "");
    backend.ytdlpStatus().then(setTools).catch(() => setTools(null));
    if (pendingVideoUrl) {
      // Handed off by the browser extension — skip straight to the probe.
      setUrl(pendingVideoUrl);
      analyze(pendingVideoUrl);
      return;
    }
    // Convenience: pre-fill from clipboard when it holds a URL.
    import("@tauri-apps/plugin-clipboard-manager")
      .then(({ readText }) => readText())
      .then((text) => {
        if (text && /^https?:\/\/\S+$/i.test(text.trim())) setUrl(text.trim());
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, settings?.downloadDir, pendingVideoUrl]);

  const ytdlpMissing = tools !== null && !tools.ytdlpPath;

  const analyze = async (target?: string) => {
    const u = (target ?? url).trim();
    if (!/^https?:\/\/\S+$/i.test(u)) {
      setError("Enter a valid http(s) video page URL");
      return;
    }
    setProbing(true);
    setError(null);
    setUpdateHint(false);
    setProbe(null);
    setExcluded(new Set());
    try {
      const p = await backend.probeVideo(u);
      setProbe(p);
      setSelected(0);
    } catch (e) {
      setError(String(e));
      // Stale yt-dlp is the usual culprit when a site stops working.
      backend
        .ytdlpCheckUpdate()
        .then((u) => setUpdateHint(u.outdated))
        .catch(() => {});
    } finally {
      setProbing(false);
    }
  };

  const grab = async () => {
    if (!probe) return;
    const opt = probe.options[selected];
    if (!opt) return;
    setBusy(true);
    setError(null);
    try {
      if (probe.playlist) {
        const picked = probe.playlist.filter((_, i) => !excluded.has(i));
        let n = 0;
        for (const entry of picked) {
          setQueued(++n);
          await addVideo(entry.url, entry.title, opt.ext, opt.selector, saveDir || undefined);
        }
      } else {
        await addVideo(url.trim(), probe.title, opt.ext, opt.selector, saveDir || undefined);
      }
      setOpen(false);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  const pickedCount = probe?.playlist
    ? probe.playlist.length - excluded.size
    : 1;

  const browse = async () => {
    const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
    const dir = await openDialog({
      directory: true,
      defaultPath: saveDir || undefined,
      title: "Choose download folder",
    });
    if (typeof dir === "string") setSaveDir(dir);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.18 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] overflow-y-auto rounded-xl bg-card border border-white/[0.08] shadow-2xl shadow-black/40 p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title className="text-base font-semibold text-ink flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                      <Clapperboard className="w-4 h-4 text-on-accent" />
                    </span>
                    Grab Video
                  </Dialog.Title>
                  <Dialog.Close aria-label="Close" className="text-ink-muted hover:text-ink transition-colors">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>

                {ytdlpMissing ? (
                  <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 mb-5">
                    <p className="text-sm text-ink mb-1.5 font-medium">
                      yt-dlp is not installed
                    </p>
                    <p className="text-xs text-ink-muted leading-relaxed mb-3">
                      The video grabber uses yt-dlp to fetch video and audio from
                      YouTube and a thousand other sites. Install it once under
                      Settings → Video Grabber.
                    </p>
                    <button
                      onClick={() => {
                        setOpen(false);
                        setActiveNav("settings");
                      }}
                      className="px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      Open Settings
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="block mb-4">
                      <span className="text-xs font-medium text-ink-muted mb-1.5 block">
                        Video page URL
                      </span>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-3 top-3 w-3.5 h-3.5 text-ink-muted" />
                          <input
                            autoFocus
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !probing) analyze();
                            }}
                            placeholder="https://www.youtube.com/watch?v=…"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink placeholder:text-ink-faint pl-9 pr-3 py-2.5 outline-none focus:border-accent/50 transition-colors"
                          />
                        </div>
                        <button
                          onClick={() => analyze()}
                          disabled={probing}
                          className="px-3.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-ink-muted hover:text-ink hover:bg-white/[0.1] disabled:opacity-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          {probing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          Analyze
                        </button>
                      </div>
                    </label>

                    {probing && (
                      <p className="text-xs text-ink-muted mb-4 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Fetching available formats…
                      </p>
                    )}

                    {probe && (
                      <>
                        <div className="flex gap-3 mb-4 rounded-lg bg-white/[0.04] border border-white/[0.08] p-3">
                          {probe.thumbnail && (
                            <img
                              src={probe.thumbnail}
                              alt=""
                              className="w-24 h-14 object-cover rounded-md shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-ink font-medium line-clamp-2">
                              {probe.title}
                            </p>
                            <p className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1">
                              {probe.playlist && <ListVideo className="w-3 h-3" />}
                              {[
                                probe.playlist
                                  ? `Playlist · ${probe.playlist.length} video${
                                      probe.playlist.length !== 1 ? "s" : ""
                                    }`
                                  : null,
                                probe.uploader,
                                probe.durationSeconds
                                  ? formatDuration(probe.durationSeconds)
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>

                        {probe.playlist && (
                          <div className="mb-4">
                            <span className="text-xs font-medium text-ink-muted mb-1.5 flex items-center">
                              Videos ({pickedCount} of {probe.playlist.length} selected)
                              <button
                                type="button"
                                onClick={() =>
                                  setExcluded(
                                    excluded.size > 0
                                      ? new Set()
                                      : new Set(probe.playlist!.map((_, i) => i))
                                  )
                                }
                                className="ml-auto text-[11px] text-ink-muted hover:text-ink transition-colors"
                              >
                                {excluded.size > 0 ? "Select all" : "Select none"}
                              </button>
                            </span>
                            <div className="rounded-lg border border-white/[0.08] divide-y divide-white/[0.04] overflow-y-auto max-h-44">
                              {probe.playlist.map((entry, i) => (
                                <label
                                  key={i}
                                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-white/[0.03] transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={!excluded.has(i)}
                                    onChange={(e) => {
                                      const next = new Set(excluded);
                                      if (e.target.checked) next.delete(i);
                                      else next.add(i);
                                      setExcluded(next);
                                    }}
                                    className="accent-accent w-3.5 h-3.5 shrink-0"
                                  />
                                  <span className="text-xs text-ink truncate flex-1">
                                    {entry.title}
                                  </span>
                                  {entry.durationSeconds != null && (
                                    <span className="text-[10px] text-ink-muted tabular-nums shrink-0">
                                      {formatDuration(entry.durationSeconds)}
                                    </span>
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mb-4">
                          <span className="text-xs font-medium text-ink-muted mb-1.5 block">
                            Quality
                          </span>
                          <div className="rounded-lg border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                            {probe.options.map((opt, i) => (
                              <button
                                key={opt.selector + opt.label}
                                onClick={() => setSelected(i)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                                  i === selected
                                    ? "bg-accent/10"
                                    : "hover:bg-white/[0.03]"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-3.5 h-3.5 rounded-full border-2 shrink-0",
                                    i === selected
                                      ? "border-accent bg-accent"
                                      : "border-ink-muted/50"
                                  )}
                                />
                                {opt.audioOnly ? (
                                  <Music className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                                ) : (
                                  <Clapperboard className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                                )}
                                <span className="text-sm text-ink font-medium">
                                  {opt.label}
                                </span>
                                <span className="text-[10px] text-ink-muted uppercase border border-white/[0.1] rounded px-1 py-px">
                                  {opt.ext}
                                </span>
                                <span className="text-xs text-ink-muted ml-auto tabular-nums">
                                  {opt.sizeBytes ? `≈ ${formatBytes(opt.sizeBytes)}` : ""}
                                </span>
                              </button>
                            ))}
                          </div>
                          {!probe.hasFfmpeg && (
                            <p className="text-[10px] text-warning/90 mt-1.5 leading-relaxed">
                              FFmpeg is not installed, so only qualities that come as a
                              single file are offered. Install it under Settings → Video
                              Grabber to unlock the highest resolutions.
                            </p>
                          )}
                        </div>

                        <label className="block mb-5">
                          <span className="text-xs font-medium text-ink-muted mb-1.5 block">
                            Save to
                          </span>
                          <div className="flex gap-2">
                            <input
                              value={saveDir}
                              onChange={(e) => setSaveDir(e.target.value)}
                              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink px-3 py-2.5 outline-none focus:border-accent/50 transition-colors"
                            />
                            <button
                              onClick={browse}
                              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-ink-muted hover:text-ink hover:bg-white/[0.1] transition-colors"
                              title="Browse…"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                          </div>
                        </label>
                      </>
                    )}
                  </>
                )}

                {error && (
                  <p className="text-xs text-error-soft mb-4 break-all">{error}</p>
                )}
                {updateHint && (
                  <p className="text-[11px] text-warning mb-4">
                    A yt-dlp update is available. Sites change often, and updating
                    usually fixes this. Settings → Video Grabber → Update.
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  {probe && (
                    <button
                      disabled={busy || pickedCount === 0}
                      onClick={grab}
                      className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold disabled:opacity-60 flex items-center gap-2 transition-colors"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {busy
                        ? probe.playlist
                          ? `Queueing ${queued}/${pickedCount}…`
                          : "Starting…"
                        : probe.playlist && pickedCount > 1
                        ? `Download ${pickedCount} Videos`
                        : "Download"}
                    </button>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
