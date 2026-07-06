import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { CapturePopup } from "./components/dialogs/CapturePopup";
import "./index.css";

// The same bundle serves two windows: the full app ("main") and the small
// always-on-top browser-capture approval prompt ("capture").
const isCaptureWindow = getCurrentWindow().label === "capture";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isCaptureWindow ? <CapturePopup /> : <App />}</React.StrictMode>,
);
