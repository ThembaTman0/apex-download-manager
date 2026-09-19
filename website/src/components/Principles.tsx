import type { ReactNode } from "react";
import { Reveal } from "../lib/reveal";
import { FALLBACK_SIZE_MB, useLatestRelease } from "../lib/latestRelease";

/* --- Tiny isometric line-art kit ------------------------------------------ */

type P = [number, number];
const C = Math.cos(Math.PI / 6);
const S = 0.5;
const iso = (x: number, y: number, z: number): P => [(x - y) * C, (x + y) * S - z];

type Tone = "base" | "lit" | "ghost";
type Box = { x: number; y: number; z: number; w: number; d: number; h: number; tone?: Tone };

function faces(b: Box) {
  const { x, y, z, w, d, h } = b;
  return {
    top: [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)],
    right: [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)],
    left: [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)],
  };
}

const pts = (ps: P[]) => ps.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

function Figure({
  label,
  boxes,
  overlay,
  underlay,
  bounds = [],
}: {
  label: string;
  boxes: Box[];
  overlay?: ReactNode;
  underlay?: ReactNode;
  bounds?: P[];
}) {
  const sorted = [...boxes].sort((a, b) => a.x + a.y - (b.x + b.y) || a.z - b.z);
  const all: P[] = [...bounds];
  for (const b of sorted) {
    const f = faces(b);
    all.push(...f.top, ...f.right, ...f.left);
  }
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const pad = 6;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad;
  const h = Math.max(...ys) - minY + pad;
  return (
    <figure className="fig">
      <figcaption className="fig-label mono">{label}</figcaption>
      <svg
        className="fig-art"
        viewBox={`${minX.toFixed(1)} ${minY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`}
        aria-hidden="true"
        focusable="false"
      >
        {underlay}
        {sorted.map((b, i) => {
          const f = faces(b);
          return (
            <g key={i} className={`iso iso-${b.tone ?? "base"}`}>
              <polygon className="f-left" points={pts(f.left)} />
              <polygon className="f-right" points={pts(f.right)} />
              <polygon className="f-top" points={pts(f.top)} />
            </g>
          );
        })}
        {overlay}
      </svg>
    </figure>
  );
}

/* FIG 0.1: a die on a package: the native engine. */
function FigNative() {
  const boxes: Box[] = [{ x: 0, y: 0, z: 0, w: 150, d: 150, h: 8 }];
  // Contact pads along the two visible edges.
  for (let i = 0; i < 7; i++) {
    boxes.push({ x: 150, y: 12 + i * 19, z: 0, w: 8, d: 9, h: 3 });
    boxes.push({ x: 12 + i * 19, y: 150, z: 0, w: 9, d: 8, h: 3 });
  }
  boxes.push({ x: 38, y: 38, z: 8, w: 74, d: 74, h: 16, tone: "lit" });
  // Die grid, drawn on the die's top face.
  const grid: ReactNode[] = [];
  for (let i = 1; i < 4; i++) {
    const t = 38 + (74 / 4) * i;
    const [a1, a2] = [iso(t, 38, 24), iso(t, 112, 24)];
    const [b1, b2] = [iso(38, t, 24), iso(112, t, 24)];
    grid.push(<line key={`a${i}`} x1={a1[0]} y1={a1[1]} x2={a2[0]} y2={a2[1]} />);
    grid.push(<line key={`b${i}`} x1={b1[0]} y1={b1[1]} x2={b2[0]} y2={b2[1]} />);
  }
  return <Figure label="FIG 0.1" boxes={boxes} overlay={<g className="iso-grid">{grid}</g>} />;
}

/* FIG 0.2: a file as a row of blocks; saved blocks solid, the rest outlined. */
function FigResume() {
  const boxes: Box[] = [];
  const n = 9;
  const saved = 5;
  for (let i = 0; i < n; i++) {
    boxes.push({
      x: i * 30,
      y: 0,
      z: 0,
      w: 26,
      d: 46,
      h: 26,
      tone: i < saved ? "lit" : "ghost",
    });
  }
  // A marker standing at the resume offset.
  const mx = saved * 30 - 2;
  const a = iso(mx, -14, 0);
  const b = iso(mx, -14, 78);
  const c = iso(mx, 60, 0);
  const overlay = (
    <g className="iso-marker">
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      <line className="dash" x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} />
      <circle cx={b[0]} cy={b[1]} r={3} />
    </g>
  );
  return <Figure label="FIG 0.2" boxes={boxes} overlay={overlay} bounds={[b, c]} />;
}

/* FIG 0.3: a closed box inside a boundary ring on the ground: local only. */
function FigLocal() {
  const cx = 60;
  const cy = 60;
  const ring = (r: number, cls: string) => {
    const [x, y] = iso(cx, cy, 0);
    return <ellipse className={cls} cx={x} cy={y} rx={r * Math.SQRT2 * C} ry={r * Math.SQRT2 * S} />;
  };
  const r1 = 118;
  const r2 = 92;
  const [ox, oy] = iso(cx, cy, 0);
  const bounds: P[] = [
    [ox - r1 * Math.SQRT2 * C, oy],
    [ox + r1 * Math.SQRT2 * C, oy],
    [ox, oy + r1 * Math.SQRT2 * S],
    [ox, oy - r1 * Math.SQRT2 * S],
  ];
  const boxes: Box[] = [
    { x: 20, y: 20, z: 0, w: 80, d: 80, h: 70 },
    { x: 34, y: 34, z: 70, w: 52, d: 52, h: 6, tone: "lit" },
  ];
  return (
    <Figure
      label="FIG 0.3"
      boxes={boxes}
      bounds={bounds}
      underlay={
        <g className="iso-rings">
          {ring(r1, "dash")}
          {ring(r2, "")}
        </g>
      }
    />
  );
}

export default function Principles() {
  const { sizeMb } = useLatestRelease();
  const cols = [
    {
      fig: <FigNative />,
      title: "Native, not a wrapper",
      body: `A Rust download engine in a Tauri shell. No Electron, no Java runtime, and a ${sizeMb ?? FALLBACK_SIZE_MB} MB installer.`,
    },
    {
      fig: <FigResume />,
      title: "Nothing starts over",
      body: "Progress is saved per segment as it arrives. Pause, reboot or lose the connection, and the transfer continues from the same byte.",
    },
    {
      fig: <FigLocal />,
      title: "Local by design",
      body: "No account, no ads, no telemetry. The only traffic is your downloads and a check for updates on GitHub.",
    },
  ];

  return (
    <section className="band statement-band" aria-labelledby="statement">
      <div className="container">
        <Reveal>
          <h2 id="statement" className="statement">
            Built for big files and slow servers.{" "}
            <span>
              A native Rust engine behind a quiet interface. No ads, no bundled
              extras, no background services.
            </span>
          </h2>
        </Reveal>

        <div className="principles">
          {cols.map((c, i) => (
            <Reveal key={c.title} delay={i * 80} className="principle">
              {c.fig}
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
