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
 * Mark on a black rounded-square badge — the in-app brand chip used in
 * the sidebar and the capture window. Matches the desktop/taskbar icon:
 * near-black tile, white notched peak-A. Colors are brand artwork
 * (fixed, like the chart constants); the ring keeps the tile visible
 * against the app's dark surfaces.
 */
export function LogoBadge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="9" fill="#0c0d10" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8.5"
        fill="none"
        stroke="rgba(255,255,255,0.16)"
      />
      <path
        d="M12 2.8 20.4 21h-4.1l-4.3-9.5L7.7 21H3.6Z"
        transform="translate(6 6) scale(0.8333)"
        fill="#ffffff"
      />
    </svg>
  );
}
