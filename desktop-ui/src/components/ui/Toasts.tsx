import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Link2, Moon, Power, Snowflake, X } from "lucide-react";
import { backend } from "@/services/backend";
import { useDownloadsStore } from "@/stores/downloadsStore";

/** Toast shown when the clipboard watcher spots a downloadable URL. */
export function ClipboardToast() {
  const clipboardUrl = useDownloadsStore((s) => s.clipboardUrl);
  const setClipboardUrl = useDownloadsStore((s) => s.setClipboardUrl);
  const setPendingUrl = useDownloadsStore((s) => s.setPendingUrl);
  const setAddDialogOpen = useDownloadsStore((s) => s.setAddDialogOpen);

  // Auto-dismiss after 12s so stale offers don't linger.
  useEffect(() => {
    if (!clipboardUrl) return;
    const t = setTimeout(() => setClipboardUrl(null), 12_000);
    return () => clearTimeout(t);
  }, [clipboardUrl, setClipboardUrl]);

  const fileName = clipboardUrl
    ? decodeURIComponent(
        clipboardUrl.split(/[?#]/)[0].split("/").pop() ?? clipboardUrl
      )
    : "";

  return (
    <AnimatePresence>
      {clipboardUrl && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          className="fixed bottom-10 right-4 z-50 w-80 rounded-[10px] bg-raised border border-white/[0.08] shadow-2xl shadow-black/50 p-4"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4 text-on-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">
                Download link copied
              </p>
              <p className="text-xs text-ink-muted truncate" title={clipboardUrl}>
                {fileName}
              </p>
            </div>
            <button
              onClick={() => setClipboardUrl(null)}
              aria-label="Dismiss"
              className="text-ink-muted hover:text-ink transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => {
              setPendingUrl(clipboardUrl);
              setClipboardUrl(null);
              setAddDialogOpen(true);
            }}
            className="w-full py-2 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download it
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Cancellable countdown before the post-queue action (sleep/hibernate/shutdown) runs. */
export function QueueActionToast() {
  const action = useDownloadsStore((s) => s.queueEmptyAction);
  const setAction = useDownloadsStore((s) => s.setQueueEmptyAction);
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!action) return;
    setSecondsLeft(30);
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [action]);

  useEffect(() => {
    if (action && secondsLeft <= 0) {
      backend.executeQueueAction(action).catch(() => {});
      setAction(null);
    }
  }, [action, secondsLeft, setAction]);

  if (!action) return null;
  const Icon =
    action === "sleep" ? Moon : action === "hibernate" ? Snowflake : Power;
  const label =
    action === "sleep" ? "Sleep" : action === "hibernate" ? "Hibernate" : "Shut down";

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 rounded-[10px] bg-raised border border-warning/30 shadow-2xl shadow-black/50 px-5 py-4 flex items-center gap-4"
    >
      <Icon className="w-5 h-5 text-warning" />
      <div>
        <p className="text-sm font-semibold text-ink">
          All downloads finished — {label.toLowerCase()} in {Math.max(0, secondsLeft)}s
        </p>
        <p className="text-xs text-ink-muted">
          Change it in the toolbar or Settings → When queue finishes
        </p>
      </div>
      <button
        onClick={() => {
          backend.executeQueueAction(action).catch(() => {});
          setAction(null);
        }}
        className="px-3 py-1.5 rounded-lg bg-warning/15 text-warning text-xs font-semibold hover:bg-warning/25 transition-colors"
      >
        {label} now
      </button>
      <button
        onClick={() => setAction(null)}
        className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-ink-mid text-xs font-semibold hover:bg-white/[0.1] transition-colors"
      >
        Cancel
      </button>
    </motion.div>
  );
}
