import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** ?static disables entrance animations and the live demo — for screenshots/QA. */
export const STATIC_MODE =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("static");

/**
 * True once the element has entered the viewport (fires once).
 * Returns a callback ref so it also works for elements that mount late.
 */
export function useInView<T extends HTMLElement>(rootMargin = "0px 0px -60px") {
  const [inView, setInView] = useState(STATIC_MODE);
  const ioRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: T | null) => {
      ioRef.current?.disconnect();
      ioRef.current = null;
      if (!node || STATIC_MODE) return;
      if (!("IntersectionObserver" in window)) {
        setInView(true);
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setInView(true);
            io.disconnect();
          }
        },
        { rootMargin },
      );
      io.observe(node);
      ioRef.current = io;
    },
    [rootMargin],
  );

  return { ref, inView };
}

/** Fade-up wrapper. Children animate in when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-visible" : ""} ${className}`.trim()}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Animated count-up that starts when `start` becomes true. */
export function useCountUp(target: number, start: boolean, duration = 1400) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(2, -10 * t); // easeOutExpo
      setValue(Math.round(target * (t === 1 ? 1 : eased)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration, reduced]);

  return value;
}
