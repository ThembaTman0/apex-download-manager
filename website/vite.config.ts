import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// In production /dl is a Vercel serverless function (api/dl.js, rewritten
// via vercel.json) that counts the download and 302s to the newest installer
// on GitHub Releases. The dev server has no functions runtime, so mirror the
// fallback behavior.
function devDlRedirect(): Plugin {
  return {
    name: "dev-dl-redirect",
    configureServer(server) {
      server.middlewares.use("/dl", (_req, res) => {
        res.statusCode = 302;
        res.setHeader(
          "Location",
          "https://github.com/ThembaTman0/apex-download-manager-releases/releases/latest",
        );
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devDlRedirect()],
  build: {
    outDir: "dist",
    // Single-page marketing site: inline small assets, keep one JS chunk.
    assetsInlineLimit: 8192,
  },
});
