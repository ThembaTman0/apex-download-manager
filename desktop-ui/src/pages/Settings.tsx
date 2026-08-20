import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  Clapperboard,
  ClipboardCopy,
  Copy,
  Download,
  FolderOpen,
  FolderTree,
  Gauge,
  Globe,
  Layers,
  ListOrdered,
  Loader2,
  Moon,
  Network,
  Power,
  RefreshCw,
  Rocket,
  Save,
  X,
} from "lucide-react";
import { backend } from "@/services/backend";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { formatBytes } from "@/lib/utils";
import type { QueueDoneAction, Settings, ToolsStatus } from "@/types";

export function SettingsPage() {
  const settings = useDownloadsStore((s) => s.settings);
  const saveSettings = useDownloadsStore((s) => s.saveSettings);

  const [form, setForm] = useState<Settings | null>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (!form) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-ink-muted">
        Loading settings…
      </div>
    );
  }

  const update = (patch: Partial<Settings>) => {
    setForm({ ...form, ...patch });
    setSaved(false);
  };

  const browse = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const dir = await open({
      directory: true,
      defaultPath: form.downloadDir || undefined,
      title: "Choose default download folder",
    });
    if (typeof dir === "string") update({ downloadDir: dir });
  };

  const save = async () => {
    setError(null);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto rounded-[10px] bg-card border border-white/[0.06] p-6"
      >
        <h1 className="text-base font-semibold text-ink mb-6">Settings</h1>

        <Field
          icon={FolderOpen}
          label="Default download folder"
          hint="New downloads are saved here unless you choose another folder"
        >
          <div className="flex gap-2">
            <input
              value={form.downloadDir}
              onChange={(e) => update({ downloadDir: e.target.value })}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink px-3 py-2.5 outline-none focus:border-accent/50 transition-colors"
            />
            <button
              onClick={browse}
              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-ink-muted hover:text-ink hover:bg-white/[0.1] transition-colors"
            >
              Browse…
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            icon={ListOrdered}
            label="Max concurrent downloads"
            hint="Others wait in the queue (1–10)"
          >
            <NumberInput
              value={form.maxConcurrent}
              min={1}
              max={10}
              onChange={(v) => update({ maxConcurrent: v })}
            />
          </Field>

          <Field
            icon={Layers}
            label="Connections per download"
            hint="Segments downloaded in parallel (1–32)"
          >
            <NumberInput
              value={form.segmentsPerDownload}
              min={1}
              max={32}
              onChange={(v) => update({ segmentsPerDownload: v })}
            />
          </Field>
        </div>

        <Field
          icon={Gauge}
          label="Speed limit (KB/s)"
          hint="0 = unlimited. Applies to all downloads combined"
        >
          <NumberInput
            value={form.speedLimitKbps}
            min={0}
            max={10_000_000}
            onChange={(v) => update({ speedLimitKbps: v })}
          />
        </Field>

        <Field
          icon={Moon}
          label="Bandwidth scheduler"
          hint="Full speed inside the off-peak window; outside it a lower cap applies automatically"
        >
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.schedulerEnabled}
              onChange={(e) => update({ schedulerEnabled: e.target.checked })}
              className="accent-accent w-4 h-4"
            />
            <span className="text-sm text-ink-mid">
              Limit speed outside off-peak hours
            </span>
          </label>
          {form.schedulerEnabled && (
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <span className="text-[11px] text-ink-muted block mb-1.5">
                  Off-peak from
                </span>
                <input
                  type="time"
                  value={toHHMM(form.offpeakStartMin)}
                  onChange={(e) =>
                    update({ offpeakStartMin: fromHHMM(e.target.value) })
                  }
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink px-3 py-2.5 outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <span className="text-[11px] text-ink-muted block mb-1.5">
                  Until
                </span>
                <input
                  type="time"
                  value={toHHMM(form.offpeakEndMin)}
                  onChange={(e) =>
                    update({ offpeakEndMin: fromHHMM(e.target.value) })
                  }
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink px-3 py-2.5 outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <span className="text-[11px] text-ink-muted block mb-1.5">
                  Peak cap (KB/s)
                </span>
                <NumberInput
                  value={form.peakLimitKbps}
                  min={0}
                  max={10_000_000}
                  onChange={(v) => update({ peakLimitKbps: v })}
                />
              </div>
            </div>
          )}
        </Field>

        <Field
          icon={Network}
          label="Proxy"
          hint="http://host:port or socks5://host:port, with optional user:pass@. Applies to all downloads including video grabbing. Leave empty for a direct connection"
        >
          <input
            value={form.proxyUrl}
            onChange={(e) => update({ proxyUrl: e.target.value })}
            placeholder="Direct connection (no proxy)"
            spellCheck={false}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink font-mono placeholder:text-ink-faint placeholder:font-sans px-3 py-2.5 outline-none focus:border-accent/50 transition-colors"
          />
        </Field>

        <Field icon={Bell} label="Notifications" hint="">
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.notifyOnComplete}
              onChange={(e) => update({ notifyOnComplete: e.target.checked })}
              className="accent-accent w-4 h-4"
            />
            <span className="text-sm text-ink-mid">
              Notify when a download completes
            </span>
          </label>
        </Field>

        <Field
          icon={ClipboardCopy}
          label="Clipboard watcher"
          hint="Offers to grab download links the moment you copy them"
        >
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.watchClipboard}
              onChange={(e) => update({ watchClipboard: e.target.checked })}
              className="accent-accent w-4 h-4"
            />
            <span className="text-sm text-ink-mid">
              Watch clipboard for download URLs
            </span>
          </label>
        </Field>

        <Field
          icon={FolderTree}
          label="Auto-organize"
          hint="Saves into Video, Music, Programs… subfolders automatically"
        >
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.autoOrganize}
              onChange={(e) => update({ autoOrganize: e.target.checked })}
              className="accent-accent w-4 h-4"
            />
            <span className="text-sm text-ink-mid">
              Sort downloads into category folders
            </span>
          </label>
        </Field>

        <Field
          icon={Rocket}
          label="Start with Windows"
          hint="Starts hidden in the tray at sign-in, so browser downloads are captured even before you open Apex"
        >
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.launchAtStartup}
              onChange={(e) => update({ launchAtStartup: e.target.checked })}
              className="accent-accent w-4 h-4"
            />
            <span className="text-sm text-ink-mid">
              Launch Apex when I sign in
            </span>
          </label>
        </Field>

        <Field
          icon={Power}
          label="When queue finishes"
          hint="Runs after the last download completes, with a 30s cancellable countdown"
        >
          <select
            value={form.queueDoneAction}
            onChange={(e) =>
              update({ queueDoneAction: e.target.value as QueueDoneAction })
            }
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink px-3 py-2.5 outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
          >
            <option value="none" className="bg-raised text-ink">Do nothing</option>
            <option value="sleep" className="bg-raised text-ink">Sleep</option>
            <option value="hibernate" className="bg-raised text-ink">Hibernate</option>
            <option value="shutdown" className="bg-raised text-ink">Shut down</option>
          </select>
        </Field>

        <div className="border-t border-white/[0.06] my-6" />
        <AppUpdatesSection />

        <div className="border-t border-white/[0.06] my-6" />
        <VideoGrabberSection />

        <div className="border-t border-white/[0.06] my-6" />
        <h2 className="text-sm font-semibold text-ink mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-ink-muted" />
          Browser Integration
        </h2>
        <p className="text-[11px] text-ink-muted mb-4 leading-relaxed">
          Install the extension from the{" "}
          <code className="text-ink-mid">browser-extension</code> folder
          (Chrome/Edge: chrome://extensions → Load unpacked · Firefox:
          about:debugging → Load Temporary Add-on), then paste this token into
          its popup. Downloads you start in the browser are then captured by
          Apex.
        </p>

        <Field icon={ClipboardCopy} label="Capture" hint="">
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.captureEnabled}
              onChange={(e) => update({ captureEnabled: e.target.checked })}
              className="accent-accent w-4 h-4"
            />
            <span className="text-sm text-ink-mid">
              Accept downloads from the browser extension
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.captureConfirm}
              disabled={!form.captureEnabled}
              onChange={(e) => update({ captureConfirm: e.target.checked })}
              className="accent-accent w-4 h-4 disabled:opacity-40"
            />
            <span className="text-sm text-ink-mid disabled:opacity-40">
              Ask me to approve each capture before it downloads
            </span>
          </label>
        </Field>

        {form.captureAllowedHosts.length > 0 && (
          <Field
            icon={Globe}
            label="Always-allowed sites"
            hint="Downloads from these sites start without an approval prompt. Click × to remove"
          >
            <div className="flex flex-wrap gap-1.5">
              {form.captureAllowedHosts.map((h) => (
                <span
                  key={h}
                  className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-ink-mid"
                >
                  {h}
                  <button
                    onClick={() =>
                      update({
                        captureAllowedHosts: form.captureAllowedHosts.filter(
                          (x) => x !== h
                        ),
                      })
                    }
                    className="text-ink-muted hover:text-error-soft transition-colors"
                    title={`Remove ${h}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </Field>
        )}

        <Field
          icon={Copy}
          label="Pairing token"
          hint="The extension must present this token; regenerate if it ever leaks"
        >
          <div className="flex gap-2">
            <code className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-ink font-mono px-3 py-2.5 truncate select-text">
              {form.captureToken || "-"}
            </code>
            <button
              onClick={async () => {
                const { writeText } = await import(
                  "@tauri-apps/plugin-clipboard-manager"
                );
                await writeText(form.captureToken);
                setTokenCopied(true);
                setTimeout(() => setTokenCopied(false), 1500);
              }}
              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-ink-muted hover:text-ink hover:bg-white/[0.1] transition-colors"
              title="Copy token"
            >
              {tokenCopied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={async () => {
                if (!confirmRegen) {
                  setConfirmRegen(true);
                  setTimeout(() => setConfirmRegen(false), 4000);
                  return;
                }
                setConfirmRegen(false);
                const s = await backend.regenerateCaptureToken();
                setForm(s);
                useDownloadsStore.setState({ settings: s });
              }}
              className={
                confirmRegen
                  ? "px-3 rounded-lg bg-warning/15 border border-warning/40 text-warning transition-colors"
                  : "px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-ink-muted hover:text-ink hover:bg-white/[0.1] transition-colors"
              }
              title={
                confirmRegen
                  ? "Every paired browser stops capturing until it re-pairs. Click again to regenerate"
                  : "Regenerate token"
              }
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </Field>

        <Field
          icon={Layers}
          label="Capture port"
          hint="Must match the port in the extension popup. Takes effect after restarting Apex"
        >
          <NumberInput
            value={form.capturePort}
            min={1024}
            max={65535}
            onChange={(v) => update({ capturePort: v })}
          />
        </Field>

        {error && <p className="text-xs text-error-soft mb-4 break-all">{error}</p>}

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={save}
            className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Settings
          </button>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-success font-medium"
            >
              Saved ✓
            </motion.span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/** App version + manual update check (updates come from GitHub Releases). */
function AppUpdatesSection() {
  const [version, setVersion] = useState("");
  const [state, setState] = useState<
    "idle" | "checking" | "none" | "installing" | "error"
  >("idle");
  const [available, setAvailable] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then(setVersion)
      .catch(() => {});
  }, []);

  const checkNow = async () => {
    setState("checking");
    setError(null);
    setAvailable(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        setAvailable(update.version);
        setState("idle");
      } else {
        setState("none");
      }
    } catch (e) {
      setError(String(e));
      setState("error");
    }
  };

  const installNow = async () => {
    setState("installing");
    setError(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        setState("none");
        return;
      }
      let total = 0;
      let done = 0;
      await update.downloadAndInstall((ev) => {
        if (ev.event === "Started") total = ev.data.contentLength ?? 0;
        if (ev.event === "Progress") {
          done += ev.data.chunkLength;
          setProgress({ done, total });
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      setError(String(e));
      setState("error");
      setProgress(null);
    }
  };

  return (
    <>
      <h2 className="text-sm font-semibold text-ink mb-1 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-ink-muted" />
        Updates
      </h2>
      <p className="text-[11px] text-ink-muted mb-4 leading-relaxed">
        Apex {version ? `v${version}` : ""}. Updates are downloaded from GitHub
        Releases and verified before installing.
      </p>
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={available ? installNow : checkNow}
          disabled={state === "checking" || state === "installing"}
          className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-ink-muted hover:text-ink hover:bg-white/[0.1] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
        >
          {(state === "checking" || state === "installing") && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          )}
          {state === "installing"
            ? progress?.total
              ? `Installing… ${Math.round((progress.done / progress.total) * 100)}%`
              : "Installing…"
            : available
            ? `Install v${available} & Restart`
            : state === "checking"
            ? "Checking…"
            : "Check for Updates"}
        </button>
        {state === "none" && (
          <span className="text-xs text-success">You're up to date ✓</span>
        )}
        {available && state !== "installing" && (
          <span className="text-xs text-warning">Update v{available} available</span>
        )}
      </div>
      {error && <p className="text-xs text-error-soft mb-4 break-all">{error}</p>}
    </>
  );
}

/** yt-dlp / ffmpeg status with one-click installers. */
function VideoGrabberSection() {
  const [tools, setTools] = useState<ToolsStatus | null>(null);
  const [installing, setInstalling] = useState<"yt-dlp" | "ffmpeg" | null>(null);
  const [progress, setProgress] = useState<{ downloaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);

  useEffect(() => {
    backend.ytdlpStatus().then(setTools).catch(() => {});
    backend
      .ytdlpCheckUpdate()
      .then((u) => setUpdateAvailable(u.outdated ? u.latest : null))
      .catch(() => {});
    let unlisten: (() => void) | undefined;
    backend
      .onToolsProgress((p) => setProgress({ downloaded: p.downloaded, total: p.total }))
      .then((fn) => (unlisten = fn));
    return () => unlisten?.();
  }, []);

  const install = async (tool: "yt-dlp" | "ffmpeg") => {
    setInstalling(tool);
    setProgress(null);
    setError(null);
    try {
      const s = tool === "yt-dlp" ? await backend.installYtdlp() : await backend.installFfmpeg();
      setTools(s);
      if (tool === "yt-dlp") setUpdateAvailable(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
      setProgress(null);
    }
  };

  return (
    <>
      <h2 className="text-sm font-semibold text-ink mb-1 flex items-center gap-2">
        <Clapperboard className="w-4 h-4 text-ink-muted" />
        Video Grabber
      </h2>
      <p className="text-[11px] text-ink-muted mb-4 leading-relaxed">
        “Grab Video” downloads video/audio from YouTube and 1000+ other sites
        using <code className="text-ink-mid">yt-dlp</code>. FFmpeg is optional;
        it unlocks the highest resolutions by merging separate video and audio
        streams.
      </p>

      <ToolRow
        name="yt-dlp"
        required
        status={
          tools?.ytdlpPath
            ? `Installed${tools.ytdlpVersion ? ` · v${tools.ytdlpVersion}` : ""}${
                updateAvailable ? ` · update available (v${updateAvailable})` : ""
              }`
            : "Not installed"
        }
        ok={!!tools?.ytdlpPath && !updateAvailable}
        installing={installing === "yt-dlp"}
        progress={installing === "yt-dlp" ? progress : null}
        onInstall={() => install("yt-dlp")}
        installLabel={tools?.ytdlpPath ? "Update" : "Install"}
        disabled={installing !== null}
      />
      <ToolRow
        name="FFmpeg"
        status={tools?.ffmpegPath ? "Installed" : "Not installed · best quality limited"}
        ok={!!tools?.ffmpegPath}
        installing={installing === "ffmpeg"}
        progress={installing === "ffmpeg" ? progress : null}
        onInstall={() => install("ffmpeg")}
        installLabel={tools?.ffmpegPath ? "Reinstall" : "Install (~180 MB)"}
        disabled={installing !== null}
      />
      {error && <p className="text-xs text-error-soft mb-4 break-all">{error}</p>}
    </>
  );
}

function ToolRow({
  name,
  required,
  status,
  ok,
  installing,
  progress,
  onInstall,
  installLabel,
  disabled,
}: {
  name: string;
  required?: boolean;
  status: string;
  ok: boolean;
  installing: boolean;
  progress: { downloaded: number; total: number } | null;
  onInstall: () => void;
  installLabel: string;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3.5 py-3">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${ok ? "bg-success" : "bg-warning"}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink font-medium">
          {name}
          {required && <span className="text-[10px] text-ink-muted ml-1.5">required</span>}
        </p>
        <p className="text-[11px] text-ink-muted truncate">
          {installing && progress
            ? `Downloading… ${formatBytes(progress.downloaded)}${progress.total ? ` / ${formatBytes(progress.total)}` : ""}`
            : status}
        </p>
      </div>
      <button
        onClick={onInstall}
        disabled={disabled}
        className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-ink-muted hover:text-ink hover:bg-white/[0.1] disabled:opacity-50 flex items-center gap-1.5 transition-colors shrink-0"
      >
        {installing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {installing ? "Installing…" : installLabel}
      </button>
    </div>
  );
}

/** Minutes-since-midnight ↔ the "HH:MM" value of an <input type="time">. */
function toHHMM(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function fromHHMM(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return ((h || 0) * 60 + (m || 0)) % (24 * 60);
}

function Field({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: React.ElementType;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-ink-muted" />
        <span className="text-xs font-medium text-ink">{label}</span>
      </div>
      {children}
      {hint && <p className="text-[10px] text-ink-faint mt-1.5">{hint}</p>}
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
      }}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink px-3 py-2.5 outline-none focus:border-accent/50 transition-colors tabular-nums"
    />
  );
}
