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
  Power,
  RefreshCw,
  Save,
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

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (!form) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[#8A9199]">
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
        className="max-w-2xl mx-auto rounded-[10px] bg-[#0F131A] border border-white/[0.06] p-6"
      >
        <h1 className="text-base font-semibold text-[#E6E1CF] mb-6">Settings</h1>

        <Field
          icon={FolderOpen}
          label="Default download folder"
          hint="New downloads are saved here unless you choose another folder"
        >
          <div className="flex gap-2">
            <input
              value={form.downloadDir}
              onChange={(e) => update({ downloadDir: e.target.value })}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] px-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors"
            />
            <button
              onClick={browse}
              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.1] transition-colors"
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

        <Field icon={Bell} label="Notifications" hint="">
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.notifyOnComplete}
              onChange={(e) => update({ notifyOnComplete: e.target.checked })}
              className="accent-[#E6B450] w-4 h-4"
            />
            <span className="text-sm text-[#BFBDB6]">
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
              className="accent-[#E6B450] w-4 h-4"
            />
            <span className="text-sm text-[#BFBDB6]">
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
              className="accent-[#E6B450] w-4 h-4"
            />
            <span className="text-sm text-[#BFBDB6]">
              Sort downloads into category folders
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
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] px-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors [color-scheme:dark]"
          >
            <option value="none">Do nothing</option>
            <option value="sleep">Sleep</option>
            <option value="hibernate">Hibernate</option>
            <option value="shutdown">Shut down</option>
          </select>
        </Field>

        <div className="border-t border-white/[0.06] my-6" />
        <VideoGrabberSection />

        <div className="border-t border-white/[0.06] my-6" />
        <h2 className="text-sm font-semibold text-[#E6E1CF] mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#8A9199]" />
          Browser Integration
        </h2>
        <p className="text-[11px] text-[#8A9199] mb-4 leading-relaxed">
          Install the extension from the{" "}
          <code className="text-[#BFBDB6]">browser-extension</code> folder
          (chrome://extensions → Load unpacked), then paste this token into its
          popup. Downloads you start in the browser are then captured by Apex.
        </p>

        <Field icon={ClipboardCopy} label="Capture" hint="">
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.captureEnabled}
              onChange={(e) => update({ captureEnabled: e.target.checked })}
              className="accent-[#E6B450] w-4 h-4"
            />
            <span className="text-sm text-[#BFBDB6]">
              Accept downloads from the browser extension
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.captureConfirm}
              disabled={!form.captureEnabled}
              onChange={(e) => update({ captureConfirm: e.target.checked })}
              className="accent-[#E6B450] w-4 h-4 disabled:opacity-40"
            />
            <span className="text-sm text-[#BFBDB6] disabled:opacity-40">
              Ask me to approve each capture before it downloads
            </span>
          </label>
        </Field>

        <Field
          icon={Copy}
          label="Pairing token"
          hint="The extension must present this token; regenerate if it ever leaks"
        >
          <div className="flex gap-2">
            <code className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-[#E6E1CF] font-mono px-3 py-2.5 truncate select-text">
              {form.captureToken || "—"}
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
              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.1] transition-colors"
              title="Copy token"
            >
              {tokenCopied ? (
                <Check className="w-4 h-4 text-[#7FD962]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={async () => {
                const s = await backend.regenerateCaptureToken();
                setForm(s);
                useDownloadsStore.setState({ settings: s });
              }}
              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.1] transition-colors"
              title="Regenerate token"
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

        {error && <p className="text-xs text-[#F07178] mb-4 break-all">{error}</p>}

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={save}
            className="px-5 py-2.5 rounded-lg bg-[#E6B450] hover:bg-[#F0C266] text-[#0B0E14] text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Settings
          </button>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-[#7FD962] font-medium"
            >
              Saved ✓
            </motion.span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/** yt-dlp / ffmpeg status with one-click installers. */
function VideoGrabberSection() {
  const [tools, setTools] = useState<ToolsStatus | null>(null);
  const [installing, setInstalling] = useState<"yt-dlp" | "ffmpeg" | null>(null);
  const [progress, setProgress] = useState<{ downloaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    backend.ytdlpStatus().then(setTools).catch(() => {});
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
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
      setProgress(null);
    }
  };

  return (
    <>
      <h2 className="text-sm font-semibold text-[#E6E1CF] mb-1 flex items-center gap-2">
        <Clapperboard className="w-4 h-4 text-[#8A9199]" />
        Video Grabber
      </h2>
      <p className="text-[11px] text-[#8A9199] mb-4 leading-relaxed">
        “Grab Video” downloads video/audio from YouTube and 1000+ other sites
        using <code className="text-[#BFBDB6]">yt-dlp</code>. FFmpeg is optional
        — it unlocks the highest resolutions by merging separate video and audio
        streams.
      </p>

      <ToolRow
        name="yt-dlp"
        required
        status={tools?.ytdlpPath ? `Installed${tools.ytdlpVersion ? ` · v${tools.ytdlpVersion}` : ""}` : "Not installed"}
        ok={!!tools?.ytdlpPath}
        installing={installing === "yt-dlp"}
        progress={installing === "yt-dlp" ? progress : null}
        onInstall={() => install("yt-dlp")}
        installLabel={tools?.ytdlpPath ? "Update" : "Install"}
        disabled={installing !== null}
      />
      <ToolRow
        name="FFmpeg"
        status={tools?.ffmpegPath ? "Installed" : "Not installed — best quality limited"}
        ok={!!tools?.ffmpegPath}
        installing={installing === "ffmpeg"}
        progress={installing === "ffmpeg" ? progress : null}
        onInstall={() => install("ffmpeg")}
        installLabel={tools?.ffmpegPath ? "Reinstall" : "Install (~180 MB)"}
        disabled={installing !== null}
      />
      {error && <p className="text-xs text-[#F07178] mb-4 break-all">{error}</p>}
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
        className={`w-2 h-2 rounded-full shrink-0 ${ok ? "bg-[#7FD962]" : "bg-[#FF8F40]"}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#E6E1CF] font-medium">
          {name}
          {required && <span className="text-[10px] text-[#8A9199] ml-1.5">required</span>}
        </p>
        <p className="text-[11px] text-[#8A9199] truncate">
          {installing && progress
            ? `Downloading… ${formatBytes(progress.downloaded)}${progress.total ? ` / ${formatBytes(progress.total)}` : ""}`
            : status}
        </p>
      </div>
      <button
        onClick={onInstall}
        disabled={disabled}
        className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.1] disabled:opacity-50 flex items-center gap-1.5 transition-colors shrink-0"
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
        <Icon className="w-3.5 h-3.5 text-[#8A9199]" />
        <span className="text-xs font-medium text-[#E6E1CF]">{label}</span>
      </div>
      {children}
      {hint && <p className="text-[10px] text-[#8A9199]/70 mt-1.5">{hint}</p>}
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
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] px-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors tabular-nums"
    />
  );
}
