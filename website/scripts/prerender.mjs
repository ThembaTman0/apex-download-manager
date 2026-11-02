// Injects the server-rendered markup into dist/index.html after `vite build`.
// Run by `npm run build`; see src/entry-server.tsx for why.
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const htmlPath = fileURLToPath(new URL("dist/index.html", root));
const ssrDir = fileURLToPath(new URL("dist-ssr/", root));

const { render } = await import(new URL("dist-ssr/entry-server.js", root).href);
const markup = render();

// The JSON-LD is static markup, so React cannot keep it current the way it
// keeps the visible page current. Rewrite it from the same snapshot the
// fallbacks use, or search results keep quoting a version that shipped weeks
// ago.
const snapshot = JSON.parse(
  readFileSync(fileURLToPath(new URL("src/lib/release-snapshot.json", root)), "utf8"),
);

const html = readFileSync(htmlPath, "utf8")
  .replace(
    /"softwareVersion": "[^"]*"/,
    `"softwareVersion": "${snapshot.version}"`,
  )
  .replace(/"fileSize": "[^"]*"/, `"fileSize": "${snapshot.sizeMb} MB"`);
const marker = '<div id="root"></div>';
if (!html.includes(marker)) {
  throw new Error("prerender: root marker not found in dist/index.html");
}
writeFileSync(htmlPath, html.replace(marker, `<div id="root">${markup}</div>`));

// The SSR bundle is a build artifact, not something to deploy.
rmSync(ssrDir, { recursive: true, force: true });

const kb = (markup.length / 1024).toFixed(1);
console.log(
  `prerendered ${kb} kB of markup into dist/index.html, release ${snapshot.version}`,
);
