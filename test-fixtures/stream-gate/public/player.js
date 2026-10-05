// Builds the player at runtime, so the stream URL never appears in page HTML.
(async () => {
  const app = document.getElementById("app");
  const r = await fetch("/api/source", { headers: { "x-requested-with": "player" } });
  const src = atob((await r.json()).s);
  app.innerHTML = "<h2>Test episode 1</h2><video controls></video>";
  const video = app.querySelector("video");
  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(src); // played through MSE: video.src becomes blob:
    hls.attachMedia(video);
  } else {
    video.src = src; // Safari / native HLS
  }
})();
