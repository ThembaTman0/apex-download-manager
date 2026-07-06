// Apex Download Manager — capture service worker.
//
// Strategy: cancel the browser's download IMMEDIATELY, then hand the URL to
// Apex. Canceling first keeps the browser's download UI (bubble / Save As
// dialog) from lingering. If Apex turns out to be unreachable or rejects the
// URL, the download is restarted in the browser so nothing is ever lost.
// While capture is active we also disable the browser's download bubble via
// downloads.setUiOptions (re-enabled whenever a download is handed back).

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

// --- Intercept browser downloads ---------------------------------------

// URLs we handed back to the browser after Apex failed; their onCreated
// event must pass through untouched or we'd loop cancel/restart forever.
const handedBack = new Set();

chrome.downloads.onCreated.addListener(async (item) => {
  await configReady;
  if (!config.enabled || !config.token) return;

  const url = item.finalUrl || item.url;
  if (!/^https?:\/\//i.test(url)) return; // leave blob:, data:, file: alone
  if (url.startsWith(`http://127.0.0.1:${config.port}`)) return;
  if (handedBack.delete(url)) return;

  // Take it away from the browser right away so its UI never settles in.
  chrome.downloads.cancel(item.id, () => {
    void chrome.runtime.lastError;
    chrome.downloads.erase({ id: item.id }, () => void chrome.runtime.lastError);
  });

  try {
    await sendToApex(url, basename(item.filename), item.referrer);
  } catch {
    // Apex unavailable — give the download back to the browser, with its UI
    // visible so the user can see it happening.
    handedBack.add(url);
    if (chrome.downloads.setUiOptions) {
      await chrome.downloads.setUiOptions({ enabled: true }).catch(() => {});
      setTimeout(applyShelf, 15000);
    }
    chrome.downloads.download({ url }, () => {
      if (chrome.runtime.lastError) handedBack.delete(url);
    });
  }
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
