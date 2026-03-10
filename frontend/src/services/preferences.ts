import type { GeoMode } from "./geo";
import { storage } from "./storage";

const GHOST_MODE_KEY = "ghost_mode";
const GHOST_MODE_VERSION = 1;
const GHOST_MODE_EVENT = "ghost-mode-updated";

export function getGhostModePreference(): GeoMode {
  const value = storage.getJSON<GeoMode>(GHOST_MODE_KEY, "ghost", {
    version: GHOST_MODE_VERSION,
    migrate: (raw) => (raw === "reveal" ? "reveal" : "ghost"),
  });
  return value === "reveal" ? "reveal" : "ghost";
}

export function setGhostModePreference(mode: GeoMode): void {
  storage.setJSON<GeoMode>(GHOST_MODE_KEY, mode, { version: GHOST_MODE_VERSION });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GHOST_MODE_EVENT));
  }
}

export function onGhostModePreferenceUpdated(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(GHOST_MODE_EVENT, listener);
  return () => window.removeEventListener(GHOST_MODE_EVENT, listener);
}
