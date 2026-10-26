import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clapperboard, FolderTree, Globe, PartyPopper, Sparkles, X } from "lucide-react";
import { backend } from "@/services/backend";
import { useDownloadsStore } from "@/stores/downloadsStore";
import { getShowWhatsNew, setShowWhatsNew } from "@/lib/whatsNew";
// The notes for the version being built, bundled so "What's new" works
// offline and the app makes no extra network request.
import releaseNotes from "../../../../RELEASE_NOTES.md?raw";

const LAST_SEEN_KEY = "apex.lastSeenVersion";

const STORES = [
  { name: "Chrome", url: "https://chromewebstore.google.com/detail/apex-download-manager/gopdilekdjnfekbmhedjidlmaahnnhco" },
  { name: "Edge", url: "https://microsoftedge.microsoft.com/addons/detail/apex-download-manager/bjpggfmgbhafacbcmhpncjaapdknohjg" },
  { name: "Firefox", url: "https://addons.mozilla.org/en-US/firefox/addon/apex-download-manager/" },
];

type Mode = "welcome" | "whatsnew";

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(version: string) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, version);
  } catch {
    // storage unavailable: the dialog may simply show again next launch
  }
}

async function appVersion(): Promise<string | null> {
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return null; // demo mode (no Tauri)
  }
}

function openExternal(url: string) {
  import("@tauri-apps/plugin-opener")
    .then(({ openUrl }) => openUrl(url))
    .catch(() => window.open(url, "_blank", "noopener"));
}

/** Renders the small Markdown subset RELEASE_NOTES.md uses: a teaser line,
 *  **bold** section titles, "- " bullets and inline **bold**. */
function Notes({ text }: { text: string }) {
  const bold = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="text-ink font-medium">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      )
    );
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul${blocks.length}`} className="list-disc pl-5 space-y-1.5 mb-3">
          {bullets.map((b, i) => (
            <li key={i}>{bold(b)}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      continue;
    }
    flush();
    const title = /^\*\*(.+)\*\*$/.exec(line);
    blocks.push(
      title ? (
        <p key={`h${blocks.length}`} className="text-xs font-semibold uppercase tracking-wide text-ink-mid mt-1 mb-1.5">
          {title[1]}
        </p>
      ) : (
        <p key={`p${blocks.length}`} className="text-sm text-ink mb-3">
          {bold(line)}
        </p>
      )
    );
  }
  flush();
  return <div className="text-xs text-ink-muted leading-relaxed">{blocks}</div>;
}

/**
 * Shown once per version. A fresh install gets a short tour of features that
 * are easy to miss (browser capture, video grabbing, Auto-organize); an
 * update gets that version's release notes. Nothing leaves the device: the
 * last-seen version lives in the webview's local storage.
 */
/** Live "is an extension paired?" line; flips when Apex hears from one. */
function PairingStatus() {
  const [paired, setPaired] = useState(false);

  useEffect(() => {
    backend.extensionPaired().then(setPaired).catch(() => {});
    let unlisten: (() => void) | undefined;
    backend.onExtensionPaired(() => setPaired(true)).then((fn) => (unlisten = fn));
    return () => unlisten?.();
  }, []);

  return paired ? (
    <p className="text-xs text-success flex items-center gap-1.5 mb-3">
      <Check className="w-3.5 h-3.5" />
      Paired with your browser
    </p>
  ) : (
    <p className="text-xs text-ink-muted flex items-center gap-1.5 mb-3">
      <span className="w-1.5 h-1.5 rounded-full bg-ink-muted/60" />
      Not paired yet
    </p>
  );
}

export function WelcomeDialog() {
  const loaded = useDownloadsStore((s) => s.settings !== null);
  const hasDownloads = useDownloadsStore((s) => s.downloads.length > 0);
  const setActiveNav = useDownloadsStore((s) => s.setActiveNav);
  const setVideoDialogOpen = useDownloadsStore((s) => s.setVideoDialogOpen);
  const [mode, setMode] = useState<Mode | null>(null);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    (async () => {
      // ?welcome=first or ?welcome=update previews a mode in `npm run dev`.
      const preview = new URLSearchParams(window.location.search).get("welcome");
      const current = await appVersion();
      if (cancelled) return;
      if (!current) {
        if (preview === "first" || preview === "update") {
          setVersion("dev");
          setMode(preview === "first" ? "welcome" : "whatsnew");
        }
        return;
      }
      setVersion(current);
      const lastSeen = readLastSeen();
      writeLastSeen(current);
      if (lastSeen === current) return;
      // No record yet: someone with downloads is updating from a version
      // before this dialog existed; nobody else has used Apex before.
      // (downloads and settings arrive in the same store update.)
      const next: Mode = lastSeen === null && !hasDownloads ? "welcome" : "whatsnew";
      // Someone who opted out of release notes still gets the one-time tour.
      if (next === "whatsnew" && !getShowWhatsNew()) return;
      setMode(next);
    })();
    return () => {
      cancelled = true;
    };
    // Decide once, when settings first arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const [optOut, setOptOut] = useState(false);
  const open = mode !== null;
  const close = () => {
    if (mode === "whatsnew" && optOut) setShowWhatsNew(false);
    setMode(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
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
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[540px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] overflow-y-auto rounded-xl bg-card border border-white/[0.08] shadow-2xl shadow-black/40 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-base font-semibold text-ink flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                      {mode === "welcome" ? (
                        <PartyPopper className="w-4 h-4 text-accent" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-accent" />
                      )}
                    </span>
                    {mode === "welcome" ? "Welcome to Apex" : `What's new in Apex ${version}`}
                  </Dialog.Title>
                  <Dialog.Close aria-label="Close" className="text-ink-muted hover:text-ink transition-colors">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>

                {mode === "whatsnew" ? (
                  <Notes text={releaseNotes} />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-ink-muted">
                      Three things that are easy to miss:
                    </p>

                    <section className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4">
                      <p className="text-sm text-ink font-medium flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-accent" />
                        Catch downloads from your browser
                      </p>
                      <p className="text-xs text-ink-muted leading-relaxed mb-3">
                        Add the free extension, click "Pair with Apex app" in it, then
                        press Allow here. Downloads you start in the browser come
                        straight to Apex.
                      </p>
                      <PairingStatus />
                      <div className="flex flex-wrap gap-2">
                        {STORES.map((s) => (
                          <button
                            key={s.name}
                            onClick={() => openExternal(s.url)}
                            className="px-3 py-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-ink hover:bg-white/[0.1] transition-colors"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4">
                      <p className="text-sm text-ink font-medium flex items-center gap-2 mb-1">
                        <Clapperboard className="w-4 h-4 text-accent" />
                        Grab videos
                      </p>
                      <p className="text-xs text-ink-muted leading-relaxed mb-3">
                        Paste a video page link and pick the quality. Apex sets up the
                        tool it needs the first time.
                      </p>
                      <button
                        onClick={() => {
                          close();
                          setVideoDialogOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-ink hover:bg-white/[0.1] transition-colors"
                      >
                        Open Grab Video
                      </button>
                    </section>

                    <section className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4">
                      <p className="text-sm text-ink font-medium flex items-center gap-2 mb-1">
                        <FolderTree className="w-4 h-4 text-accent" />
                        Keep downloads tidy
                      </p>
                      <p className="text-xs text-ink-muted leading-relaxed mb-3">
                        Auto-organize sorts files into Video, Music, Programs and more,
                        each in a folder you choose.
                      </p>
                      <button
                        onClick={() => {
                          close();
                          setActiveNav("settings");
                        }}
                        className="px-3 py-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-ink hover:bg-white/[0.1] transition-colors"
                      >
                        Open Settings
                      </button>
                    </section>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 mt-5">
                  {mode === "whatsnew" ? (
                    <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={optOut}
                        onChange={(e) => setOptOut(e.target.checked)}
                        className="accent-accent w-3.5 h-3.5"
                      />
                      Don't show this after future updates
                    </label>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={close}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold transition-colors"
                  >
                    {mode === "welcome" ? "Get started" : "Got it"}
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
