// Apex Download Manager — capture service worker.
// Ordering matters: we hand the URL to Apex FIRST and only cancel the
// browser's download once Apex accepts. If Apex is closed or rejects,
// the browser download continues untouched.

const DEFAULTS = { enabled: true, port: 43666, token: "" };

function getConfig() {
  return new Promise((resolve) => chrome.storage.sync.get(DEFAULTS, resolve));
}

async function apexFetch(path, options = {}) {
  const cfg = await getConfig();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    return await fetch(`http://127.0.0.1:${cfg.port}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        "x-apex-token": cfg.token,
        ...(options.headers || {}),
      },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function sendToApex(url, fileName) {
  const res = await apexFetch("/add", {
    method: "POST",
    body: JSON.stringify({ url, fileName: fileName || null }),
  });
  if (!res.ok) throw new Error(`apex responded ${res.status}`);
  return res.json();
}

function basename(path) {
  if (!path) return null;
  const clean = path.replace(/\\/g, "/");
  const last = clean.substring(clean.lastIndexOf("/") + 1);
  return last || null;
}

// --- Intercept browser downloads ---------------------------------------

chrome.downloads.onCreated.addListener(async (item) => {
  try {
    const cfg = await getConfig();
    if (!cfg.enabled || !cfg.token) return;

    const url = item.finalUrl || item.url;
    if (!/^https?:\/\//i.test(url)) return; // leave blob:, data:, file: alone
    if (url.startsWith(`http://127.0.0.1:${cfg.port}`)) return;

    // Ask Apex to take it. Throws when Apex is closed/unreachable.
    await sendToApex(url, basename(item.filename));

    // Apex accepted — stop the browser's copy.
    chrome.downloads.cancel(item.id, () => {
      void chrome.runtime.lastError;
      chrome.downloads.erase({ id: item.id }, () => void chrome.runtime.lastError);
    });
  } catch {
    // Apex unavailable: let the browser download normally.
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
  try {
    await sendToApex(url, null);
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
