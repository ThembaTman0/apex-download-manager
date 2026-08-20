import { useEffect, useRef, useState } from "react";
import { STATIC_MODE, useInView, usePrefersReducedMotion } from "../lib/reveal";
import { useLatestRelease } from "../lib/latestRelease";
import {
  FileIcon,
  GearIcon,
  GridIcon,
  DownloadIcon,
  LogoMark,
  PlusIcon,
  SearchIcon,
  VideoIcon,
  WinClose,
  WinMaximize,
  WinMinimize,
} from "./icons";

type Status = "downloading" | "queued" | "paused" | "done";

type Row = {
  name: string;
  ext: string;
  bytes: number;
  progress: number;
  baseSpeed: number | null; // MB/s
  speed: number | null;
  status: Status;
  doneTicks: number;
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

const INITIAL_ROWS: Row[] = [
  row("ubuntu-24.04.2-desktop-amd64.iso", "ISO", 5.8 * GB, 64, 42.1, "downloading"),
  row("course-videos-part-04.mkv", "MKV", 890.9 * MB, 31, 18.6, "downloading"),
  row("node-v22.4.0-x64.msi", "MSI", 31 * MB, 0, null, "queued"),
  row("dataset-2026-archive.zip", "ZIP", 1.2 * GB, 23, null, "paused"),
  row("blender-4.2.1-windows-x64.msi", "MSI", 336 * MB, 100, null, "done"),
];

// Files rotated in as downloads finish, so the demo loops forever.
const FILE_POOL: Array<[string, string, number, number]> = [
  ["fedora-42-workstation-x86_64.iso", "ISO", 2.4 * GB, 38.4],
  ["conference-talk-recording.mp4", "MP4", 1.6 * GB, 24.2],
  ["design-assets-2026.zip", "ZIP", 640 * MB, 31.7],
  ["libreoffice-25.2-x64.msi", "MSI", 348 * MB, 44.8],
];

function row(
  name: string,
  ext: string,
  bytes: number,
  progress: number,
  baseSpeed: number | null,
  status: Status,
): Row {
  return { name, ext, bytes, progress, baseSpeed, speed: baseSpeed, status, doneTicks: 0 };
}

const TICK_MS = 900;

function tickRows(rows: Row[], poolIndex: number): [Row[], number] {
  let nextPool = poolIndex;
  const next = rows.map((r) => {
    if (r.status === "downloading" && r.baseSpeed !== null) {
      const speed = r.baseSpeed * (0.86 + Math.random() * 0.28);
      const gained = ((speed * MB * (TICK_MS / 1000)) / r.bytes) * 100;
      const progress = r.progress + gained;
      if (progress >= 100) {
        return { ...r, progress: 100, speed: null, status: "done" as Status, doneTicks: 0 };
      }
      return { ...r, progress, speed };
    }
    if (r.status === "done") {
      // After a short rest, recycle the slot with a fresh file from the pool -
      // but leave the bottom showcase row (blender) alone.
      if (r.name.startsWith("blender")) return r;
      if (r.doneTicks >= 4) {
        const [name, ext, bytes, baseSpeed] = FILE_POOL[nextPool % FILE_POOL.length];
        nextPool += 1;
        return row(name, ext, bytes, 1.5, baseSpeed, "downloading");
      }
      return { ...r, doneTicks: r.doneTicks + 1 };
    }
    return r;
  });
  return [next, nextPool];
}

function fmtBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  return `${Math.round(bytes / MB)} MB`;
}

function fmtSpeed(mbps: number | null): string {
  return mbps === null ? "-" : `${mbps.toFixed(1)} MB/s`;
}

function fmtEta(r: Row): string {
  if (r.status !== "downloading" || !r.speed) return "--";
  const remaining = ((100 - r.progress) / 100) * r.bytes;
  const sec = remaining / (r.speed * MB);
  if (sec < 90) return `${Math.max(1, Math.round(sec))}s`;
  return `${Math.round(sec / 60)}m`;
}

const STATUS_META: Record<Status, { label: string; color: string }> = {
  downloading: { label: "Downloading", color: "var(--mk-blue)" },
  queued: { label: "Queued", color: "var(--text-3)" },
  paused: { label: "Paused", color: "var(--mk-amber)" },
  done: { label: "Completed", color: "var(--mk-green)" },
};

export default function AppMockup() {
  const { version } = useLatestRelease();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>("0px");
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
  const rowsRef = useRef(rows);
  const poolRef = useRef(0);

  useEffect(() => {
    if (reduced || STATIC_MODE || !inView) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const [next, nextPool] = tickRows(rowsRef.current, poolRef.current);
      rowsRef.current = next;
      poolRef.current = nextPool;
      setRows(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [reduced, inView]);

  const active = rows.filter((r) => r.status === "downloading");
  const queued = rows.filter((r) => r.status === "queued").length;
  const totalSpeed = active.reduce((sum, r) => sum + (r.speed ?? 0), 0);

  return (
    <div
      ref={ref}
      className="mockup"
      role="img"
      aria-label="Apex Download Manager main window with a queue of downloads showing live progress, speed and time remaining"
    >
      <div aria-hidden="true">
        <div className="mk-titlebar">
          <span className="mk-winbtn"><WinMinimize /></span>
          <span className="mk-winbtn"><WinMaximize /></span>
          <span className="mk-winbtn"><WinClose /></span>
        </div>

        <div className="mk-body">
          <aside className="mk-side">
            <div className="mk-brand">
              <span className="mk-brand-mark"><LogoMark size={14} /></span>
              <span>
                <span className="mk-brand-name">Apex</span>
                <br />
                <span className="mk-brand-sub">Download Manager</span>
              </span>
            </div>
            <span className="mk-nav-item"><GridIcon /> Dashboard</span>
            <span className="mk-nav-item active"><DownloadIcon size={14} /> Downloads</span>
            <span className="mk-nav-item"><GearIcon /> Settings</span>

            <div className="mk-disk">
              Disk C:
              <div className="mk-disk-bar"><div className="mk-disk-fill" /></div>
              317 GB used · 62%
            </div>
          </aside>

          <div className="mk-main">
            <div className="mk-toolbar">
              <span className="mk-btn amber"><PlusIcon /> Add URL</span>
              <span className="mk-btn hide-mobile"><VideoIcon /> Grab Video</span>
              <span className="mk-btn muted hide-mobile">Pause All</span>
              <span className="mk-search"><SearchIcon /> <span>Search downloads</span></span>
            </div>

            <div className="mk-chips">
              <span className="mk-chip active">All</span>
              <span className="mk-chip">Active</span>
              <span className="mk-chip">Scheduled</span>
              <span className="mk-chip hide-mobile">Completed</span>
              <span className="mk-chip hide-mobile">Failed</span>
            </div>

            <div className="mk-table">
              <div className="mk-row head">
                <span>Name</span>
                <span className="mk-col-size">Size</span>
                <span>Progress</span>
                <span>Speed</span>
                <span className="mk-col-eta">ETA</span>
                <span className="mk-col-status">Status</span>
              </div>

              {rows.map((r, i) => {
                const meta = STATUS_META[r.status];
                const fillClass =
                  r.status === "done" ? "green" : r.status === "paused" ? "dim" : "";
                // Rows are fixed slots that never reorder; index is the identity.
                return (
                  <div className="mk-row" key={i}>
                    <span className="mk-name">
                      <span className="mk-file-ico"><FileIcon /></span>
                      <span>{r.name}</span>
                    </span>
                    <span className="mk-size mk-col-size">{fmtBytes(r.bytes)}</span>
                    <span className="mk-progress">
                      <span className="mk-bar">
                        <span
                          className={`mk-fill ${fillClass}`.trim()}
                          style={{
                            display: "block",
                            transform: `scaleX(${r.progress / 100})`,
                          }}
                        />
                      </span>
                      <span className="mk-pct">{Math.floor(r.progress)}%</span>
                    </span>
                    <span className={`mk-speed ${r.speed === null ? "idle" : ""}`.trim()}>
                      {fmtSpeed(r.speed)}
                    </span>
                    <span
                      className={`mk-eta mk-col-eta ${r.status !== "downloading" ? "idle" : ""}`.trim()}
                    >
                      {fmtEta(r)}
                    </span>
                    <span className="mk-status mk-col-status">
                      <span className="dot" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mk-statusbar">
              <span>
                {active.length} active · {queued} queued
              </span>
              <span>{totalSpeed > 0 ? `${totalSpeed.toFixed(1)} MB/s` : "idle"}</span>
              <span className="right">
                <span>No limit</span>
                <span>v{version ?? "1.0.1"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
