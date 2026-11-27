import { create } from "zustand";
import {
  Clapperboard,
  FolderTree,
  Gauge,
  Globe,
  Info,
  RefreshCw,
  Rocket,
} from "lucide-react";

/** Settings pages. The sidebar lists them; the Settings page renders one. */
export type SettingsTab =
  | "general"
  | "downloads"
  | "folders"
  | "browser"
  | "video"
  | "updates"
  | "about";

export const SETTINGS_TABS: {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  blurb: string;
}[] = [
  { id: "general", label: "General", icon: Rocket, blurb: "Startup, notifications, shortcuts and what happens when the queue is done" },
  { id: "downloads", label: "Downloads", icon: Gauge, blurb: "Where files go, how many run at once, speed limits and proxy" },
  { id: "folders", label: "Folders", icon: FolderTree, blurb: "Sort downloads into category folders" },
  { id: "browser", label: "Browser", icon: Globe, blurb: "Capture downloads from the browser extension" },
  { id: "video", label: "Video", icon: Clapperboard, blurb: "yt-dlp, FFmpeg and Deno for grabbing video" },
  { id: "updates", label: "Updates", icon: RefreshCw, blurb: "Version and app updates" },
  { id: "about", label: "About", icon: Info, blurb: "Version, GitHub, report a bug, licence, privacy and support" },
];

export const SETTINGS_GROUPS: { label: string; tabs: SettingsTab[] }[] = [
  { label: "Preferences", tabs: ["general", "downloads", "folders"] },
  { label: "Integrations", tabs: ["browser", "video"] },
  { label: "App", tabs: ["updates", "about"] },
];

interface SettingsNavState {
  tab: SettingsTab;
  query: string;
  setTab: (tab: SettingsTab) => void;
  setQuery: (query: string) => void;
}

export const useSettingsNav = create<SettingsNavState>((set) => ({
  tab: "general",
  query: "",
  // Picking a page ends a search, so the page shows in full.
  setTab: (tab) => set({ tab, query: "" }),
  setQuery: (query) => set({ query }),
}));
