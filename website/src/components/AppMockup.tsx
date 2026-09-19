import { useEffect, useRef, useState } from "react";
import { STATIC_MODE, useInView, usePrefersReducedMotion } from "../lib/reveal";
import { FALLBACK_VERSION, useLatestRelease } from "../lib/latestRelease";
import {
  ActivityIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileDownIcon,
  FileIcon,
  GaugeIcon,
  GearIcon,
  GridIcon,
  HardDriveIcon,
  ListOrderIcon,
  LogoBadge,
  PauseCircleIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PowerIcon,
  SearchIcon,
  TrashIcon,
  VideoIcon,
  WifiIcon,
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
  queuePos?: number;
  modified: string;
  doneTicks: number;
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

function row(
  name: string,
  ext: string,
  bytes: number,
  progress: number,
  baseSpeed: number | null,
  status: Status,
  modified: string,
  queuePos?: number,
): Row {
  return { name, ext, bytes, progress, baseSpeed, speed: baseSpeed, status, modified, queuePos, doneTicks: 0 };
}

// Mirrors the desktop app's demo data (desktop-ui/src/demo/tauriMock.ts).
const INITIAL_ROWS: Row[] = [
  row("ubuntu-24.04.2-desktop-amd64.iso", "ISO", 5.8 * GB, 64, 36.7, "downloading", "18/09/2026"),
  row("course-videos-part-04.mkv", "MKV", 890.9 * MB, 41, 25.7, "downloading", "18/09/2026"),
  row("fedora-42-workstation-x86_64.iso", "ISO", 2.4 * GB, 12, 18.2, "downloading", "18/09/2026"),
  row("node-v22.4.0-x64.msi", "MSI", 31 * MB, 0, null, "queued", "18/09/2026", 1),
  row("vlc-3.0.21-win64.exe", "EXE", 43.6 * MB, 0, null, "queued", "18/09/2026", 2),
  row("dataset-2026-archive.zip", "ZIP", 1.2 * GB, 23, null, "paused", "17/09/2026"),
  row("blender-4.2.1-windows-x64.msi", "MSI", 336 * MB, 100, null, "done", "17/09/2026"),
  row("design-assets-2026.zip", "ZIP", 640 * MB, 100, null, "done", "16/09/2026"),
];

// Files rotated in as downloads finish, so the demo loops forever.
const FILE_POOL: Array<[string, string, number, number]> = [
  ["conference-talk-recording.mp4", "MP4", 1.6 * GB, 24.2],
  ["debian-13.1.0-amd64-netinst.iso", "ISO", 754 * MB, 31.7],
  ["photos-backup-2026-08.zip", "ZIP", 2.1 * GB, 28.8],
  ["android-studio-2025.1.2-windows.exe", "EXE", 1.3 * GB, 33.4],
];

const TICK_MS = 900;
const SEGMENTS = 12;

function tickRows(rows: Row[], poolIndex: number): [Row[], number] {
  let nextPool = poolIndex;
  const next = rows.map((r, i) => {
    if (r.status === "downloading" && r.baseSpeed !== null) {
      const speed = r.baseSpeed * (0.86 + Math.random() * 0.28);
      const gained = ((speed * MB * (TICK_MS / 1000)) / r.bytes) * 100;
      const progress = r.progress + gained;
      if (progress >= 100) {
        return { ...r, progress: 100, speed: null, status: "done" as Status, doneTicks: 0 };
      }
      return { ...r, progress, speed };
    }
    // Only the three active slots recycle; the rest of the list is scenery.
    if (r.status === "done" && i < 3) {
      if (r.doneTicks >= 4) {
        const [name, ext, bytes, baseSpeed] = FILE_POOL[nextPool % FILE_POOL.length];
        nextPool += 1;
        return row(name, ext, bytes, 1.5, baseSpeed, "downloading", "18/09/2026");
      }
      return { ...r, doneTicks: r.doneTicks + 1 };
    }
    return r;
  });
  return [next, nextPool];
}

function fmtBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  const mb = bytes / MB;
  return mb >= 100 || Number.isInteger(mb) ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

function fmtEta(r: Row): string {
  if (r.status !== "downloading" || !r.speed) return "--";
  const sec = (((100 - r.progress) / 100) * r.bytes) / (r.speed * MB);
  if (sec < 90) return `${Math.max(1, Math.round(sec))}s`;
  return `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, "0")}s`;
}

const STATUS: Record<Status, string> = {
  downloading: "Downloading",
  queued: "Queued",
  paused: "Paused",
  done: "Completed",
};

/**
 * Parallel segment coverage under an active row, like the app's SegmentMap:
 * each connection fills its own byte range, at slightly different speeds.
 */
function SegmentStrip({ progress }: { progress: number }) {
  const p = progress / 100;
  return (
    <span className="mk-segs">
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const skew = 0.72 + ((i * 37) % 11) / 20; // stable per-segment speed
        const f = Math.min(1, p * skew + (p > 0.9 ? (p - 0.9) * 10 : 0));
        return (
          <span key={i} className="mk-seg">
            <span className="mk-seg-fill" style={{ transform: `scaleX(${f})` }} />
          </span>
        );
      })}
    </span>
  );
}

/** `still`: frozen, unlabelled scenery (used behind the video dialog). */
export default function AppMockup({ still = false }: { still?: boolean }) {
  const { version } = useLatestRelease();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>("0px");
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
  const rowsRef = useRef(rows);
  const poolRef = useRef(0);

  useEffect(() => {
    if (still || reduced || STATIC_MODE || !inView) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const [next, nextPool] = tickRows(rowsRef.current, poolRef.current);
      rowsRef.current = next;
      poolRef.current = nextPool;
      setRows(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [still, reduced, inView]);

  const active = rows.filter((r) => r.status === "downloading");
  const queued = rows.filter((r) => r.status === "queued").length;
  const totalSpeed = active.reduce((sum, r) => sum + (r.speed ?? 0), 0);

  return (
    <div
      ref={ref}
      className="mockup"
      {...(still
        ? { "aria-hidden": true }
        : {
            role: "img",
            "aria-label":
              "The Apex main window: eight downloads with live progress, per-connection segment bars, speed, time remaining and queue position",
          })}
    >
      <div aria-hidden="true" className="mk-window">
        <div className="mk-titlebar">
          <span className="mk-winbtn"><WinMinimize /></span>
          <span className="mk-winbtn"><WinMaximize /></span>
          <span className="mk-winbtn"><WinClose /></span>
        </div>

        <div className="mk-body">
          <aside className="mk-side">
            <div className="mk-brand">
              <LogoBadge size={26} />
              <span>
                <span className="mk-brand-name">Apex</span>
                <span className="mk-brand-sub">Download Manager</span>
              </span>
            </div>
            <span className="mk-nav-item"><GridIcon /> Dashboard</span>
            <span className="mk-nav-item active"><DownloadIcon size={14} /> Downloads</span>
            <span className="mk-nav-item"><GearIcon /> Settings</span>

            <div className="mk-disk">
              <span className="mk-disk-label"><HardDriveIcon size={11} /> Disk C:</span>
              <span className="mk-disk-bar"><span className="mk-disk-fill" /></span>
              <span className="mk-disk-meta"><span>317 GB used</span><span>62%</span></span>
            </div>
          </aside>

          <div className="mk-main">
            <div className="mk-toolbar">
              <span className="mk-btn amber"><PlusIcon /> Add URL</span>
              <span className="mk-btn solid"><VideoIcon /> Grab Video</span>
              <span className="mk-sep tb-md" />
              <span className="mk-btn ghost dim tb-md"><PlayIcon size={11} /> Resume</span>
              <span className="mk-btn ghost dim tb-md"><PauseIcon size={11} /> Pause</span>
              <span className="mk-btn ghost dim tb-md"><TrashIcon size={11} /> Delete</span>
              <span className="mk-sep tb-md" />
              <span className="mk-btn ghost tb-sm"><PauseCircleIcon /> Pause All</span>
              <span className="mk-select tb-xl"><ListOrderIcon /> 3 at once <ChevronDownIcon size={11} /></span>
              <span className="mk-select tb-lg"><PowerIcon /> When done: nothing <ChevronDownIcon size={11} /></span>
              <span className="mk-search">
                <SearchIcon /> <span className="mk-search-label">Search downloads</span>
                <kbd className="tb-sm">Ctrl F</kbd>
              </span>
              <span className="mk-count tb-xl">{rows.length} items</span>
            </div>

            <div className="mk-chips">
              <span className="mk-chip active">All</span>
              <span className="mk-chip">Active</span>
              <span className="mk-chip">Scheduled</span>
              <span className="mk-chip">Completed</span>
              <span className="mk-chip tb-sm">Failed</span>
              <span className="mk-sep tb-md" />
              <span className="mk-chip active tb-md">Any type</span>
              <span className="mk-chip tb-md">Video</span>
              <span className="mk-chip tb-md">Music</span>
              <span className="mk-chip tb-md">Programs</span>
              <span className="mk-chip tb-lg">Archives</span>
              <span className="mk-chip tb-lg">Documents</span>
              <span className="mk-chip tb-lg">Images</span>
              <span className="mk-chip tb-lg">Other</span>
            </div>

            <div className="mk-table">
              <div className="mk-row head">
                <span className="mk-check" />
                <span />
                <span>Name</span>
                <span className="mk-col-type">Type</span>
                <span className="mk-col-size">Size</span>
                <span>Progress</span>
                <span className="mk-col-speed">Speed</span>
                <span className="mk-col-eta">ETA</span>
                <span className="mk-col-status">Status</span>
                <span className="mk-col-mod">Modified</span>
              </div>

              {rows.map((r, i) => {
                const fill =
                  r.status === "done" ? "green" : r.status === "paused" ? "orange" : "";
                // Rows are fixed slots that never reorder; index is the identity.
                return (
                  <div className={`mk-row${i === 0 ? " selected" : ""}`} key={i}>
                    <span className="mk-check" />
                    <span className="mk-file-ico">
                      {r.status === "done" ? <FileIcon /> : <FileDownIcon />}
                    </span>
                    <span className="mk-name">{r.name}</span>
                    <span className="mk-type mk-col-type">{r.ext}</span>
                    <span className="mk-size mk-col-size">{fmtBytes(r.bytes)}</span>
                    <span className="mk-progress">
                      <span className="mk-progress-top">
                        <span className="mk-bar">
                          <span
                            className={`mk-fill ${fill}`.trim()}
                            style={{ transform: `scaleX(${r.progress / 100})` }}
                          />
                        </span>
                        <span className="mk-pct">{Math.floor(r.progress)}%</span>
                      </span>
                      {r.status === "downloading" && <SegmentStrip progress={r.progress} />}
                    </span>
                    <span className={`mk-speed mk-col-speed${r.speed === null ? " idle" : ""}`}>
                      {r.speed === null ? "-" : `${r.speed.toFixed(1)} MB/s`}
                    </span>
                    <span className={`mk-eta mk-col-eta${r.status !== "downloading" ? " idle" : ""}`}>
                      {fmtEta(r)}
                    </span>
                    <span className={`mk-status mk-col-status ${r.status}`}>
                      <span className="dot" />
                      {STATUS[r.status]}
                      {r.queuePos && <span className="mk-qpos">#{r.queuePos}</span>}
                    </span>
                    <span className="mk-mod mk-col-mod">{r.modified}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mk-statusbar">
          <span><ActivityIcon /> {active.length} active · {queued} queued</span>
          <span><WifiIcon /> {totalSpeed > 0 ? `${totalSpeed.toFixed(1)} MB/s` : "idle"}</span>
          <span className="right">
            <span><GaugeIcon /> No limit <ChevronDownIcon size={10} /></span>
            <span>v{version ?? FALLBACK_VERSION}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
