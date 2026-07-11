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
      {...rest}
    >
      {children}
    </svg>
  );
}

export function LogoMark({ size = 22, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...rest}
    >
      <path d="M12 2.8 20.4 21h-4.1l-4.3-9.5L7.7 21H3.6Z" />
    </svg>
  );
}

export const SegmentsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4v13m0 0-3.2-3.2M7 17l3.2-3.2M17 4v13m0 0-3.2-3.2M17 17l3.2-3.2" />
  </Base>
);

export const PauseResumeIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M10.2 9.2v5.6M13.8 9.2v5.6" />
  </Base>
);

export const CaptureIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="12.5" rx="2.4" />
    <path d="M12 7.4v5.4m0 0-2.4-2.4m2.4 2.4 2.4-2.4M8.6 20.2h6.8" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.6V12l3 1.9" />
  </Base>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 5 5.8v5.1c0 4.4 2.9 8 7 9.6 4.1-1.6 7-5.2 7-9.6V5.8Z" />
    <path d="m9.2 11.9 2 2 3.8-4" />
  </Base>
);

export const CommandIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M17.5 4.5a2 2 0 0 0-2 2v11a2 2 0 1 0 2-2h-11a2 2 0 1 0 2 2v-11a2 2 0 1 0-2 2h11a2 2 0 1 0 2-2" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base size={15} strokeWidth={2} {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
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

export const GitHubIcon = ({ size = 16, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...rest}
  >
    <path d="M12 1.7a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.96c-2.92.63-3.54-1.24-3.54-1.24-.48-1.21-1.17-1.54-1.17-1.54-.95-.65.07-.63.07-.63 1.05.07 1.61 1.08 1.61 1.08.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.66-1.4-2.33-.27-4.79-1.17-4.79-5.2 0-1.14.41-2.08 1.08-2.81-.1-.27-.47-1.34.1-2.78 0 0 .89-.28 2.9 1.07a10.1 10.1 0 0 1 5.28 0c2-1.35 2.89-1.07 2.89-1.07.58 1.44.21 2.51.11 2.78.67.73 1.08 1.67 1.08 2.81 0 4.04-2.47 4.93-4.82 5.19.38.33.72.97.72 1.96v2.91c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.7Z" />
  </svg>
);

/* Window chrome glyphs for the app mockup */
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

/* Mockup sidebar glyphs */
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

export const PlusIcon = (p: IconProps) => (
  <Base size={12} strokeWidth={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const VideoIcon = (p: IconProps) => (
  <Base size={12} {...p}>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10.5 5-3v9l-5-3" />
  </Base>
);
