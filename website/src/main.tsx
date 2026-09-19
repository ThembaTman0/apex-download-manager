import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted variable fonts: no third-party font requests from visitors.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import App from "./App";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
