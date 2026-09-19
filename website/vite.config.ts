import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, pathToFileURL } from "node:url";
import { statSync } from "node:fs";
import type { ServerResponse } from "node:http";

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

// Run the read-only api/*.js handlers inside the dev server, so version,
// size and changelog data are live under `npm run dev` as well. Without KV
// env vars /api/stats reports a total of 0, which the page hides.
function devApi(): Plugin {
  const handlers = ["stats", "changelog"];
  return {
    name: "dev-api",
    configureServer(server) {
      for (const name of handlers) {
        server.middlewares.use(`/api/${name}`, async (req, res) => {
          const file = fileURLToPath(new URL(`./api/${name}.js`, import.meta.url));
          // Re-import when the handler changes on disk (ESM imports are cached).
          const mod = await import(`${pathToFileURL(file).href}?v=${statSync(file).mtimeMs}`);
          const out = res as ServerResponse & { json: (body: unknown) => void };
          out.json = (body) => {
            out.setHeader("Content-Type", "application/json");
            out.end(JSON.stringify(body));
          };
          await mod.default(req, out);
        });
      }
    },
  };
}

// Preload the two Latin font files the first screen needs, so text swaps
// from the metric-matched fallback within the first frames.
function preloadFonts(): Plugin {
  return {
    name: "preload-fonts",
    apply: "build",
    transformIndexHtml(html, ctx) {
      const files = Object.keys(ctx.bundle ?? {}).filter((f) =>
        /(inter|jetbrains-mono)-latin-wght-normal-[\w-]+\.woff2$/.test(f),
      );
      return {
        html,
        tags: files.map((f) => ({
          tag: "link",
          attrs: { rel: "preload", href: `/${f}`, as: "font", type: "font/woff2", crossorigin: "" },
          injectTo: "head",
        })),
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), devDlRedirect(), devApi(), preloadFonts()],
  build: {
    outDir: "dist",
    // Single-page marketing site: inline small assets, keep one JS chunk.
    assetsInlineLimit: 8192,
  },
});
