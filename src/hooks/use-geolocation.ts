import { useCallback, useEffect, useRef, useState } from "react";
import { reverseGeocode, geocodeAddress } from "@/lib/geocode.functions";

// ─────────────────────────────────────────────────────────────────
// HAVERSINE
// ─────────────────────────────────────────────────────────────────

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

export type GeoError =
  | "not_supported"
  | "http_blocked"
  | "permission_denied"
  | "unavailable"
  | "timeout"
  | "lookup_failed";

export interface GeolocationState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  state: string | null;
  loading: boolean;
  error: GeoError | null;
  setManualLocation: (value: string) => Promise<void>;
  detect: () => void;
}

export function useGeolocation(): GeolocationState {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [geoState, setGeoState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GeoError | null>(null);
  const cancelled = useRef(false);

  const detect = useCallback(() => {
    cancelled.current = false;
    setError(null);
    setLoading(true);

    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      setError("http_blocked");
      setLoading(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("not_supported");
      setLoading(false);
      return;
    }

    const backupTimer = setTimeout(() => {
      if (!cancelled.current) {
        setError("timeout");
        setLoading(false);
      }
    }, 12_000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(backupTimer);
        if (cancelled.current) return;
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        try {
          const res = await reverseGeocode({
            data: { lat: latitude, lng: longitude },
          });
          if (cancelled.current) return;
          if (res) {
            setCity(res.city);
            setGeoState(res.state);
          }
        } catch {
          // coords still usable for distance filtering
        } finally {
          if (!cancelled.current) setLoading(false);
        }
      },
      (err) => {
        clearTimeout(backupTimer);
        if (cancelled.current) return;
        setError(
          err.code === err.PERMISSION_DENIED
            ? "permission_denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable",
        );
        setLoading(false);
      },
      { timeout: 10_000, enableHighAccuracy: false, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    detect();
    return () => {
      cancelled.current = true;
    };
  }, [detect]);

  const setManualLocation = useCallback(async (value: string) => {
    cancelled.current = true;
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const isZip = /^\d{5}(-\d{4})?$/.test(trimmed);
      const res = await geocodeAddress({
        data: isZip ? { zip: trimmed } : { city: trimmed },
      });
      if (res) {
        setLat(res.lat);
        setLng(res.lng);
        setCity(res.city ?? trimmed);
        setGeoState(res.state);
        setError(null);
      } else {
        setError("lookup_failed");
      }
    } catch {
      setError("lookup_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    lat,
    lng,
    city,
    state: geoState,
    loading,
    error,
    setManualLocation,
    detect,
  };
}
