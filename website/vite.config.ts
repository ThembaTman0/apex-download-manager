import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // Single-page marketing site: inline small assets, keep one JS chunk.
    assetsInlineLimit: 8192,
  },
});
