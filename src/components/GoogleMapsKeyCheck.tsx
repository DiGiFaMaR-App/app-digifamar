import { useEffect } from "react";
import { toast } from "sonner";
import { resolveGoogleMapsKey } from "@/lib/gmaps-key";

/**
 * Startup validator for the Google Maps browser key.
 * Shows a persistent error toast + console error if the key is missing,
 * malformed, or rejected by Google for the current domain (e.g. CodedSpace).
 * Runs once per page load, client-side only.
 */
export function GoogleMapsKeyCheck() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const key = await resolveGoogleMapsKey();
      if (cancelled) return;

      const host = window.location.hostname;
      const envVar = "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY";

      if (!key) {
        const msg = `${envVar} is missing. Set it in your environment (e.g. CodedSpace .env) and reload.`;
        console.error(`[GoogleMapsKeyCheck] ${msg}`);
        toast.error("Google Maps key missing", {
          description: msg,
          duration: Infinity,
        });
        return;
      }

      if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) {
        const msg = `${envVar} does not look like a valid Google API key (expected to start with "AIza…").`;
        console.error(`[GoogleMapsKeyCheck] ${msg}`);
        toast.error("Google Maps key invalid", {
          description: msg,
          duration: Infinity,
        });
        return;
      }

      // Probe the key against Google for this domain. Static Maps returns 200
      // only when both the key and the HTTP referrer are authorized.
      try {
        const ok = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=1x1&key=${encodeURIComponent(key)}`;
        });
        if (cancelled) return;
        if (!ok) {
          const msg = `Google rejected the Maps key for "${host}". Add https://${host}/* to the key's HTTP referrer allowlist in Google Cloud Console, or set a domain-specific key.`;
          console.error(`[GoogleMapsKeyCheck] ${msg}`);
          toast.error("Google Maps key rejected for this domain", {
            description: msg,
            duration: Infinity,
          });
        } else {
          console.info(`[GoogleMapsKeyCheck] Google Maps key OK for ${host}`);
        }
      } catch (e) {
        console.warn("[GoogleMapsKeyCheck] Could not verify key:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
