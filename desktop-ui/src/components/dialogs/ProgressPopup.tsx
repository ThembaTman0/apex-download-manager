import { useEffect, useRef, useState } from "react";
import { CircleCheck, Clock, FolderOpen, Pause, Play, X } from "lucide-react";
import { backend } from "@/services/backend";
import { cn, formatBytes, formatSpeed } from "@/lib/utils";
import type { Download } from "@/types";
import { LogoBadge } from "@/components/ui/LogoMark";

/** Once everything shown has finished, the window closes itself this long
 * after, unless the pointer is over it. */
const AUTO_CLOSE_MS = 10_000;
/** Speed samples kept for the chart: one every 2 s, so the last minute. */
const SAMPLE_MS = 2_000;
const SAMPLES = 30;

const isFinished = (d: Download) => d.status === "completed" || d.status === "failed";
const isActive = (d: Download) => d.status === "downloading" || d.status === "queued";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Time left the way a person says it, so it doesn't tick every second. */
function timeLeft(seconds: number): string {
  if (seconds <= 0) return "Working it out";
  if (seconds < 60) return "Under a minute left";
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min left`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min left` : `${h} h left`;
}

/**
 * Small always-on-top window (its own OS window, like the capture prompt)
 * showing browser captures that have started downloading, so there is a sign
 * a download began before its completion notification. Rust adds rows via
 * `progress:track`; `download:changed` keeps them current. With one download
 * running it shows that file with a speed chart; with more, a quiet list.
 */
export function ProgressPopup() {
  const [rows, setRows] = useState<Download[]>([]);
  const [hovered, setHovered] = useState(false);
  // Speed history per download, sampled on a timer rather than per event so
  // the chart moves at a calm, even pace.
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // Rows already tracked before this window mounted, then any new ones.
  useEffect(() => {
    const add = async (ids: string[]) => {
      const all = await backend.listDownloads().catch(() => [] as Download[]);
      setRows((current) => {
        const have = new Set(current.map((d) => d.id));
        const fresh = ids
          .filter((id) => !have.has(id))
          .map((id) => all.find((d) => d.id === id))
          .filter((d): d is Download => !!d);
        return [...current, ...fresh];
      });
    };
    backend.listProgressTracked().then(add).catch(() => {});

    const unlisten = [
      backend.onProgressTrack((id) => add([id])),
      backend.onDownloadChanged((d) =>
        setRows((current) => current.map((r) => (r.id === d.id ? d : r)))
      ),
      backend.onDownloadRemoved((id) =>
        setRows((current) => current.filter((r) => r.id !== id))
      ),
    ];
    return () => unlisten.forEach((p) => p.then((fn) => fn()));
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setHistory((prev) => {
        const next: Record<string, number[]> = {};
        for (const d of rowsRef.current) {
          if (!isActive(d)) continue;
          next[d.id] = [...(prev[d.id] ?? []), d.speedBytesPerSec].slice(-SAMPLES);
        }
        return next;
      });
    }, SAMPLE_MS);
    return () => clearInterval(t);
  }, []);

  // Auto-close only once rows have shown up: the list is empty while it first
  // loads, and closing then would clear the tracked ids before they were read.
  const hadRows = useRef(false);
  if (rows.length) hadRows.current = true;

  const close = () => {
    hadRows.current = false;
    setRows([]);
    setHistory({});
    backend.dismissProgress().catch(() => {});
  };

  // Nothing left to watch: close a while after the last one finishes, or
  // right away if every row was removed.
  const allDone = rows.every(isFinished);
  useEffect(() => {
    if (!hadRows.current || !allDone || hovered) return;
    const t = setTimeout(close, rows.length ? AUTO_CLOSE_MS : 0);
    return () => clearTimeout(t);
  }, [allDone, hovered, rows.length]);

  // Fit the OS window to the content. Rust also re-pins the bottom-right
  // corner, so the window grows upward instead of off the screen.
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastHeight = useRef(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const h = bodyRef.current?.offsetHeight ?? 0;
      if (h > 0 && h !== lastHeight.current) {
        lastHeight.current = h;
        backend.fitProgressWindow(h).catch(() => {});
      }
    });
    return () => cancelAnimationFrame(raf);
  });

  const unfinished = rows.filter((d) => !isFinished(d));
  const single = unfinished.length === 1 && rows.length === 1 ? rows[0] : null;

  return (
    <div
      className="h-screen w-screen bg-card overflow-hidden select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={bodyRef}
        className="relative bg-gradient-to-b from-white/[0.025] to-transparent p-4"
      >
        {/* Drag by the header strip; the buttons in it still click. */}
        <div data-tauri-drag-region className="absolute inset-x-0 top-0 h-12" />
        {single ? (
          <SingleView d={single} speeds={history[single.id] ?? []} onClose={close} />
        ) : (
          <ListView rows={rows} onClose={close} />
        )}
      </div>
    </div>
  );
}

/** The Apex mark, leading the header; clicking it brings the app back. */
function AppLogo() {
  return (
    <button
      onClick={() => backend.openMainWindow().catch(() => {})}
      title="Open Apex"
      aria-label="Open Apex"
      className="relative shrink-0 rounded-[7px] transition-opacity hover:opacity-80"
    >
      <LogoBadge className="w-[26px] h-[26px]" />
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5 h-6 px-2.5 rounded-full border border-white/[0.09] bg-white/[0.03] text-[11.5px] text-ink-mid tabular-nums">
      {children}
    </span>
  );
}

/** Half-filled ring: "in progress", in the status-pill style. */
function ProgressRing({ paused }: { paused?: boolean }) {
  const c = paused ? "var(--color-ink-muted)" : "var(--color-accent)";
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.6" />
      <path d="M7 1.5 A5.5 5.5 0 0 1 7 12.5 Z" fill={c} />
    </svg>
  );
}

function Bar({ d }: { d: Download }) {
  return (
    <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-1000 ease-out",
          d.status === "completed"
            ? "bg-success"
            : d.status === "failed"
              ? "bg-error"
              : d.status === "paused"
                ? "bg-ink-muted"
                : "bg-accent"
        )}
        style={{ width: `${d.status === "completed" ? 100 : d.progress}%` }}
      />
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="relative w-[26px] h-[26px] rounded-full border border-white/[0.09] bg-white/[0.03] text-ink hover:bg-white/[0.08] flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  );
}

/** Pause or resume, shown while the pointer is over the window (the parent's
 * group hover). No cancel here on purpose: a stray click in a corner window
 * must never cost a download; removing one stays in the main app. */
function Controls({ d }: { d: Download }) {
  if (isFinished(d)) return null;
  return (
    <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      {d.status === "paused" ? (
        <IconButton title="Resume" onClick={() => backend.resumeDownload(d.id).catch(() => {})}>
          <Play className="w-3 h-3" />
        </IconButton>
      ) : (
        <IconButton title="Pause" onClick={() => backend.pauseDownload(d.id).catch(() => {})}>
          <Pause className="w-3 h-3" />
        </IconButton>
      )}
    </div>
  );
}

/** Right-hand columns of a list row, fixed width so every row's button and
 * status line up whatever the text ("6%", "13%", "Waiting"). */
const BUTTON_COL = "w-[26px] shrink-0 flex justify-center";
const STATUS_COL = "w-[52px] shrink-0 text-right tabular-nums";

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="relative text-ink-muted hover:text-ink transition-colors opacity-0 group-hover:opacity-100"
      title="Close (downloads keep going)"
      aria-label="Close"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}

function SingleView({
  d,
  speeds,
  onClose,
}: {
  d: Download;
  speeds: number[];
  onClose: () => void;
}) {
  const host = hostOf(d.url);
  const paused = d.status === "paused";
  return (
    <div className="group">
      <div className="relative flex items-center gap-2.5">
        <AppLogo />
        <span className="flex-1 min-w-0 text-sm font-medium text-ink truncate" title={d.name}>
          {d.name}
        </span>
        <Controls d={d} />
        <CloseButton onClose={onClose} />
      </div>
      <div className="grid grid-cols-2 w-fit gap-1.5 mt-2.5">
        <Pill>
          <ProgressRing paused={paused} />
          {paused ? "Paused" : d.status === "queued" ? "Waiting" : "Downloading"}
        </Pill>
        {!paused && (
          <Pill>
            <Clock className="w-3 h-3" />
            {timeLeft(d.etaSeconds)}
          </Pill>
        )}
      </div>
      <div className="h-px bg-white/[0.06] my-3" />
      <p className="text-[12.5px] truncate">
        <span className="font-semibold text-ink tabular-nums">{Math.round(d.progress)}%</span>
        <span className="text-ink-muted tabular-nums">
          {" · "}
          {formatBytes(d.downloadedBytes)}
          {d.sizeBytes ? ` of ${formatBytes(d.sizeBytes)}` : ""}
          {host ? ` from ${host}` : ""}
        </span>
      </p>
      <div className="mt-2.5">
        <Bar d={d} />
      </div>
      <SpeedChart speeds={speeds} />
      <div className="flex justify-between text-[10.5px] text-ink-muted tabular-nums mt-1">
        <span>{speeds.length >= SAMPLES ? "1 min ago" : `${Math.max(speeds.length - 1, 0) * (SAMPLE_MS / 1000)}s ago`}</span>
        <span>{paused ? "Paused" : `${formatSpeed(d.speedBytesPerSec)} now`}</span>
      </div>
    </div>
  );
}

const CHART_W = 300;
const CHART_H = 70;

/** One smooth line with a fading fill; hover shows the speed at a point. */
function SpeedChart({ speeds }: { speeds: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // Spread over the full width from the first samples on ("now" is the
  // right edge); the caption under the chart says how far back it reaches.
  const max = Math.max(...speeds, 1) * 1.15;
  const step = CHART_W / Math.max(speeds.length - 1, 1);
  const pts = speeds.map((s, i) => [i * step, CHART_H - (s / max) * (CHART_H - 6)]);

  let line = "";
  if (pts.length > 1) {
    line = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      line += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
    }
  }

  const onMove = (e: React.MouseEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r || pts.length < 2) return;
    const i = Math.round(((e.clientX - r.left) / r.width) * (speeds.length - 1));
    setHover(i >= 0 && i < speeds.length ? i : null);
  };

  const hx = hover !== null ? pts[hover][0] : 0;
  const ago = hover !== null ? (speeds.length - 1 - hover) * (SAMPLE_MS / 1000) : 0;

  return (
    <div
      ref={wrap}
      className="relative mt-3 h-[70px]"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="speed-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4">
          <line x1={CHART_W / 3} x2={CHART_W / 3} y1="0" y2={CHART_H} />
          <line x1={(2 * CHART_W) / 3} x2={(2 * CHART_W) / 3} y1="0" y2={CHART_H} />
        </g>
        {line && (
          <>
            <path
              d={`${line} L${pts[pts.length - 1][0]},${CHART_H} L${pts[0][0]},${CHART_H} Z`}
              fill="url(#speed-fill)"
            />
            <path
              d={line}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {hover !== null && (
          <line
            x1={hx}
            x2={hx}
            y1="0"
            y2={CHART_H}
            stroke="var(--color-accent)"
            strokeOpacity="0.5"
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {hover !== null && (
        <div
          className="absolute -top-2 pointer-events-none rounded-lg border border-white/10 bg-card px-2 py-1 text-[11px] text-ink whitespace-nowrap tabular-nums"
          style={{ left: `clamp(0px, calc(${(hx / CHART_W) * 100}% - 50px), calc(100% - 110px))` }}
        >
          <span className="text-ink-muted">{ago ? `${ago}s ago` : "Now"}</span>{" "}
          {formatSpeed(speeds[hover])}
        </div>
      )}
    </div>
  );
}

function ListView({ rows, onClose }: { rows: Download[]; onClose: () => void }) {
  const active = rows.filter(isActive);
  const paused = rows.filter((d) => d.status === "paused").length;
  const longest = Math.max(0, ...active.map((d) => d.etaSeconds));
  return (
    <div className="group">
      <div className="relative flex items-center gap-2.5">
        <AppLogo />
        <span className="flex-1 text-sm font-medium text-ink">Downloads</span>
        <CloseButton onClose={onClose} />
      </div>
      <div className="grid grid-cols-2 w-fit gap-1.5 mt-2.5">
        <Pill>
          <ProgressRing paused={active.length === 0} />
          {active.length > 0
            ? `${active.length} downloading`
            : paused > 0
              ? `${paused} paused`
              : "All done"}
        </Pill>
        {active.length > 0 && (
          <Pill>
            <Clock className="w-3 h-3" />
            {timeLeft(longest)}
          </Pill>
        )}
      </div>
      <div className="h-px bg-white/[0.06] my-3" />
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {rows.map((d) => (
          <ListRow key={d.id} d={d} />
        ))}
      </div>
    </div>
  );
}

function ListRow({ d }: { d: Download }) {
  if (d.status === "completed") {
    return (
      <div className="flex items-center gap-2 text-[12.5px]">
        <CircleCheck className="w-3.5 h-3.5 text-success shrink-0" />
        <span className="flex-1 min-w-0 truncate text-ink" title={d.name}>
          {d.name}
        </span>
        <span className={BUTTON_COL}>
          <IconButton title="Show in folder" onClick={() => backend.showInFolder(d.id).catch(() => {})}>
            <FolderOpen className="w-3 h-3" />
          </IconButton>
        </span>
        <button
          onClick={() => backend.openDownload(d.id).catch(() => {})}
          className={cn(STATUS_COL, "text-accent hover:underline")}
        >
          Open
        </button>
      </div>
    );
  }
  const right =
    d.status === "failed"
      ? "Failed"
      : d.status === "paused"
        ? "Paused"
        : d.status === "queued"
          ? "Waiting"
          : `${Math.round(d.progress)}%`;
  return (
    <div>
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="flex-1 min-w-0 truncate text-ink" title={d.error || d.name}>
          {d.name}
        </span>
        <span className={BUTTON_COL}>
          <Controls d={d} />
        </span>
        <span
          className={cn(STATUS_COL, d.status === "failed" ? "text-error-soft" : "text-ink-muted")}
        >
          {right}
        </span>
      </div>
      <div className="mt-1.5">
        <Bar d={d} />
      </div>
    </div>
  );
}
