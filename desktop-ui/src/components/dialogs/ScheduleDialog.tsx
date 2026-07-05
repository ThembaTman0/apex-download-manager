import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, X } from "lucide-react";
import { useDownloadsStore } from "@/stores/downloadsStore";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function ScheduleDialog() {
  const target = useDownloadsStore((s) => s.scheduleTarget);
  const setTarget = useDownloadsStore((s) => s.setScheduleTarget);
  const scheduleDownload = useDownloadsStore((s) => s.scheduleDownload);

  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const base = target.startAt
      ? new Date(target.startAt)
      : new Date(Date.now() + 60 * 60 * 1000);
    setWhen(toLocalInputValue(base));
    setError(null);
  }, [target]);

  const open = target !== null;

  const save = async () => {
    const ts = new Date(when).getTime();
    if (Number.isNaN(ts)) {
      setError("Pick a valid date and time");
      return;
    }
    if (ts <= Date.now()) {
      setError("Pick a time in the future");
      return;
    }
    await scheduleDownload(target!.id, ts);
    setTarget(null);
  };

  const startNow = async () => {
    await scheduleDownload(target!.id, null);
    setTarget(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && setTarget(null)}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.18 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] max-w-[calc(100vw-32px)] rounded-xl bg-[#151B26] border border-white/[0.08] shadow-2xl shadow-black/40 p-6"
              >
                <div className="flex items-center justify-between mb-1">
                  <Dialog.Title className="text-base font-semibold text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center">
                      <CalendarClock className="w-4 h-4 text-[#94A3B8]" />
                    </span>
                    Schedule Download
                  </Dialog.Title>
                  <Dialog.Close className="text-[#94A3B8] hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>
                <p className="text-xs text-[#94A3B8] mb-5 truncate">{target?.name}</p>

                <label className="block mb-4">
                  <span className="text-xs font-medium text-[#94A3B8] mb-1.5 block">
                    Start at
                  </span>
                  <input
                    type="datetime-local"
                    value={when}
                    min={toLocalInputValue(new Date())}
                    onChange={(e) => setWhen(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white px-3 py-2.5 outline-none focus:border-white/25 transition-colors [color-scheme:dark]"
                  />
                </label>

                {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

                <div className="flex justify-between gap-2">
                  <button
                    onClick={startNow}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    Start now instead
                  </button>
                  <button
                    onClick={save}
                    className="px-5 py-2 rounded-lg bg-[#E2E8F0] hover:bg-white text-[#0B0F17] text-sm font-semibold transition-colors"
                  >
                    Schedule
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
