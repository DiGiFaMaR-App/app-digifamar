import { useCallback, useEffect, useState } from "react";

export type MapProvider = "google" | "osm";

const STORAGE_KEY = "digifamar:map-provider";
const listeners = new Set<(p: MapProvider) => void>();
let current: MapProvider = "google";

function isProvider(v: unknown): v is MapProvider {
  return v === "google" || v === "osm";
}

/**
 * Shared, persisted preference for which map provider to render.
 * SSR-safe: always starts as "google" and syncs from localStorage after mount.
 */
export function useMapProvider() {
  const [provider, setProviderState] = useState<MapProvider>(current);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (isProvider(stored) && stored !== current) {
      current = stored;
      setProviderState(stored);
    }
    listeners.add(setProviderState);
    return () => {
      listeners.delete(setProviderState);
    };
  }, []);

  const setProvider = useCallback((next: MapProvider) => {
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — keep in-memory only */
    }
    listeners.forEach((l) => l(next));
  }, []);

  return { provider, setProvider };
}
