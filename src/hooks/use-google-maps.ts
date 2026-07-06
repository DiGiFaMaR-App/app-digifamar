// Lightweight Google Maps JS API loader + Places Autocomplete (New) hook.
// Uses the Lovable-managed browser key (referrer-restricted, safe to embed).

import { useEffect, useRef, useState } from "react";
import { resolveGoogleMapsKey } from "@/lib/gmaps-key";

const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;

export class GoogleMapsKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleMapsKeyError";
  }
}

declare global {
  interface Window {
    google?: typeof google;
    __dgfMapsLoader?: Promise<void>;
    __dgfMapsCallback?: () => void;
    gm_authFailure?: () => void;
  }
}

/** Loads the Maps JS API (with places library) exactly once. */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps && typeof window.google.maps.importLibrary === "function")
    return Promise.resolve();
  if (window.__dgfMapsLoader) return window.__dgfMapsLoader;

  window.__dgfMapsLoader = (async () => {
    const BROWSER_KEY = await resolveGoogleMapsKey();
    if (!BROWSER_KEY) throw new GoogleMapsKeyError("Google Maps browser key not configured");
    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        settled = true;
        window.clearTimeout(timeout);
      };

      const timeout = window.setTimeout(() => {
        if (settled) return;
        cleanup();
        reject(
          new GoogleMapsKeyError(
            "Google Maps timed out — the active key may be blocked for this domain.",
          ),
        );
      }, 15_000);

      window.__dgfMapsCallback = () => {
        if (settled) return;
        if (window.google?.maps && typeof window.google.maps.importLibrary === "function") {
          cleanup();
          resolve();
        } else {
          cleanup();
          reject(new GoogleMapsKeyError("Google Maps loaded but is not usable on this domain."));
        }
      };

      const previousGmAuthFailure = window.gm_authFailure;
      window.gm_authFailure = () => {
        if (settled) return;
        cleanup();
        window.gm_authFailure = previousGmAuthFailure ?? undefined;
        reject(
          new GoogleMapsKeyError(
            "Google Maps key rejected for this domain. Add this domain to the key's HTTP referrer allowlist, or switch to a different key in Map settings.",
          ),
        );
      };

      const params = new URLSearchParams({
        key: BROWSER_KEY,
        v: "weekly",
        libraries: "places",
        loading: "async",
        callback: "__dgfMapsCallback",
      });
      if (TRACKING_ID) params.set("channel", TRACKING_ID);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      s.async = true;
      s.defer = true;
      s.onerror = () => {
        if (settled) return;
        cleanup();
        window.gm_authFailure = previousGmAuthFailure ?? undefined;
        reject(new GoogleMapsKeyError("Failed to load Google Maps script."));
      };
      document.head.appendChild(s);
    });
  })();
  return window.__dgfMapsLoader;
}

/** Resets the singleton loader so the next call attempts a fresh load. */
export function invalidateGoogleMapsLoader() {
  if (typeof window !== "undefined") {
    window.__dgfMapsLoader = undefined;
    window.__dgfMapsCallback = undefined;
  }
}

export type PlaceSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

/** US-restricted Places Autocomplete (New) suggestions for a query string. */
export function usePlacesAutocomplete(input: string, debounceMs = 250) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    const query = input.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        await loadGoogleMaps();
        const places = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        if (!tokenRef.current) {
          tokenRef.current = new places.AutocompleteSessionToken();
        }
        const { suggestions: raw } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: tokenRef.current,
            includedRegionCodes: ["us"],
          });
        if (cancelled) return;
        const mapped: PlaceSuggestion[] = raw
          .map((s) => s.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => !!p)
          .map((p) => ({
            placeId: p.placeId,
            primary: p.mainText?.text ?? p.text.text,
            secondary: p.secondaryText?.text ?? "",
          }));
        setSuggestions(mapped);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Autocomplete failed");
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [input, debounceMs]);

  return { suggestions, loading, error };
}
