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

/** The Windows mark: the four plain panes, unaltered, in the text colour. */
export const WindowsIcon = ({ size = 16, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
    <path d="M3 3h8.5v8.5H3zM12.5 3H21v8.5h-8.5zM3 12.5h8.5V21H3zM12.5 12.5H21V21h-8.5z" />
  </svg>
);

/** Tux, from Simple Icons (CC0), in the text colour. */
export const LinuxIcon = ({ size = 16, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 01-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z" />
  </svg>
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
