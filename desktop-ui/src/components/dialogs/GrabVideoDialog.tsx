import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clapperboard,
  Download,
  FolderOpen,
  Link2,
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl("");
    setProbe(null);
    setError(null);
    setProbing(false);
    setBusy(false);
    setSelected(0);
    setSaveDir(settings?.downloadDir ?? "");
    backend.ytdlpStatus().then(setTools).catch(() => setTools(null));
    // Convenience: pre-fill from clipboard when it holds a URL.
    import("@tauri-apps/plugin-clipboard-manager")
      .then(({ readText }) => readText())
      .then((text) => {
        if (text && /^https?:\/\/\S+$/i.test(text.trim())) setUrl(text.trim());
      })
      .catch(() => {});
  }, [open, settings?.downloadDir]);

  const ytdlpMissing = tools !== null && !tools.ytdlpPath;

  const analyze = async () => {
    if (!/^https?:\/\/\S+$/i.test(url.trim())) {
      setError("Enter a valid http(s) video page URL");
      return;
    }
    setProbing(true);
    setError(null);
    setProbe(null);
    try {
      const p = await backend.probeVideo(url.trim());
      setProbe(p);
      setSelected(0);
    } catch (e) {
      setError(String(e));
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
      await addVideo(url.trim(), probe.title, opt.ext, opt.selector, saveDir || undefined);
      setOpen(false);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

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
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] overflow-y-auto rounded-xl bg-[#0F131A] border border-white/[0.08] shadow-2xl shadow-black/40 p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title className="text-base font-semibold text-[#E6E1CF] flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#E6B450] flex items-center justify-center">
                      <Clapperboard className="w-4 h-4 text-[#0B0E14]" />
                    </span>
                    Grab Video
                  </Dialog.Title>
                  <Dialog.Close className="text-[#8A9199] hover:text-[#E6E1CF] transition-colors">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>

                {ytdlpMissing ? (
                  <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 mb-5">
                    <p className="text-sm text-[#E6E1CF] mb-1.5 font-medium">
                      yt-dlp is not installed
                    </p>
                    <p className="text-xs text-[#8A9199] leading-relaxed mb-3">
                      The video grabber uses yt-dlp to fetch video and audio from
                      YouTube and a thousand other sites. Install it once under
                      Settings → Video Grabber.
                    </p>
                    <button
                      onClick={() => {
                        setOpen(false);
                        setActiveNav("settings");
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#E6B450] hover:bg-[#F0C266] text-[#0B0E14] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      Open Settings
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="block mb-4">
                      <span className="text-xs font-medium text-[#8A9199] mb-1.5 block">
                        Video page URL
                      </span>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A9199]" />
                          <input
                            autoFocus
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !probing) analyze();
                            }}
                            placeholder="https://www.youtube.com/watch?v=…"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] placeholder:text-[#8A9199]/50 pl-9 pr-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors"
                          />
                        </div>
                        <button
                          onClick={analyze}
                          disabled={probing}
                          className="px-3.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.1] disabled:opacity-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
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
                      <p className="text-xs text-[#8A9199] mb-4 flex items-center gap-2">
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
                            <p className="text-sm text-[#E6E1CF] font-medium line-clamp-2">
                              {probe.title}
                            </p>
                            <p className="text-[11px] text-[#8A9199] mt-0.5">
                              {[
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

                        <div className="mb-4">
                          <span className="text-xs font-medium text-[#8A9199] mb-1.5 block">
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
                                    ? "bg-[#E6B450]/10"
                                    : "hover:bg-white/[0.03]"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-3.5 h-3.5 rounded-full border-2 shrink-0",
                                    i === selected
                                      ? "border-[#E6B450] bg-[#E6B450]"
                                      : "border-[#8A9199]/50"
                                  )}
                                />
                                {opt.audioOnly ? (
                                  <Music className="w-3.5 h-3.5 text-[#8A9199] shrink-0" />
                                ) : (
                                  <Clapperboard className="w-3.5 h-3.5 text-[#8A9199] shrink-0" />
                                )}
                                <span className="text-sm text-[#E6E1CF] font-medium">
                                  {opt.label}
                                </span>
                                <span className="text-[10px] text-[#8A9199] uppercase border border-white/[0.1] rounded px-1 py-px">
                                  {opt.ext}
                                </span>
                                <span className="text-xs text-[#8A9199] ml-auto tabular-nums">
                                  {opt.sizeBytes ? `≈ ${formatBytes(opt.sizeBytes)}` : ""}
                                </span>
                              </button>
                            ))}
                          </div>
                          {!probe.hasFfmpeg && (
                            <p className="text-[10px] text-[#FF8F40]/90 mt-1.5 leading-relaxed">
                              FFmpeg is not installed, so only qualities that come as a
                              single file are offered. Install it under Settings → Video
                              Grabber to unlock the highest resolutions.
                            </p>
                          )}
                        </div>

                        <label className="block mb-5">
                          <span className="text-xs font-medium text-[#8A9199] mb-1.5 block">
                            Save to
                          </span>
                          <div className="flex gap-2">
                            <input
                              value={saveDir}
                              onChange={(e) => setSaveDir(e.target.value)}
                              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] px-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors"
                            />
                            <button
                              onClick={browse}
                              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.1] transition-colors"
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
                  <p className="text-xs text-[#F07178] mb-4 break-all">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.06] transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  {probe && (
                    <button
                      disabled={busy}
                      onClick={grab}
                      className="px-5 py-2 rounded-lg bg-[#E6B450] hover:bg-[#F0C266] text-[#0B0E14] text-sm font-semibold disabled:opacity-60 flex items-center gap-2 transition-colors"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {busy ? "Starting…" : "Download"}
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
