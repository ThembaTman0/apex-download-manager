import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
// Self-hosted variable fonts: no third-party font requests from visitors.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import App from "./App";
import "./styles/global.css";

// Entrance animations start hidden only once scripting is confirmed, so the
// prerendered HTML stays readable when JavaScript fails or is blocked.
document.documentElement.classList.add("js");

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// `npm run build` prerenders the markup (scripts/prerender.mjs), so hydrate
// it rather than throwing it away and rendering again.
if (root.firstElementChild) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
