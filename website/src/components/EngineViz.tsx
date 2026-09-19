import { useEffect, useRef, useState } from "react";
import { STATIC_MODE, useInView, usePrefersReducedMotion } from "../lib/reveal";

/*
 * A model of the engine's segment planner (desktop-ui/src-tauri/src/engine.rs):
 * the file starts as 32 equal ranges, one per connection, all written into
 * one preallocated file. When a connection finishes its range it takes over
 * the second half of the largest range still remaining, so no connection
 * idles while another crawls. Positions are fractions of the file (0..1).
 */

type Seg = { id: number; conn: number; start: number; end: number; pos: number };
type Ev = { t: number; conn: number; from: number; to: number; donor: number };
type Sim = { t: number; segs: Seg[]; events: Ev[]; nextId: number; splits: number };

const CONNS = 32;
const FILE_GB = 5.8;
const STEP = 0.2; // seconds per tick
const BASE = 1 / CONNS / 9; // a typical connection covers its range in ~9s
// Stop splitting below this remainder; the real engine's floor (2 x 256 KB)
// would be invisible at this scale.
const MIN_SPLIT = 0.006;

// Stable per-connection speeds. Real servers hand out uneven lanes: a few
// connections run at twice the pace of others, which is what re-splitting fixes.
const FACTOR = Array.from({ length: CONNS }, (_, i) => {
  const r = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1;
  return 0.4 + r * r * 1.8;
});

function fresh(): Sim {
  const segs: Seg[] = Array.from({ length: CONNS }, (_, i) => ({
    id: i,
    conn: i,
    start: i / CONNS,
    end: (i + 1) / CONNS,
    pos: i / CONNS,
  }));
  return { t: 0, segs, events: [], nextId: CONNS, splits: 0 };
}

function step(sim: Sim): Sim {
  const t = sim.t + STEP;
  let segs = sim.segs.map((s) =>
    s.pos >= s.end ? s : { ...s, pos: Math.min(s.end, s.pos + BASE * FACTOR[s.conn] * STEP) },
  );
  const events = [...sim.events];
  let { nextId, splits } = sim;

  // Connections that just finished look for work.
  const finished = segs.filter(
    (s, i) => s.pos >= s.end && sim.segs[i] && sim.segs[i].pos < sim.segs[i].end,
  );
  for (const done of finished) {
    let donor: Seg | null = null;
    for (const s of segs) {
      if (s.pos >= s.end) continue;
      if (!donor || s.end - s.pos > donor.end - donor.pos) donor = s;
    }
    if (!donor || donor.end - donor.pos < MIN_SPLIT) continue;
    const mid = donor.pos + (donor.end - donor.pos) / 2;
    const taken: Seg = { id: nextId++, conn: done.conn, start: mid, end: donor.end, pos: mid };
    const donorId = donor.id;
    segs = segs.map((s) => (s.id === donorId ? { ...s, end: mid } : s));
    segs.push(taken);
    splits += 1;
    events.push({ t, conn: done.conn, from: mid, to: taken.end, donor: donor.conn });
  }
  return { t, segs, events: events.slice(-4), nextId, splits };
}

function runTo(seconds: number): Sim {
  let s = fresh();
  while (s.t < seconds) s = step(s);
  return s;
}

const gb = (f: number) => (f * FILE_GB).toFixed(2);
// Frozen views (?static, reduced motion) show this moment: the fastest
// connections have finished and re-split, most ranges are still filling.
const SNAPSHOT_S = 6.4;
const pad2 = (n: number) => String(n + 1).padStart(2, "0");

export default function EngineViz() {
  const reduced = usePrefersReducedMotion();
  const frozen = reduced || STATIC_MODE;
  const { ref, inView } = useInView<HTMLDivElement>("0px 0px -120px");
  const [sim, setSim] = useState<Sim>(() => (frozen ? runTo(SNAPSHOT_S) : fresh()));
  const simRef = useRef(sim);
  const holdRef = useRef(0);

  useEffect(() => {
    if (frozen) {
      const snap = runTo(SNAPSHOT_S);
      simRef.current = snap;
      setSim(snap);
      return;
    }
    if (!inView) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const cur = simRef.current;
      const allDone = cur.segs.every((s) => s.pos >= s.end);
      let next: Sim;
      if (allDone) {
        holdRef.current += STEP;
        if (holdRef.current < 2.4) return;
        holdRef.current = 0;
        next = fresh();
      } else {
        next = step(cur);
      }
      simRef.current = next;
      setSim(next);
    }, STEP * 1000);
    return () => clearInterval(id);
  }, [frozen, inView]);

  const done = sim.segs.reduce((a, s) => a + (s.pos - s.start), 0);
  const active = sim.segs.filter((s) => s.pos < s.end);
  const speedMb = active.reduce((a, s) => a + FACTOR[s.conn], 0) * 1.55;
  const complete = active.length === 0;

  return (
    <div
      ref={ref}
      className="viz"
      role="img"
      aria-label="Illustration: one 5.8 GB file split into 32 ranges downloading in parallel. When a connection finishes its range, it takes over the second half of the largest range still left."
    >
      <div aria-hidden="true">
        <div className="viz-head">
          <span className="viz-file">ubuntu-24.04.2-desktop-amd64.iso</span>
          <span className="viz-tags mono">
            <span>{FILE_GB} GB</span>
            <span>{active.length} / {CONNS} connections</span>
            <span className="viz-sim">Illustration, sped up</span>
          </span>
        </div>

        <div className="viz-track">
          {sim.segs.map((s) => (
            <span
              key={`f${s.id}`}
              className={`viz-fill${s.pos >= s.end ? " done" : ""}`}
              style={{ transform: `translateX(${s.start * 100}%) scaleX(${s.pos - s.start})` }}
            />
          ))}
          {sim.segs.map((s) =>
            s.start > 0 ? (
              <span
                key={`d${s.id}`}
                className={`viz-div${s.id >= CONNS ? " split" : ""}`}
                style={{ transform: `translateX(${s.start * 100}%)` }}
              />
            ) : null,
          )}
          {active.map((s) => (
            <span
              key={`h${s.id}`}
              className="viz-headmark"
              style={{ transform: `translateX(${s.pos * 100}%)` }}
            />
          ))}
        </div>

        <div className="viz-axis mono">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <span key={f} className={f === 1 ? "end" : undefined} style={{ left: `${f * 100}%` }}>
              {f === 0 ? "0 GB" : `${gb(f)} GB`}
            </span>
          ))}
        </div>

        <dl className="viz-stats">
          <div>
            <dt>Downloaded</dt>
            <dd className="mono">{gb(done)} GB</dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd className="mono">{complete ? "-" : `${speedMb.toFixed(1)} MB/s`}</dd>
          </div>
          <div>
            <dt>Ranges</dt>
            <dd className="mono">{sim.segs.length}</dd>
          </div>
          <div>
            <dt>Re-splits</dt>
            <dd className="mono">{sim.splits}</dd>
          </div>
        </dl>

        <ol className="viz-log mono">
          {complete ? (
            <li>
              <span className="t">t+{sim.t.toFixed(1).padStart(4, "0")}s</span>
              <span className="note">All ranges complete · temp file renamed into place</span>
            </li>
          ) : sim.events.length === 0 ? (
            <li>
              <span className="t">t+00.0s</span>
              <span className="note">32 ranges planned · one preallocated file</span>
            </li>
          ) : (
            sim.events
              .slice()
              .reverse()
              .map((e) => (
                <li key={`${e.t}-${e.conn}`}>
                  <span className="t">t+{e.t.toFixed(1).padStart(4, "0")}s</span>
                  <span className="msg">
                    conn {pad2(e.conn)} finished, took half of conn {pad2(e.donor)}
                  </span>
                  <span className="range">{gb(e.from)}-{gb(e.to)} GB</span>
                </li>
              ))
          )}
        </ol>
      </div>
    </div>
  );
}
