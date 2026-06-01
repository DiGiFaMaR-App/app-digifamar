import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────
// HAVERSINE — exported so market page can use it too
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
  | "timeout";

export interface GeolocationState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  state: string | null;
  loading: boolean;
  error: GeoError | null;
  setManualLocation: (value: string) => void;
}

export function useGeolocation(): GeolocationState {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [geoState, setGeoState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GeoError | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    // HTTPS check (geolocation is blocked on plain HTTP outside localhost)
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

    // Backup timeout — fires if the browser stalls without calling either
    // success or error (happens on some mobile browsers when location is
    // pending user decision for too long).
    const backupTimer = setTimeout(() => {
      if (!cancelled.current) {
        setError("timeout");
        setLoading(false);
      }
    }, 10_000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(backupTimer);
        if (cancelled.current) return;

        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);

        // Reverse-geocode via Nominatim (no API key required)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en", "User-Agent": "DiGiFaMaR/1.0" } },
          );
          if (!cancelled.current) {
            const data: {
              address?: {
                city?: string;
                town?: string;
                village?: string;
                county?: string;
                state?: string;
              };
            } = await res.json();
            const addr = data.address ?? {};
            setCity(
              addr.city ?? addr.town ?? addr.village ?? addr.county ?? null,
            );
            setGeoState(addr.state ?? null);
          }
        } catch {
          // Reverse geocode failed — we still have coordinates, just no label
        } finally {
          if (!cancelled.current) setLoading(false);
        }
      },
      (err) => {
        clearTimeout(backupTimer);
        if (cancelled.current) return;
        setError(
          err.code === err.PERMISSION_DENIED ? "permission_denied" : "unavailable",
        );
        setLoading(false);
      },
      { timeout: 9_500, enableHighAccuracy: false, maximumAge: 300_000 },
    );

    return () => {
      cancelled.current = true;
      clearTimeout(backupTimer);
    };
  }, []);

  const setManualLocation = (value: string) => {
    // Cancel any in-flight geolocation request
    cancelled.current = true;
    setLat(null);
    setLng(null);
    setCity(value.trim() || null);
    setGeoState(null);
    setError(null);
    setLoading(false);
  };

  return {
    lat,
    lng,
    city,
    state: geoState,
    loading,
    error,
    setManualLocation,
  };
}
