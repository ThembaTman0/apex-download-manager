import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Copy, Loader2, ShieldCheck, X, XCircle } from "lucide-react";
import { backend } from "@/services/backend";
import { useDownloadsStore } from "@/stores/downloadsStore";

export function ChecksumDialog() {
  const target = useDownloadsStore((s) => s.checksumTarget);
  const setTarget = useDownloadsStore((s) => s.setChecksumTarget);

  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expected, setExpected] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!target) return;
    setHash(null);
    setError(null);
    setExpected("");
    setCopied(false);
    backend
      .computeChecksum(target.id)
      .then(setHash)
      .catch((e) => setError(String(e)));
  }, [target]);

  const normalized = expected.trim().toLowerCase().replace(/[^a-f0-9]/g, "");
  const match = hash && normalized.length > 0 ? normalized === hash : null;

  const copy = async () => {
    if (!hash) return;
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const open = target !== null;

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
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-w-[calc(100vw-32px)] rounded-xl bg-card border border-white/[0.08] shadow-2xl shadow-black/40 p-6"
              >
                <div className="flex items-center justify-between mb-1">
                  <Dialog.Title className="text-base font-semibold text-ink flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-success" />
                    </span>
                    Verify Checksum
                  </Dialog.Title>
                  <Dialog.Close aria-label="Close" className="text-ink-muted hover:text-ink transition-colors">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>
                <p className="text-xs text-ink-muted mb-5 truncate">{target?.name}</p>

                <div className="mb-4">
                  <span className="text-xs font-medium text-ink-muted mb-1.5 block">
                    SHA-256 of downloaded file
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[11px] text-ink font-mono px-3 py-2.5 break-all select-text">
                      {error ? (
                        <span className="text-error-soft">{error}</span>
                      ) : hash ? (
                        hash
                      ) : (
                        <span className="flex items-center gap-2 text-ink-muted">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Computing…
                        </span>
                      )}
                    </code>
                    <button
                      onClick={copy}
                      disabled={!hash}
                      className="px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-ink-muted hover:text-ink hover:bg-white/[0.1] transition-colors disabled:opacity-40"
                      title="Copy hash"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <span className="text-xs font-medium text-ink-muted mb-1.5 block">
                    Expected hash{" "}
                    <span className="opacity-50">(paste from the download page)</span>
                  </span>
                  <input
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    placeholder="e.g. 3f5a09c1…"
                    spellCheck={false}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-ink font-mono placeholder:text-ink-faint px-3 py-2.5 outline-none focus:border-accent/50 transition-colors"
                  />
                </div>

                {match !== null && (
                  <div
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                      match
                        ? "bg-success/10 text-success"
                        : "bg-error/10 text-error-soft"
                    }`}
                  >
                    {match ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Checksums match: file is authentic
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Mismatch: the file differs from what the site published
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
