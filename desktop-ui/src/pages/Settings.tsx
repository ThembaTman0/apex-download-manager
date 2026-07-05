import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  ClipboardCopy,
  Copy,
  FolderOpen,
  FolderTree,
  Gauge,
  Globe,
  Layers,
  ListOrdered,
  Power,
  RefreshCw,
  Save,
} from "lucide-react";
import { backend } from "@/services/backend";
import { useDownloadsStore } from "@/stores/downloadsStore";
import type { QueueDoneAction, Settings } from "@/types";

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
      <div className="flex-1 flex items-center justify-center text-sm text-[#94A3B8]">
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
        className="max-w-2xl mx-auto rounded-[10px] bg-[#151B26] border border-white/[0.06] p-6"
      >
        <h1 className="text-base font-semibold text-white mb-6">Settings</h1>

        <Field
          icon={FolderOpen}
          label="Default download folder"
          hint="New downloads are saved here unless you choose another folder"
        >
          <div className="flex gap-2">
            <input
              value={form.downloadDir}
              onChange={(e) => update({ downloadDir: e.target.value })}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white px-3 py-2.5 outline-none focus:border-white/25 transition-colors"
            />
            <button
              onClick={browse}
              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:text-white hover:bg-white/[0.1] transition-colors"
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
              className="accent-[#cbd5e1] w-4 h-4"
            />
            <span className="text-sm text-[#cbd5e1]">
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
              className="accent-[#cbd5e1] w-4 h-4"
            />
            <span className="text-sm text-[#cbd5e1]">
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
              className="accent-[#cbd5e1] w-4 h-4"
            />
            <span className="text-sm text-[#cbd5e1]">
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
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white px-3 py-2.5 outline-none focus:border-white/25 transition-colors [color-scheme:dark]"
          >
            <option value="none">Do nothing</option>
            <option value="sleep">Sleep</option>
            <option value="shutdown">Shut down</option>
          </select>
        </Field>

        <div className="border-t border-white/[0.06] my-6" />
        <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#94A3B8]" />
          Browser Integration
        </h2>
        <p className="text-[11px] text-[#94A3B8] mb-4 leading-relaxed">
          Install the extension from the{" "}
          <code className="text-[#cbd5e1]">browser-extension</code> folder
          (chrome://extensions → Load unpacked), then paste this token into its
          popup. Downloads you start in the browser are then captured by Apex.
        </p>

        <Field icon={ClipboardCopy} label="Capture" hint="">
          <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.captureEnabled}
              onChange={(e) => update({ captureEnabled: e.target.checked })}
              className="accent-[#cbd5e1] w-4 h-4"
            />
            <span className="text-sm text-[#cbd5e1]">
              Accept downloads from the browser extension
            </span>
          </label>
        </Field>

        <Field
          icon={Copy}
          label="Pairing token"
          hint="The extension must present this token; regenerate if it ever leaks"
        >
          <div className="flex gap-2">
            <code className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white font-mono px-3 py-2.5 truncate select-text">
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
              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:text-white hover:bg-white/[0.1] transition-colors"
              title="Copy token"
            >
              {tokenCopied ? (
                <Check className="w-4 h-4 text-green-400" />
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
              className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:text-white hover:bg-white/[0.1] transition-colors"
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

        {error && <p className="text-xs text-red-400 mb-4 break-all">{error}</p>}

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={save}
            className="px-5 py-2.5 rounded-lg bg-[#E2E8F0] hover:bg-white text-[#0B0F17] text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Settings
          </button>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-green-400 font-medium"
            >
              Saved ✓
            </motion.span>
          )}
        </div>
      </motion.div>
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
        <Icon className="w-3.5 h-3.5 text-[#94A3B8]" />
        <span className="text-xs font-medium text-white">{label}</span>
      </div>
      {children}
      {hint && <p className="text-[10px] text-[#94A3B8]/70 mt-1.5">{hint}</p>}
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
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white px-3 py-2.5 outline-none focus:border-white/25 transition-colors tabular-nums"
    />
  );
}
