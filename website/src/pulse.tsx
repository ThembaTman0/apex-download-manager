import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted variable fonts: no third-party font requests from visitors.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
// The site's tokens, resets and type scale, so this page is unmistakably the
// same site rather than a lookalike that drifts the first time a token moves.
import "./styles/global.css";
import "./styles/pulse.css";
import PulsePage from "./pulse/PulsePage";

// Rendered entirely in the browser, unlike the marketing page. Every number
// here is live, so prerendering would ship a snapshot that is already wrong
// by the time anyone reads it, and this page is noindexed regardless.
createRoot(document.getElementById("pulse-root")!).render(
  <StrictMode>
    <PulsePage />
  </StrictMode>,
);
