import { useEffect, useState } from "react";
import { Reveal, useCountUp, useInView } from "../lib/reveal";
import { DownloadIcon } from "./icons";

/** Anonymous total from /api/stats; hidden until the API returns a real count. */
function StatLine() {
  const [total, setTotal] = useState<number | null>(null);
  const { ref, inView } = useInView<HTMLDivElement>();
  const shown = useCountUp(total ?? 0, inView && total !== null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { total?: number } | null) => {
        if (cancelled) return;
        if (data && typeof data.total === "number" && data.total > 0) {
          setTotal(data.total);
        } else if (import.meta.env.DEV) {
          setTotal(12482); // preview value; the real API only exists on Cloudflare
        }
      })
      .catch(() => {
        if (!cancelled && import.meta.env.DEV) setTotal(12482);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (total === null) return null;

  return (
    <div className="stat-line" ref={ref}>
      <DownloadIcon size={14} />
      <span>
        <strong>{shown.toLocaleString("en-US")}</strong> downloads counted — and
        that's all we know
      </span>
    </div>
  );
}

export default function DownloadCta() {
  return (
    <section id="download" className="download-section">
      <div className="container">
        <Reveal>
          <span className="kicker">Download</span>
          <h2>Get Apex</h2>
          <p className="download-sub">
            Free for personal use. Windows 10 and 11, 64-bit. The installer is
            about 10 MB.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <a className="btn btn-primary" href="/dl">
            <DownloadIcon />
            Download Apex for Windows
          </a>
          <p className="download-note">
            Includes the browser extension for Chrome, Edge, and Brave.
          </p>
          <StatLine />
        </Reveal>
      </div>
    </section>
  );
}
