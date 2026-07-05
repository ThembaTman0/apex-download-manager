import { Minus, Square, X as CloseIcon } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@/lib/utils";

/** Slim frameless title strip: drag region + window controls, nothing else. */
export function TopBar() {
  return (
    <header
      data-tauri-drag-region
      className="flex items-center h-9 bg-[#0D1017] border-b border-white/[0.06] shrink-0"
    >
      <div data-tauri-drag-region className="flex-1 h-full" />
      <div className="flex items-stretch self-stretch">
        <WinButton onClick={() => getCurrentWindow().minimize()} label="Minimize">
          <Minus className="w-3.5 h-3.5" />
        </WinButton>
        <WinButton
          onClick={() => getCurrentWindow().toggleMaximize()}
          label="Maximize"
        >
          <Square className="w-3 h-3" />
        </WinButton>
        <WinButton onClick={() => getCurrentWindow().close()} label="Close" danger>
          <CloseIcon className="w-3.5 h-3.5" />
        </WinButton>
      </div>
    </header>
  );
}

function WinButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "w-11 flex items-center justify-center text-[#8A9199] transition-colors",
        danger
          ? "hover:bg-[#C24747] hover:text-[#E6E1CF]"
          : "hover:bg-white/[0.06] hover:text-[#E6E1CF]"
      )}
    >
      {children}
    </button>
  );
}
