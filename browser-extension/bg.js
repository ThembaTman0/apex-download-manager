// Apex Download Manager — capture service worker.
//
// Strategy: cancel the browser's download IMMEDIATELY, then hand the URL to
// Apex. On Chromium the cancel happens during filename determination
// (onDeterminingFilename), which runs before the Save As dialog — so the
// browser's download UI never appears at all. If Apex turns out to be
// unreachable or rejects the URL, the download is restarted in the browser
// so nothing is ever lost.
// While capture is active we also disable the browser's download bubble via
// downloads.setUiOptions (re-enabled whenever a download is handed back).
//
// Startup: downloads interrupted by a browser/OS shutdown are auto-resumed by
// Chromium at the next launch — typically before Apex is running. Left alone,
// each of those resumes re-enters capture, fails to reach Apex, and gets
// restarted in the browser, popping a Save As dialog with no user action at
// every boot. Two defenses: a startup sweep erases leftover entries for URLs
// Apex already owns, and a restored (old-startTime) download that can't reach
// Apex is dropped with a notification instead of being handed back.

const DEFAULTS = { enabled: true, port: 43666, token: "", hideShelf: true };

// Cached so onCreated can decide without an async storage read on every event.
let config = { ...DEFAULTS };
const configReady = new Promise((resolve) =>
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    config = cfg;
    applyShelf();
    resolve();
  })
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  for (const [key, change] of Object.entries(changes)) config[key] = change.newValue;
  applyShelf();
});

// Hide the browser's download bubble/shelf while capture is on. Global to the
// profile, so it is re-enabled the moment capture is off or unconfigured.
function applyShelf() {
  if (!chrome.downloads.setUiOptions) return; // older browser: leave UI alone
  const hide = config.enabled && config.hideShelf && !!config.token;
  chrome.downloads
    .setUiOptions({ enabled: !hide })
    .catch(() => {});
}

async function apexFetch(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    return await fetch(`http://127.0.0.1:${config.port}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        "x-apex-token": config.token,
        ...(options.headers || {}),
      },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function sendToApex(url, fileName, referrer) {
  const res = await apexFetch("/add", {
    method: "POST",
    body: JSON.stringify({
      url,
      fileName: fileName || null,
      headers: await collectHeaders(url, referrer),
    }),
  });
  if (!res.ok) throw new Error(`apex responded ${res.status}`);
  return res.json();
}

// Browser context Apex needs to fetch URLs behind a login: the site's
// cookies (incl. HttpOnly — that's why the cookies permission exists),
// the page that linked the file, and the browser's user-agent so the
// server sees the same client that held the session.
async function collectHeaders(url, referrer) {
  const headers = { "user-agent": navigator.userAgent };
  if (referrer && /^https?:\/\//i.test(referrer)) headers.referer = referrer;
  try {
    const cookies = await chrome.cookies.getAll({ url });
    if (cookies.length) {
      headers.cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    }
  } catch {
    // cookies permission unavailable: still send referer + UA
  }
  return headers;
}

function basename(path) {
  if (!path) return null;
  const clean = path.replace(/\\/g, "/");
  const last = clean.substring(clean.lastIndexOf("/") + 1);
  return last || null;
}

function cancelAndErase(id) {
  chrome.downloads.cancel(id, () => {
    void chrome.runtime.lastError;
    chrome.downloads.erase({ id }, () => void chrome.runtime.lastError);
  });
}

// --- Captured-download records (persisted) ------------------------------

// URLs successfully handed to Apex, kept in storage.local so they survive
// service-worker restarts. The cancel+erase after a capture is fire-and-
// forget; if the browser exits before it lands, the download entry survives
// as shutdown-interrupted and Chromium auto-resumes it at the next launch.
// These records let the startup sweep recognize and erase such zombies.
const CAPTURED_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function rememberCaptured(url) {
  chrome.storage.local.get({ captured: {} }, ({ captured }) => {
    const now = Date.now();
    for (const [u, t] of Object.entries(captured)) {
      if (now - t > CAPTURED_TTL_MS) delete captured[u];
    }
    captured[url] = now;
    chrome.storage.local.set({ captured });
  });
}

// A hand-back means the browser owns this URL again; drop the record so the
// startup sweep can't kill a browser download the user is relying on.
function forgetCaptured(url) {
  chrome.storage.local.get({ captured: {} }, ({ captured }) => {
    if (!(url in captured)) return;
    delete captured[url];
    chrome.storage.local.set({ captured });
  });
}

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get({ captured: {} }, ({ captured }) => {
    const urls = new Set(Object.keys(captured));
    if (!urls.size) return;
    for (const state of ["in_progress", "interrupted"]) {
      chrome.downloads.search({ state }, (items) => {
        void chrome.runtime.lastError;
        for (const item of items || []) {
          if (urls.has(item.finalUrl || item.url) || urls.has(item.url)) {
            cancelAndErase(item.id);
          }
        }
      });
    }
  });
});

// --- Intercept browser downloads ---------------------------------------

// URLs we handed back to the browser after Apex failed; their onCreated
// event must pass through untouched or we'd loop cancel/restart forever.
const handedBack = new Set();

// Absorb only the double-fire of a single click (some pages emit two
// download events for one click). Anything slower goes straight to Apex,
// which owns dedup: a repeat while the prompt is up refreshes that prompt, an
// actively-downloading duplicate is acknowledged silently, and an
// already-completed one re-prompts with a "download again?" warning. Longer
// windows here made second clicks feel dead — the prompt must be instant.
const RESEND_WINDOW_MS = 1_500;
const recentSends = new Map(); // key -> ms of last attempt

function isDuplicateSend(url, fileName) {
  const key = `${url.split(/[?#]/)[0]}|${(fileName || "").toLowerCase()}`;
  const now = Date.now();
  for (const [k, t] of recentSends) {
    if (now - t > RESEND_WINDOW_MS) recentSends.delete(k);
  }
  const dup = recentSends.has(key);
  recentSends.set(key, now);
  return dup;
}

// A download whose startTime is this far in the past was not started by a
// click just now — it's an entry the browser restored from a previous
// session (shutdown-interrupted downloads auto-resume at launch).
const RESTORED_AGE_MS = 60_000;

async function captureDownload(item) {
  await configReady;
  if (!config.enabled || !config.token) return;

  const url = item.finalUrl || item.url;
  if (!/^https?:\/\//i.test(url)) return; // leave blob:, data:, file: alone
  if (url.startsWith(`http://127.0.0.1:${config.port}`)) return;
  if (handedBack.delete(url)) return;

  const isRestored =
    !!item.startTime && Date.now() - Date.parse(item.startTime) > RESTORED_AGE_MS;

  // Take it away from the browser right away so its UI never settles in.
  cancelAndErase(item.id);

  // A retry of something we sent to Apex moments ago: already canceled
  // above (so the page's loop stays quiet), but don't prompt again.
  if (isDuplicateSend(url, basename(item.filename))) return;

  try {
    await sendToApex(url, basename(item.filename), item.referrer);
    rememberCaptured(url);
  } catch {
    if (isRestored) {
      // A restored leftover and Apex is down (typical right after boot):
      // handing it back would pop a Save As dialog with no user action at
      // every browser launch. Drop it and say so instead.
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/128.png",
        title: "Apex Download Manager",
        message: `Apex isn't running — dismissed an unfinished download from a previous session: ${
          basename(item.filename) || url
        }. Start it again once Apex is open.`,
      });
      return;
    }
    // Apex unavailable — give the download back to the browser, with its UI
    // visible so the user can see it happening.
    forgetCaptured(url);
    handedBack.add(url);
    if (chrome.downloads.setUiOptions) {
      await chrome.downloads.setUiOptions({ enabled: true }).catch(() => {});
      setTimeout(applyShelf, 15000);
    }
    chrome.downloads.download({ url }, () => {
      if (chrome.runtime.lastError) handedBack.delete(url);
    });
  }
}

// Chromium: intercept during filename determination. This event fires BEFORE
// the "Ask where to save each file" dialog, and the browser holds that dialog
// until suggest() is called — so cancelling here means the Save As prompt
// never opens. Cancelling from onCreated is too late for users with that
// setting on: the native dialog is already up, and cancel() doesn't close it.
const seenByDeterminer = new Set();
if (chrome.downloads.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    seenByDeterminer.add(item.id);
    captureDownload(item)
      .catch(() => {})
      .finally(() => {
        // No-op for downloads we cancelled; releases the ones we passed on.
        try {
          suggest();
        } catch {
          // determination already over (download cancelled/erased)
        }
      });
    return true; // suggest() is called asynchronously
  });
}

// Fallback: Firefox has no onDeterminingFilename, and Chromium dispatches it
// to only one extension — if another extension owns it, ours never fires. So
// give the determiner a moment to claim the download, then handle it here.
chrome.downloads.onCreated.addListener((item) => {
  if (!chrome.downloads.onDeterminingFilename) {
    captureDownload(item);
    return;
  }
  setTimeout(() => {
    if (!seenByDeterminer.delete(item.id)) captureDownload(item);
  }, 500);
});

// --- Context menu -------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "apex-link",
    title: "Download with Apex",
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: "apex-media",
    title: "Download media with Apex",
    contexts: ["image", "video", "audio"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  const url = info.menuItemId === "apex-link" ? info.linkUrl : info.srcUrl;
  if (!url) return;
  await configReady;
  try {
    await sendToApex(url, null, info.frameUrl || info.pageUrl);
  } catch {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/128.png",
      title: "Apex Download Manager",
      message:
        "Couldn't reach Apex. Is the app running, and is the token in the extension popup correct?",
    });
  }
});
