import type { SVGProps } from "react";

/**
 * The Apex peak-A mark — same geometry as the website logo and the
 * generated app/extension icons (see website/public/favicon.svg).
 * Inherits color via currentColor.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.8 20.4 21h-4.1l-4.3-9.5L7.7 21H3.6Z" />
    </svg>
  );
}

/**
 * Mark on an amber rounded-square badge — the in-app brand chip used in
 * the sidebar and the capture window. Gradient stops are brand artwork
 * (fixed, like the chart constants), the mark uses the on-accent token.
 */
export function LogoBadge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="apex-badge-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0c266" />
          <stop offset="1" stopColor="#b8862e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#apex-badge-fill)" />
      <path
        d="M16 7.5 22.7 22h-3.6l-3.1-7-3.1 7H9.3Z"
        fill="var(--color-on-accent)"
      />
    </svg>
  );
}
