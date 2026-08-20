const DEFAULTS = { enabled: true, port: 43666, token: "", hideShelf: true };

const $ = (id) => document.getElementById(id);

function load() {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
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
  const cfg = await new Promise((r) => chrome.storage.sync.get(DEFAULTS, r));
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
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`http://127.0.0.1:${cfg.port}/grab`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-apex-token": cfg.token },
      body: JSON.stringify({ url, cookies }),
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

// One-click pairing: ask Apex for the token; the user approves in a native
// Apex dialog. Long timeout - the request blocks until they click Allow.
$("pair").addEventListener("click", async () => {
  const status = $("pairStatus");
  const port = parseInt($("port").value, 10) || DEFAULTS.port;
  status.textContent = "Approve the prompt in the Apex window…";
  $("pair").disabled = true;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120_000);
    const res = await fetch(`http://127.0.0.1:${port}/pair`, {
      method: "POST",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok && data.token) {
      $("token").value = data.token;
      chrome.storage.sync.set({ token: data.token, port }, () => {
        status.textContent = "Paired ✓";
        setTimeout(() => (status.textContent = ""), 2500);
        ping(port, data.token);
      });
    } else if (data.error === "denied") {
      status.textContent = "Denied in Apex";
    } else {
      status.textContent = data.error || "Pairing failed. Is Apex running?";
    }
  } catch {
    status.textContent = "Pairing failed. Is Apex running?";
  } finally {
    $("pair").disabled = false;
  }
});

$("save").addEventListener("click", () => {
  const cfg = {
    enabled: $("enabled").checked,
    hideShelf: $("hideShelf").checked,
    token: $("token").value.trim(),
    port: parseInt($("port").value, 10) || DEFAULTS.port,
  };
  chrome.storage.sync.set(cfg, () => {
    $("saved").textContent = "Saved ✓";
    setTimeout(() => ($("saved").textContent = ""), 1500);
    ping(cfg.port, cfg.token);
  });
});

load();
