import { useEffect, useRef, useState } from "react";

export type Day = { date: string; count: number };

/** Plot height in CSS pixels. Bars are laid out in real pixels rather than a
 *  scaled viewBox, so nothing is stretched and hit testing is exact. */
const H = 168;
const GAP = 2;
/** Headroom above the tallest bar so the peak label has somewhere to sit. */
const TOP = 0.86;

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function DailyChart({ days }: { days: Day[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  // Measure rather than guess, so the bars fit whatever column they land in
  // and the page never gains a horizontal scrollbar on a narrow screen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = days.length;
  const counts = days.map((d) => d.count);
  const max = Math.max(1, ...counts);
  const peakIndex = counts.indexOf(max);
  const step = n > 0 ? (width + GAP) / n : 0;
  const barW = Math.max(1, step - GAP);

  const barHeight = (count: number) =>
    count === 0 ? 0 : Math.max(2, (count / max) * H * TOP);

  /** Continuous feedback: the reading follows the pointer the whole way
   *  across, rather than waiting for a click on a 4px bar. */
  function pointAt(clientX: number) {
    const el = plotRef.current;
    if (!el || step === 0) return;
    const x = clientX - el.getBoundingClientRect().left;
    const i = Math.floor(x / step);
    setActive(i < 0 ? 0 : i >= n ? n - 1 : i);
  }

  const shown = active === null ? null : days[active];
  // Keep the readout inside the plot instead of letting it hang off an edge.
  const rawX = active === null ? 0 : active * step + barW / 2;
  const clampedX = Math.min(Math.max(rawX, 54), Math.max(54, width - 54));
  const windowTotal = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="pulse-chart" ref={wrapRef}>
      <div
        className="pulse-plot"
        ref={plotRef}
        style={{ height: H }}
        onPointerMove={(e) => pointAt(e.clientX)}
        onPointerDown={(e) => {
          // Capture so a finger dragged across the chart keeps reporting
          // after it leaves the element's own bounds.
          e.currentTarget.setPointerCapture(e.pointerId);
          pointAt(e.clientX);
        }}
        onPointerUp={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label={`Download clicks per day over the last ${n} days, ${windowTotal} in total, peaking at ${max}.`}
          >
            <line className="pulse-axis" x1="0" y1={H - 0.5} x2={width} y2={H - 0.5} />
            {days.map((d, i) => {
              const h = barHeight(d.count);
              return (
                <rect
                  key={d.date}
                  className={`pulse-bar${i === active ? " on" : ""}${
                    d.count === 0 ? " empty" : ""
                  }`}
                  x={i * step}
                  y={H - h}
                  width={barW}
                  height={h}
                  style={{ animationDelay: `${Math.min(i * 6, 400)}ms` }}
                />
              );
            })}
          </svg>
        )}

        {shown && (
          <>
            <div className="pulse-guide" style={{ transform: `translateX(${rawX}px)` }} />
            <div className="pulse-readout" style={{ transform: `translateX(${clampedX}px)` }}>
              <strong className="mono">{shown.count}</strong>
              <span>{dayLabel(shown.date)}</span>
            </div>
          </>
        )}
      </div>

      <div className="pulse-chart-foot">
        <span>{n > 0 ? dayLabel(days[0].date) : ""}</span>
        <span className="pulse-peak mono">
          peak {max} on {days[peakIndex] ? dayLabel(days[peakIndex].date) : ""}
        </span>
        <span>{n > 0 ? dayLabel(days[n - 1].date) : ""}</span>
      </div>
    </div>
  );
}
