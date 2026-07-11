import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { useDownloadsStore } from "@/stores/downloadsStore";

export function DeleteDialog() {
  const open = useDownloadsStore((s) => s.deleteDialogOpen);
  const setOpen = useDownloadsStore((s) => s.setDeleteDialogOpen);
  const selectedIds = useDownloadsStore((s) => s.selectedIds);
  const removeDownloads = useDownloadsStore((s) => s.removeDownloads);

  const [deleteFile, setDeleteFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const count = selectedIds.size;

  useEffect(() => {
    if (open) {
      setDeleteFile(false);
      setBusy(false);
    }
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    await removeDownloads([...selectedIds], deleteFile);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] max-w-[calc(100vw-32px)] rounded-xl bg-card border border-white/[0.08] shadow-2xl shadow-black/40 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-base font-semibold text-ink flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-error/15 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-error-soft" />
                    </span>
                    Delete {count} download{count !== 1 ? "s" : ""}?
                  </Dialog.Title>
                  <Dialog.Close aria-label="Close" className="text-ink-muted hover:text-ink transition-colors">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>

                <p className="text-sm text-ink-muted mb-4">
                  This removes the selected item{count !== 1 ? "s" : ""} from the
                  list. Active downloads will be stopped.
                </p>

                <label className="flex items-center gap-2 mb-6 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deleteFile}
                    onChange={(e) => setDeleteFile(e.target.checked)}
                    className="accent-error"
                  />
                  <span className="text-sm text-ink-muted">
                    Also delete file{count !== 1 ? "s" : ""} from disk
                  </span>
                </label>

                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    disabled={busy || count === 0}
                    onClick={confirm}
                    className="px-5 py-2 rounded-lg bg-error hover:bg-error-hover text-ink text-sm font-semibold disabled:opacity-60 transition-colors"
                  >
                    {busy ? "Deleting…" : "Delete"}
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
