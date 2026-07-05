import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, Link2, Loader2, Plus, X } from "lucide-react";
import { useDownloadsStore } from "@/stores/downloadsStore";

export function AddUrlDialog() {
  const open = useDownloadsStore((s) => s.addDialogOpen);
  const setOpen = useDownloadsStore((s) => s.setAddDialogOpen);
  const settings = useDownloadsStore((s) => s.settings);
  const addDownload = useDownloadsStore((s) => s.addDownload);
  const pendingUrl = useDownloadsStore((s) => s.pendingUrl);

  const downloads = useDownloadsStore((s) => s.downloads);

  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [saveDir, setSaveDir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dupOk, setDupOk] = useState(false);

  const urls = url
    .split(/\s+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\/\S+$/i.test(u));
  const isDuplicate =
    urls.length === 1 && downloads.some((d) => d.url === urls[0]);

  useEffect(() => {
    if (!open) return;
    setUrl(pendingUrl ?? "");
    setFileName("");
    setSaveDir(settings?.downloadDir ?? "");
    setError(null);
    setBusy(false);
    setDupOk(false);
    if (pendingUrl) return; // came from the clipboard toast, already filled
    // Convenience: pre-fill from clipboard when it holds a URL.
    import("@tauri-apps/plugin-clipboard-manager")
      .then(({ readText }) => readText())
      .then((text) => {
        if (text && /^https?:\/\/\S+$/i.test(text.trim())) {
          setUrl(text.trim());
        }
      })
      .catch(() => {});
  }, [open, pendingUrl, settings?.downloadDir]);

  const browse = async () => {
    const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
    const dir = await openDialog({
      directory: true,
      defaultPath: saveDir || undefined,
      title: "Choose download folder",
    });
    if (typeof dir === "string") setSaveDir(dir);
  };

  const submit = async () => {
    if (urls.length === 0) {
      setError("Enter one or more valid http(s) URLs");
      return;
    }
    if (isDuplicate && !dupOk) {
      setDupOk(true); // next click confirms
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const u of urls) {
        // A custom file name only makes sense for a single URL.
        await addDownload(
          u,
          saveDir || undefined,
          urls.length === 1 ? fileName || undefined : undefined
        );
      }
      setOpen(false);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
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
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] max-w-[calc(100vw-32px)] rounded-xl bg-[#0F131A] border border-white/[0.08] shadow-2xl shadow-black/40 p-6"
                onKeyDown={(e) => {
                  const inTextarea = e.target instanceof HTMLTextAreaElement;
                  if (e.key === "Enter" && !busy && (!inTextarea || e.ctrlKey)) {
                    submit();
                  }
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title className="text-base font-semibold text-[#E6E1CF] flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#E6B450] flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#0B0E14]" />
                    </span>
                    New Download
                  </Dialog.Title>
                  <Dialog.Close className="text-[#8A9199] hover:text-[#E6E1CF] transition-colors">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>

                <label className="block mb-4">
                  <span className="text-xs font-medium text-[#8A9199] mb-1.5 block">
                    URL{urls.length > 1 ? `s (${urls.length})` : ""}{" "}
                    <span className="opacity-50">— paste several to batch-add</span>
                  </span>
                  <div className="relative flex">
                    <Link2 className="absolute left-3 top-3.5 w-3.5 h-3.5 text-[#8A9199]" />
                    <textarea
                      autoFocus
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        setDupOk(false);
                      }}
                      rows={urls.length > 1 ? 4 : 1}
                      placeholder="https://example.com/file.zip"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] placeholder:text-[#8A9199]/50 pl-9 pr-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors resize-none leading-relaxed"
                    />
                  </div>
                  {isDuplicate && (
                    <p className="text-[11px] text-[#FF8F40] mt-1.5">
                      This URL is already in your list
                      {dupOk ? " — click Start again to add anyway" : ""}.
                    </p>
                  )}
                </label>

                <label className="block mb-4">
                  <span className="text-xs font-medium text-[#8A9199] mb-1.5 block">
                    Save to
                  </span>
                  <div className="flex gap-2">
                    <input
                      value={saveDir}
                      onChange={(e) => setSaveDir(e.target.value)}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] px-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors"
                    />
                    <button
                      onClick={browse}
                      className="px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.1] transition-colors"
                      title="Browse…"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </label>

                <label className="block mb-5">
                  <span className="text-xs font-medium text-[#8A9199] mb-1.5 block">
                    File name{" "}
                    <span className="opacity-50">(optional — auto-detected)</span>
                  </span>
                  <input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Leave empty to detect from URL"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] placeholder:text-[#8A9199]/50 px-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors"
                  />
                </label>

                {error && (
                  <p className="text-xs text-[#F07178] mb-4 break-all">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9199] hover:text-[#E6E1CF] hover:bg-white/[0.06] transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    disabled={busy}
                    onClick={submit}
                    className="px-5 py-2 rounded-lg bg-[#E6B450] hover:bg-[#F0C266] text-[#0B0E14] text-sm font-semibold disabled:opacity-60 flex items-center gap-2 transition-colors"
                  >
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {busy
                      ? "Starting…"
                      : urls.length > 1
                      ? `Start ${urls.length} Downloads`
                      : "Start Download"}
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
