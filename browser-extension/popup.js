const DEFAULTS = { enabled: true, port: 43666, token: "", hideShelf: true };

const $ = (id) => document.getElementById(id);

function load() {
  chrome.storage.local.get(DEFAULTS, (cfg) => {
    $("enabled").checked = cfg.enabled;
    $("hideShelf").checked = cfg.hideShelf;
    $("token").value = cfg.token;
    $("port").value = cfg.port;
    ping(cfg.port, cfg.token);
  });
}

// The token rides along so Apex can vouch for it (apps ≥ 1.0.8 answer with
// tokenValid). "Connected" alone used to lie when the token was stale -
// captures were silently rejected while the dot stayed green.
async function ping(port, token) {
  const dot = $("dot");
  const text = $("statusText");
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`http://127.0.0.1:${port}/ping`, {
      signal: ctrl.signal,
      headers: token ? { "x-apex-token": token } : {},
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.tokenValid === false) {
        dot.className = "dot bad";
        text.textContent = "Apex is running, but the token is stale. Pair again";
        return;
      }
      dot.className = "dot ok";
      text.textContent = token ? "Connected to Apex" : "Apex found. Pair to start capturing";
      return;
    }
    throw new Error();
  } catch {
    dot.className = "dot bad";
    text.textContent = "Apex app not reachable";
  }
}

// #grab-begin
// Hand the current tab's URL to Apex's video grabber (yt-dlp). The app opens
// its Grab Video dialog pre-filled - nothing downloads until the user picks a
// quality there, so this is just a hand-off, not a capture.
$("grabVideo").addEventListener("click", async () => {
  const status = $("grabStatus");
  const cfg = await new Promise((r) => chrome.storage.local.get(DEFAULTS, r));
  if (!cfg.token) {
    status.textContent = "Pair with Apex first";
    return;
  }
  const [tab] = await new Promise((r) =>
    chrome.tabs.query({ active: true, currentWindow: true }, r)
  );
  const url = tab && tab.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    status.textContent = "This page can't be grabbed";
    return;
  }
  status.textContent = "Sending…";
  // Site cookies ride along (to 127.0.0.1 only, kept in Apex's memory) so
  // the app can offer a sign-in retry when the video is gated.
  let cookies = [];
  try {
    cookies = (await chrome.cookies.getAll({ url })).map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || "",
      path: c.path || "/",
      secure: !!c.secure,
      expires: c.expirationDate ? Math.floor(c.expirationDate) : 0,
    }));
  } catch {
    // cookies unavailable: the grab still works without the retry option
  }
  // A stream the background worker saw this tab's player fetch (see
  // onStreamRequest in bg.js); the earliest is the master playlist.
  let stream = null;
  try {
    const { tabStreams } = await chrome.storage.session.get("tabStreams");
    const first = tabStreams && tabStreams[tab.id] && tabStreams[tab.id][0];
    if (first) {
      stream = { url: first.url, referer: first.referer || url, userAgent: navigator.userAgent };
    }
  } catch {
    // no session storage: grab the page URL as before
  }
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`http://127.0.0.1:${cfg.port}/grab`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-apex-token": cfg.token },
      body: JSON.stringify({ url, cookies, stream }),
      signal: ctrl.signal,
    });
    if (res.status === 404) {
      status.textContent = "Needs Apex 1.0.8 or newer. Update the app";
      return;
    }
    if (res.status === 401) {
      status.textContent = "Token is stale. Pair again";
      return;
    }
    if (!res.ok) throw new Error();
    status.textContent = "Opened in Apex ✓";
    setTimeout(() => window.close(), 600);
  } catch {
    status.textContent = "Couldn't reach Apex. Is it running?";
  }
});
// #grab-end

// One-click pairing: the background worker asks Apex for the token and the
// user approves in a native Apex dialog. Clicking that dialog closes this
// popup, so the request can't live here; the worker records its progress in
// storage.session and this just shows it, now or when the popup reopens.
function showPairing(p) {
  const status = $("pairStatus");
  $("pair").disabled = !!p && p.state === "waiting";
  if (!p) {
    status.textContent = "";
  } else if (p.state === "waiting") {
    status.textContent = "Approve the prompt in the Apex window…";
  } else if (p.state === "paired") {
    status.textContent = "Paired ✓";
    chrome.storage.local.get(DEFAULTS, (cfg) => {
      $("token").value = cfg.token;
      ping(cfg.port, cfg.token);
    });
    // Shown once; the next popup opens clean.
    setTimeout(() => chrome.storage.session.remove("pairing"), 2500);
  } else if (p.state === "denied") {
    status.textContent = "Denied in Apex";
  } else {
    status.textContent = p.error || "Pairing failed. Is Apex running?";
  }
}

chrome.storage.session.get("pairing", ({ pairing }) => showPairing(pairing));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && "pairing" in changes) showPairing(changes.pairing.newValue);
});

$("pair").addEventListener("click", () => {
  const port = parseInt($("port").value, 10) || DEFAULTS.port;
  showPairing({ state: "waiting" });
  chrome.runtime.sendMessage({ type: "pair", port }).catch(() => {});
});

$("save").addEventListener("click", () => {
  const cfg = {
    enabled: $("enabled").checked,
    hideShelf: $("hideShelf").checked,
    token: $("token").value.trim(),
    port: parseInt($("port").value, 10) || DEFAULTS.port,
  };
  chrome.storage.local.set(cfg, () => {
    $("saved").textContent = "Saved ✓";
    setTimeout(() => ($("saved").textContent = ""), 1500);
    ping(cfg.port, cfg.token);
  });
});

load();
