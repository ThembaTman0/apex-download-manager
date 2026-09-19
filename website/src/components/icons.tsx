import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** The Apex peak-A mark (same geometry as favicon.svg and the app). */
export function LogoMark({ size = 22, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M12 2.8 20.4 21h-4.1l-4.3-9.5L7.7 21H3.6Z" />
    </svg>
  );
}

/**
 * The in-app brand chip: near-black tile, white peak-A, faint white ring.
 * Mirrors desktop-ui/src/components/ui/LogoMark.tsx LogoBadge.
 */
export function LogoBadge({ size = 26, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...rest}>
      <rect width="32" height="32" rx="9" fill="#0c0d10" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke="rgba(255,255,255,0.16)" />
      <path d="M12 2.8 20.4 21h-4.1l-4.3-9.5L7.7 21H3.6Z" transform="translate(6 6) scale(0.8333)" fill="#ffffff" />
    </svg>
  );
}

export const CheckIcon = (p: IconProps) => (
  <Base size={15} strokeWidth={2} {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base size={12} strokeWidth={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const ArrowRight = (p: IconProps) => (
  <Base size={14} strokeWidth={1.8} {...p}>
    <path d="M5 12h14m-5.5-5.5L19 12l-5.5 5.5" />
  </Base>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Base size={16} {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Base>
);

export const DownloadIcon = (p: IconProps) => (
  <Base size={16} strokeWidth={1.8} {...p}>
    <path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2M4.5 20h15" />
  </Base>
);

export const FileIcon = (p: IconProps) => (
  <Base size={13} {...p}>
    <path d="M13.5 3H7a1.6 1.6 0 0 0-1.6 1.6v14.8A1.6 1.6 0 0 0 7 21h10a1.6 1.6 0 0 0 1.6-1.6V8.1Z" />
    <path d="M13.5 3v5.1h5.1" />
  </Base>
);

export const FileDownIcon = (p: IconProps) => (
  <Base size={13} {...p}>
    <path d="M13.5 3H7a1.6 1.6 0 0 0-1.6 1.6v14.8A1.6 1.6 0 0 0 7 21h10a1.6 1.6 0 0 0 1.6-1.6V8.1Z" />
    <path d="M13.5 3v5.1h5.1M12 11v6m0 0-2.4-2.4M12 17l2.4-2.4" />
  </Base>
);

export const GitHubIcon = ({ size = 16, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
    <path d="M12 1.7a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.96c-2.92.63-3.54-1.24-3.54-1.24-.48-1.21-1.17-1.54-1.17-1.54-.95-.65.07-.63.07-.63 1.05.07 1.61 1.08 1.61 1.08.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.66-1.4-2.33-.27-4.79-1.17-4.79-5.2 0-1.14.41-2.08 1.08-2.81-.1-.27-.47-1.34.1-2.78 0 0 .89-.28 2.9 1.07a10.1 10.1 0 0 1 5.28 0c2-1.35 2.89-1.07 2.89-1.07.58 1.44.21 2.51.11 2.78.67.73 1.08 1.67 1.08 2.81 0 4.04-2.47 4.93-4.82 5.19.38.33.72.97.72 1.96v2.91c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.7Z" />
  </svg>
);

/* Window chrome glyphs for the app mockups */
export const WinMinimize = (p: IconProps) => (
  <Base size={10} strokeWidth={1.4} {...p}>
    <path d="M4 12h16" />
  </Base>
);

export const WinMaximize = (p: IconProps) => (
  <Base size={10} strokeWidth={1.4} {...p}>
    <rect x="5" y="5" width="14" height="14" rx="1" />
  </Base>
);

export const WinClose = (p: IconProps) => (
  <Base size={10} strokeWidth={1.4} {...p}>
    <path d="m5 5 14 14M19 5 5 19" />
  </Base>
);

/* Glyphs used inside product mockups (lucide geometry, as in the app) */
export const GridIcon = (p: IconProps) => (
  <Base size={14} {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
  </Base>
);

export const GearIcon = (p: IconProps) => (
  <Base size={14} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.35.95a7 7 0 0 0-2.42-1.4L13.73 2h-3.46l-.36 2.5a7 7 0 0 0-2.42 1.4l-2.35-.95-2 3.46 2 1.55a7 7 0 0 0 0 2.8l-2 1.55 2 3.46 2.35-.95a7 7 0 0 0 2.42 1.4l.36 2.5h3.46l.36-2.5a7 7 0 0 0 2.42-1.4l2.35.95 2-3.46-2-1.55A7 7 0 0 0 19 12Z" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </Base>
);

export const VideoIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10.5 5-3v9l-5-3" />
  </Base>
);

export const ClapperIcon = (p: IconProps) => (
  <Base size={14} {...p}>
    <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
    <path d="m6.2 5.3 3.1 3.9M12.4 3.4l3.1 4M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </Base>
);

export const MusicIcon = (p: IconProps) => (
  <Base size={14} {...p}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Base>
);

export const PlayIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <path d="m7 4 13 8-13 8Z" />
  </Base>
);

export const PauseIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </Base>
);

export const PauseCircleIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 9v6M14 9v6" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </Base>
);

export const ListOrderIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
  </Base>
);

export const PowerIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0" />
  </Base>
);

export const HardDriveIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <path d="M22 12H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    <path d="M6 16h.01M10 16h.01" />
  </Base>
);

export const ActivityIcon = (p: IconProps) => (
  <Base size={11} {...p}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </Base>
);

export const WifiIcon = (p: IconProps) => (
  <Base size={11} {...p}>
    <path d="M5 12.55a11 11 0 0 1 14 0M8.5 16.1a6 6 0 0 1 7 0M12 20h.01" />
  </Base>
);

export const GaugeIcon = (p: IconProps) => (
  <Base size={11} {...p}>
    <path d="m12 14 4-4M3.34 19a10 10 0 1 1 17.32 0" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base size={11} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const ShieldAlertIcon = (p: IconProps) => (
  <Base size={14} {...p}>
    <path d="M12 3 5 5.8v5.1c0 4.4 2.9 8 7 9.6 4.1-1.6 7-5.2 7-9.6V5.8Z" />
    <path d="M12 8.5v4M12 16h.01" />
  </Base>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Base size={14} {...p}>
    <path d="M12 3 5 5.8v5.1c0 4.4 2.9 8 7 9.6 4.1-1.6 7-5.2 7-9.6V5.8Z" />
    <path d="m9.2 11.9 2 2 3.8-4" />
  </Base>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Base size={14} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </Base>
);

export const BanIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.7 5.7 12.6 12.6" />
  </Base>
);

export const FolderIcon = (p: IconProps) => (
  <Base size={13} {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </Base>
);

export const ArchiveIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <rect x="3" y="4" width="18" height="5" rx="1" />
    <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" />
  </Base>
);

export const LinkIcon = (p: IconProps) => (
  <Base size={13} {...p}>
    <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" />
  </Base>
);

export const CopyIcon = (p: IconProps) => (
  <Base size={13} {...p}>
    <rect x="8" y="8" width="13" height="13" rx="2" />
    <path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2" />
  </Base>
);

export const XIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
);

export const LockIcon = (p: IconProps) => (
  <Base size={11} {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
  </Base>
);
