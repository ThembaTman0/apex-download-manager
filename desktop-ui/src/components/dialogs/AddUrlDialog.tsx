import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { FileUp, FolderOpen, Link2, Loader2, Plus, X } from "lucide-react";
import { useDownloadsStore } from "@/stores/downloadsStore";

const MAX_BATCH = 500;

/**
 * Expand one numeric range pattern per URL: `file[1-20].zip` becomes
 * file1.zip … file20.zip. Zero-padding follows the start number ([01-20] →
 * 01, 02, …). URLs without a pattern come back unchanged.
 */
function expandPattern(url: string): string[] {
  const m = url.match(/\[(\d+)-(\d+)\]/);
  if (!m) return [url];
  const [token, startStr, endStr] = [m[0], m[1], m[2]];
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);
  if (end < start || end - start + 1 > MAX_BATCH) return [url];
  const pad = startStr.length > 1 && startStr.startsWith("0") ? startStr.length : 0;
  const out: string[] = [];
  for (let i = start; i <= end; i++) {
    const n = pad ? String(i).padStart(pad, "0") : String(i);
    out.push(url.replace(token, n));
  }
  return out;
}

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
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse the textarea: split, expand [1-20] patterns, drop repeats.
  const urls = [
    ...new Set(
      url
        .split(/\s+/)
        .map((u) => u.trim())
        .filter((u) => /^https?:\/\/\S+$/i.test(u))
        .flatMap(expandPattern)
        .slice(0, MAX_BATCH)
    ),
  ];
  const existingUrls = new Set(downloads.map((d) => d.url));
  const duplicates = urls.filter((u) => existingUrls.has(u));
  const freshUrls = urls.filter((u) => !existingUrls.has(u));

  useEffect(() => {
    if (!open) return;
    setUrl(pendingUrl ?? "");
    setFileName("");
    setSaveDir(settings?.downloadDir ?? "");
    setError(null);
    setBusy(false);
    setSkipDuplicates(true);
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
    const toAdd = skipDuplicates ? freshUrls : urls;
    if (toAdd.length === 0) {
      setError("All of these URLs are already in your list");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const u of toAdd) {
        // A custom file name only makes sense for a single URL.
        await addDownload(
          u,
          saveDir || undefined,
          toAdd.length === 1 && urls.length === 1 ? fileName || undefined : undefined
        );
      }
      setOpen(false);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  const importTxt = async (file: File) => {
    const text = await file.text();
    const found = text
      .split(/\s+/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\/\S+$/i.test(u));
    if (found.length === 0) {
      setError("No http(s) URLs found in that file");
      return;
    }
    setError(null);
    setUrl((prev) => (prev.trim() ? prev.trimEnd() + "\n" : "") + found.join("\n"));
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
                  <span className="text-xs font-medium text-[#8A9199] mb-1.5 flex items-center">
                    <span>
                      URL{urls.length > 1 ? `s (${urls.length})` : ""}{" "}
                      <span className="opacity-50">
                        — paste several, or use file[1-20].zip patterns
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Append URLs from a .txt file (one per line)"
                      className="ml-auto flex items-center gap-1 text-[11px] text-[#8A9199] hover:text-[#E6E1CF] transition-colors"
                    >
                      <FileUp className="w-3 h-3" />
                      Import .txt
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) importTxt(f);
                        e.target.value = "";
                      }}
                    />
                  </span>
                  <div className="relative flex">
                    <Link2 className="absolute left-3 top-3.5 w-3.5 h-3.5 text-[#8A9199]" />
                    <textarea
                      autoFocus
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      rows={urls.length > 1 ? 4 : 1}
                      placeholder="https://example.com/file.zip"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#E6E1CF] placeholder:text-[#8A9199]/50 pl-9 pr-3 py-2.5 outline-none focus:border-[#E6B450]/50 transition-colors resize-none leading-relaxed"
                    />
                  </div>
                  {duplicates.length > 0 && (
                    <div className="mt-1.5">
                      <p className="text-[11px] text-[#FF8F40]">
                        {urls.length === 1
                          ? "This URL is already in your list."
                          : `${duplicates.length} of these URLs ${
                              duplicates.length === 1 ? "is" : "are"
                            } already in your list.`}
                      </p>
                      <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          className="accent-[#E6B450] w-3.5 h-3.5"
                        />
                        <span className="text-[11px] text-[#BFBDB6]">
                          Skip duplicate{duplicates.length !== 1 ? "s" : ""} (uncheck to
                          download again)
                        </span>
                      </label>
                    </div>
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
                    {(() => {
                      if (busy) return "Starting…";
                      const n = skipDuplicates ? freshUrls.length : urls.length;
                      return n > 1 ? `Start ${n} Downloads` : "Start Download";
                    })()}
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
