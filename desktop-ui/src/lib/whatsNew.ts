// The last version whose notes were shown, and whether "What's new" appears
// after updates at all. Kept in the backend DB: up to 1.1.0 they lived in
// the webview's localStorage, which a corrupted WebView2 log could reset on
// every launch, re-showing the notes each time Apex started.
import { backend, type UiKey } from "@/services/backend";

const LEGACY_KEYS: Record<UiKey, string> = {
  lastSeenVersion: "apex.lastSeenVersion",
  showWhatsNew: "apex.showWhatsNew",
};

function readLegacy(key: UiKey): string | null {
  try {
    return localStorage.getItem(LEGACY_KEYS[key]);
  } catch {
    return null;
  }
}

// The DB value, or (first run after updating to 1.1.1) the old localStorage
// one, so nobody sees notes again for a version they already read.
async function read(key: UiKey): Promise<string | null> {
  try {
    return (await backend.getUiValue(key)) ?? readLegacy(key);
  } catch {
    return readLegacy(key);
  }
}

async function write(key: UiKey, value: string) {
  try {
    await backend.setUiValue(key, value);
  } catch {
    // not saved: the dialog may simply show again next launch
  }
}

export const getLastSeenVersion = () => read("lastSeenVersion");
export const setLastSeenVersion = (version: string) => write("lastSeenVersion", version);

/** Absent means on. */
export async function getShowWhatsNew(): Promise<boolean> {
  return (await read("showWhatsNew")) !== "0";
}

// "1" rather than no row, so an old localStorage opt-out can't come back.
export function setShowWhatsNew(show: boolean) {
  return write("showWhatsNew", show ? "1" : "0");
}
