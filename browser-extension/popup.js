const DEFAULTS = { enabled: true, port: 43666, token: "", hideShelf: true };

const $ = (id) => document.getElementById(id);

function load() {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    $("enabled").checked = cfg.enabled;
    $("hideShelf").checked = cfg.hideShelf;
    $("token").value = cfg.token;
    $("port").value = cfg.port;
    ping(cfg.port);
  });
}

async function ping(port) {
  const dot = $("dot");
  const text = $("statusText");
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`http://127.0.0.1:${port}/ping`, { signal: ctrl.signal });
    if (res.ok) {
      dot.className = "dot ok";
      text.textContent = "Connected to Apex";
      return;
    }
    throw new Error();
  } catch {
    dot.className = "dot bad";
    text.textContent = "Apex app not reachable";
  }
}

// One-click pairing: ask Apex for the token; the user approves in a native
// Apex dialog. Long timeout — the request blocks until they click Allow.
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
        ping(port);
      });
    } else if (data.error === "denied") {
      status.textContent = "Denied in Apex";
    } else {
      status.textContent = data.error || "Pairing failed — is Apex running?";
    }
  } catch {
    status.textContent = "Pairing failed — is Apex running?";
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
    ping(cfg.port);
  });
});

load();
