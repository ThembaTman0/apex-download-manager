import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  /** md (16px) beside body text, sm (14px) beside small print and in tables. */
  size?: "sm" | "md";
  /** error for destructive choices, like deleting files from disk. */
  tone?: "accent" | "error";
};

/**
 * A checkbox drawn by the app instead of the web engine. WebView2 and
 * WebKitGTK paint native checkboxes differently (WebKitGTK half ignores
 * accent-color and draws a chunky tick), so Linux looked off. The real
 * input stays on top, invisible, so clicks, labels, keyboard focus and
 * screen readers behave exactly as before.
 */
export function Checkbox({ size = "md", tone = "accent", className, ...props }: CheckboxProps) {
  const box = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className={cn("relative inline-flex shrink-0", box, className)}>
      <input
        type="checkbox"
        {...props}
        className="peer absolute inset-0 m-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none flex items-center justify-center rounded-[4px] border transition-colors",
          "border-white/25 bg-white/[0.04] peer-hover:border-white/40",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50",
          "peer-disabled:opacity-40",
          tone === "accent"
            ? "peer-checked:bg-accent peer-checked:border-accent text-on-accent"
            : "peer-checked:bg-error peer-checked:border-error text-white",
          "[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100",
          box,
        )}
      >
        <Check className="w-[80%] h-[80%]" strokeWidth={3.5} />
      </span>
    </span>
  );
}
