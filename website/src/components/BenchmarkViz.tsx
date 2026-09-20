/**
 * One real measurement, run on 2026-09-20 from South Africa. Both arms
 * downloaded the same file back to back on an idle line: the baseline with
 * a single connection, the way a browser does it, then Apex itself, with
 * its timings read from the app's own database.
 *
 * Numbers are facts, not decoration. If the test is re-run, update all of
 * them together, including the method note.
 */

const FILE = "debian-13.7.0-amd64-netinst.iso";
const BYTES = 792_723_456;

const RUNS = [
  { label: "One connection", sub: "as a browser downloads", secs: 182.9, mbs: 4.14 },
  { label: "Apex", sub: "32 ranges, 80 after re-splits", secs: 134.1, mbs: 5.64 },
];

const SLOWEST = Math.max(...RUNS.map((r) => r.secs));

export default function BenchmarkViz() {
  return (
    <div className="bench">
      <div className="bench-head">
        <span className="bench-file mono">{FILE}</span>
        <span className="bench-meta mono">
          {(BYTES / 1048576).toFixed(0)} MB · cdimage.debian.org · 2026-09-20
        </span>
      </div>

      <ol className="bench-runs">
        {RUNS.map((r, i) => (
          <li key={r.label} className={i === RUNS.length - 1 ? "is-apex" : undefined}>
            <div className="bench-label">
              <span className="bench-name">{r.label}</span>
              <span className="bench-sub">{r.sub}</span>
            </div>
            <div className="bench-bar">
              <span
                className="bench-fill"
                style={{ width: `${(r.secs / SLOWEST) * 100}%` }}
              />
            </div>
            <div className="bench-nums mono">
              <span className="bench-secs">{r.secs.toFixed(0)}s</span>
              <span className="bench-rate">{r.mbs.toFixed(2)} MB/s</span>
            </div>
          </li>
        ))}
      </ol>

      <dl className="bench-stats">
        <div>
          <dt>Time saved</dt>
          <dd className="mono">49s</dd>
        </div>
        <div>
          <dt>Faster by</dt>
          <dd className="mono">1.36x</dd>
        </div>
        <div>
          <dt>Line speed</dt>
          <dd className="mono">63 Mbit/s</dd>
        </div>
        <div>
          <dt>Runs</dt>
          <dd className="mono">1 each, back to back</dd>
        </div>
      </dl>

      <p className="bench-note">
        <strong>Where this does not help.</strong> The same test against
        download.blender.org showed no gain at all: one connection already
        reached 7.5 MB/s there and saturated the line, so eight parallel
        connections managed 7.0 MB/s. Splitting a file helps when the server
        limits each connection, which is what the Debian mirror does. It
        cannot make your own line faster.
      </p>

      <p className="bench-method mono">
        Method: single connection measured with curl, one stream, written to
        disk. Apex measured from its own database, add to finish, which
        includes its setup probe. Same file, same session, nothing else
        downloading. Your numbers will differ by line, distance and mirror.
      </p>
    </div>
  );
}
