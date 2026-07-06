import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/hooks/use-google-maps";

interface BrowseMapProps {
  origin: { lat: number; lng: number; formatted?: string | null } | null;
}

export function BrowseMap({ origin }: BrowseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // One-time init: load the map centered on a default US view.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        const map = new g.maps.Map(containerRef.current, {
          center: { lat: 39.8283, lng: -98.5795 },
          zoom: 4,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pan + marker update when origin changes.
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (!ready || !g || !map || !origin) return;

    const pos = { lat: origin.lat, lng: origin.lng };
    map.setCenter(pos);
    map.setZoom(13);

    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({
        map,
        position: pos,
        title: origin.formatted ?? "Selected location",
        animation: g.maps.Animation.DROP,
      });
    } else {
      markerRef.current.setPosition(pos);
      markerRef.current.setTitle(origin.formatted ?? "Selected location");
    }
  }, [origin, ready]);

  if (error) {
    return (
      <div
        className="flex h-64 w-full items-center justify-center rounded-xl border border-border bg-muted/40 px-4 text-center text-xs text-muted-foreground"
        role="img"
        aria-label="Browse map unavailable"
      >
        Map unavailable — {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-64 w-full rounded-xl overflow-hidden border border-border bg-muted"
      role="img"
      aria-label="Browse location map"
    />
  );
}
