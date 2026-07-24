import { useEffect, useState } from "react";
import { Activity, Clock, Gauge, RotateCcw, Wifi } from "lucide-react";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { formatSpeed } from "@/lib/utils";

const LIMIT_PRESETS = [0, 512, 1024, 5120, 10240];

export function StatusBar() {
  const downloads = useDownloadsStore((s) => s.downloads);
  const settings = useDownloadsStore((s) => s.settings);
  const saveSettings = useDownloadsStore((s) => s.saveSettings);
  const resumeDownload = useDownloadsStore((s) => s.resumeDownload);

  const active = downloads.filter((d) => d.status === "downloading");
  const queued = downloads.filter((d) => d.status === "queued");
  const failed = downloads.filter((d) => d.status === "failed");
  const totalSpeed = active.reduce((acc, d) => acc + d.speedBytesPerSec, 0);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [version, setVersion] = useState("");
  useEffect(() => {
    import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then(setVersion)
      .catch(() => {});
  }, []);

  const limit = settings?.speedLimitKbps ?? 0;
  const limitOptions = LIMIT_PRESETS.includes(limit)
    ? LIMIT_PRESETS
    : [...LIMIT_PRESETS, limit].sort((a, b) => a - b);

  return (
    <footer className="flex items-center gap-4 h-7 px-4 bg-surface/90 backdrop-blur-xl border-t border-white/[0.06] shrink-0 text-[11px] text-ink-muted">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3" />
        <span>
          {active.length} active{queued.length > 0 ? ` · ${queued.length} queued` : ""}
        </span>
      </div>
      {totalSpeed > 0 && (
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3" />
          <span className="tabular-nums">{formatSpeed(totalSpeed)}</span>
        </div>
      )}
      {failed.length > 0 && (
        <div className="flex items-center gap-1.5 text-error-soft/90">
          <span>
            {failed.length} failed
          </span>
          <button
            onClick={() => failed.forEach((d) => resumeDownload(d.id))}
            className="flex items-center gap-1 hover:text-error-soft underline underline-offset-2 transition-colors"
            title="Retry all failed downloads"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
      <div className="flex-1" />
      {settings && (
        <div
          className="flex items-center gap-1.5"
          title="Global speed limit (all downloads combined)"
        >
          <Gauge className="w-3 h-3" />
          <select
            value={limit}
            onChange={(e) =>
              saveSettings({ ...settings, speedLimitKbps: Number(e.target.value) })
            }
            className="bg-transparent text-[11px] text-ink-muted outline-none cursor-pointer hover:text-ink transition-colors [color-scheme:dark]"
          >
            {limitOptions.map((v) => (
              <option key={v} value={v} className="bg-raised text-ink">
                {v === 0
                  ? "No limit"
                  : v >= 1024
                  ? `${(v / 1024).toFixed(v % 1024 === 0 ? 0 : 1)} MB/s`
                  : `${v} KB/s`}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        <span>
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {version && <span className="text-ink-faint">v{version}</span>}
    </footer>
  );
}
