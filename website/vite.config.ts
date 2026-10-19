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
// size and changelog data are live under `npm run dev` as well.
function devApi(): Plugin {
  const handlers = ["stats", "changelog", "pulse"];
  // The counter lives in KV, which a local checkout has no credentials for,
  // so /api/stats would report zeros and /pulse would render an empty chart.
  // Read the published numbers instead. Only the counter needs this: the
  // other two handlers talk to the public GitHub API and work as they are.
  const hasKv = Boolean(
    (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
      (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
  );
  return {
    name: "dev-api",
    configureServer(server) {
      for (const name of handlers) {
        server.middlewares.use(`/api/${name}`, async (req, res) => {
          if (name === "stats" && !hasKv) {
            const query = req.url && req.url !== "/" ? req.url : "";
            const live = await fetch(
              `https://apexdownloadmanager.com/api/stats${query}`,
            );
            res.setHeader("Content-Type", "application/json");
            res.end(await live.text());
            return;
          }
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

// /pulse is a second HTML entry, which Vercel serves through a rewrite. The
// dev server has no such rewrite, so map the clean path onto the file here.
function devPulsePath(): Plugin {
  return {
    name: "dev-pulse-path",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === "/pulse" || req.url?.startsWith("/pulse?")) {
          req.url = `/pulse.html${req.url.slice("/pulse".length)}`;
        }
        next();
      });
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
  plugins: [react(), devDlRedirect(), devApi(), devPulsePath(), preloadFonts()],
  build: {
    outDir: "dist",
    // Single-page marketing site: inline small assets, keep one JS chunk.
    assetsInlineLimit: 8192,
    rollupOptions: {
      // Two entries. The hidden /pulse page gets its own bundle so none of
      // its chart or fetching code is shipped to the marketing page.
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        pulse: fileURLToPath(new URL("./pulse.html", import.meta.url)),
      },
    },
  },
});
