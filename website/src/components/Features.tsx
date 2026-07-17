import type { ReactNode } from "react";
import { Reveal } from "../lib/reveal";
import {
  CaptureIcon,
  ClockIcon,
  CommandIcon,
  PauseResumeIcon,
  SegmentsIcon,
  ShieldCheckIcon,
} from "./icons";

const FEATURES: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <SegmentsIcon />,
    title: "Parallel connections",
    body: "Each file is split into up to 32 segments that download at the same time. Stalled segments retry on their own.",
  },
  {
    icon: <PauseResumeIcon />,
    title: "Pause and resume",
    body: "Progress is saved per segment as it arrives. Pause, reboot, or lose your connection: the transfer picks up from the same byte.",
  },
  {
    icon: <CaptureIcon />,
    title: "Browser capture",
    body: "The companion extension hands downloads to Apex automatically, or right-click any link and choose “Download with Apex.”",
  },
  {
    icon: <ClockIcon />,
    title: "Scheduling and queues",
    body: "Start downloads at a set time, limit how many run at once, and let your PC sleep or shut down when the queue empties.",
  },
  {
    icon: <ShieldCheckIcon />,
    title: "Checksum verification",
    body: "Paste the SHA-256 from the publisher's site and Apex checks it against the finished file.",
  },
  {
    icon: <CommandIcon />,
    title: "Keyboard shortcuts",
    body: "Add, search, pause, resume, and delete without touching the mouse. A clipboard watcher offers to queue links you copy.",
  },
];

export default function Features() {
  return (
    <section id="features">
      <div className="container">
        <Reveal className="section-head">
          <span className="kicker">Features</span>
          <h2>Built for big files and slow servers</h2>
          <p className="lead">
            A native Rust engine behind a quiet interface. No ads, no bundled
            extras, no background services.
          </p>
        </Reveal>

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 70}>
              <article className="feature-card">
                <div className="feature-ico">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
