import { renderToString } from "react-dom/server";
import App from "./App";

/**
 * Build-time prerender entry (scripts/prerender.mjs). The page is static
 * apart from three live values (version, installer size, changelog), which
 * the client fills in after hydration, so rendering it once at build time
 * gives crawlers and slow connections real HTML instead of an empty shell.
 */
export function render(): string {
  return renderToString(<App />);
}
