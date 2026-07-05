const DEFAULTS = { enabled: true, port: 43666, token: "" };

const $ = (id) => document.getElementById(id);

function load() {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    $("enabled").checked = cfg.enabled;
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

$("save").addEventListener("click", () => {
  const cfg = {
    enabled: $("enabled").checked,
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
