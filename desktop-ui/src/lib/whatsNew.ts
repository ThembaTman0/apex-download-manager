// Whether the "What's new" dialog appears after an update. Kept in the
// webview's local storage, like the last-seen version: a per-device UI
// preference, nothing the backend needs. Absent means on.
const KEY = "apex.showWhatsNew";

export function getShowWhatsNew(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function setShowWhatsNew(show: boolean) {
  try {
    if (show) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "0");
  } catch {
    // storage unavailable: the preference just doesn't stick
  }
}
