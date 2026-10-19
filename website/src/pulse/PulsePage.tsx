import { useEffect, useState } from "react";
import { LogoMark } from "../components/icons";
import DailyChart, { type Day } from "./DailyChart";

type Stats = {
  total: number;
  today: number;
  thisVersion?: number;
  days: Day[];
  version?: string;
  sizeMb?: number;
  fileName?: string;
  sha256?: string;
  updated: string;
};

type Release = {
  version: string;
  published: string | null;
  exe: number;
  msi: number;
  total: number;
};

type Pulse = {
  repo: {
    stars: number;
    forks: number;
    openIssues: number | null;
    openIssuesCapped?: boolean;
  } | null;
  releases: Release[];
  updated: string;
};

const nf = new Intl.NumberFormat("en-GB");

/** One fork is not "1 forks". */
function plural(n: number, word: string): string {
  return `${nf.format(n)} ${word}${n === 1 ? "" : "s"}`;
}

function since(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 90) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="pulse-stat">
      <span className="pulse-stat-value mono">{value}</span>
      <span className="pulse-stat-label">{label}</span>
      {note && <span className="pulse-stat-note">{note}</span>}
    </div>
  );
}

function Checksum({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      className="pulse-sha"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // Clipboard access can be refused. The text is selectable anyway,
          // so say nothing rather than raise an alarm about a copy.
        }
      }}
    >
      <code className="mono">{value}</code>
      <span className="pulse-sha-action">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export default function PulsePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [settled, setSettled] = useState(false);

  // Nothing is read on the server and nothing at module load: this page is
  // client rendered, and the numbers arrive after mount.
  useEffect(() => {
    let live = true;
    const json = async <T,>(url: string): Promise<T | null> => {
      try {
        const r = await fetch(url);
        return r.ok ? ((await r.json()) as T) : null;
      } catch {
        return null;
      }
    };
    Promise.all([
      json<Stats>("/api/stats?days=60"),
      json<Pulse>("/api/pulse"),
    ]).then(([s, p]) => {
      if (!live) return;
      setStats(s);
      setPulse(p);
      setSettled(true);
    });
    return () => {
      live = false;
    };
  }, []);

  // The counter began part way through the requested window, so the days
  // before it are not quiet days, they are days with no record. Leading
  // empties are dropped rather than drawn as 50 flat columns that say
  // nothing. Gaps inside the series are real zeros and stay.
  const firstRecorded = (stats?.days ?? []).findIndex((d) => d.count > 0);
  const series =
    stats && firstRecorded > 0 ? stats.days.slice(firstRecorded) : (stats?.days ?? []);

  const releases = (pulse?.releases ?? []).filter((r) => r.total > 0);
  const releaseMax = Math.max(1, ...releases.map((r) => r.total));
  const nothing = settled && !stats && !pulse;

  return (
    <div className="pulse">
      <header className="pulse-head">
        <a className="pulse-home" href="/" aria-label="Apex Download Manager home">
          <LogoMark size={18} />
        </a>
        <div className="pulse-title">
          <h1>Pulse</h1>
          <p className="pulse-sub">
            You found the engine room. Every number here is a project total:
            counts of clicks and downloads, with nothing recorded about who
            asked.
          </p>
        </div>
        <span className={`pulse-live${settled ? " on" : ""}`}>
          <i aria-hidden="true" />
          {settled ? "live" : "reading"}
        </span>
      </header>

      {nothing && (
        <p className="pulse-empty">
          Neither the counter nor GitHub answered just now. Nothing is broken on
          your side; try again in a minute.
        </p>
      )}

      <section className="pulse-stats" aria-label="Headline numbers">
        <Stat
          value={stats ? nf.format(stats.total) : "..."}
          label="Download clicks"
          note="since the counter began"
        />
        <Stat
          value={stats ? nf.format(stats.today) : "..."}
          label="Today"
          note="UTC day, still running"
        />
        <Stat
          value={stats?.thisVersion != null ? nf.format(stats.thisVersion) : "..."}
          label={stats?.version ? `On ${stats.version}` : "This version"}
          note="clicks since release"
        />
        <Stat
          value={pulse?.repo ? nf.format(pulse.repo.stars) : "..."}
          label="GitHub stars"
          note={
            pulse?.repo
              ? [
                  plural(pulse.repo.forks, "fork"),
                  pulse.repo.openIssues === null
                    ? null
                    : `${plural(pulse.repo.openIssues, "open issue")}${
                        pulse.repo.openIssuesCapped ? " or more" : ""
                      }`,
                ]
                  .filter(Boolean)
                  .join(", ")
              : undefined
          }
        />
      </section>

      {series.length > 0 && (
        <section className="pulse-card" aria-label="Clicks per day">
          <div className="pulse-card-head">
            <h2>Clicks per day</h2>
            <span className="pulse-card-note">{series.length} days, UTC</span>
          </div>
          <DailyChart days={series} />
          <p className="pulse-foot-note">
            Counting began on {series[0]?.date}, so the series starts there
            rather than at the start of the window. Hover or drag across the
            chart for a single day.
          </p>
        </section>
      )}

      {releases.length > 0 && (
        <section className="pulse-card" aria-label="Downloads per release">
          <div className="pulse-card-head">
            <h2>Downloads per release</h2>
            <span className="pulse-card-note">installers only</span>
          </div>
          <ul className="pulse-releases">
            {releases.map((r) => (
              <li key={r.version}>
                <span className="pulse-rel-v mono">{r.version}</span>
                <span className="pulse-rel-track">
                  <span
                    className="pulse-rel-fill"
                    style={{ width: `${(r.total / releaseMax) * 100}%` }}
                  />
                </span>
                <span className="pulse-rel-n mono">{nf.format(r.total)}</span>
                <span className="pulse-rel-split mono">
                  {nf.format(r.exe)} exe · {nf.format(r.msi)} msi
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats?.version && (
        <section className="pulse-card" aria-label="Current build">
          <div className="pulse-card-head">
            <h2>Current build</h2>
            <span className="pulse-card-note">{since(stats.updated)}</span>
          </div>
          <dl className="pulse-build">
            <div>
              <dt>Version</dt>
              <dd className="mono">{stats.version}</dd>
            </div>
            <div>
              <dt>Installer</dt>
              <dd className="mono">{stats.sizeMb ?? "?"} MB</dd>
            </div>
            <div className="pulse-build-wide">
              <dt>File</dt>
              <dd className="mono">{stats.fileName ?? "unknown"}</dd>
            </div>
            {stats.sha256 && (
              <div className="pulse-build-wide">
                <dt>SHA-256</dt>
                <dd>
                  <Checksum value={stats.sha256} />
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <footer className="pulse-tail">
        <p>
          Clicks count the redirect being issued, not a finished download, so
          read them as an upper bound. The installer travels from GitHub
          straight to the reader and never touches this server.
        </p>
        <a href="/">Back to the front of the house</a>
      </footer>
    </div>
  );
}
