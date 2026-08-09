/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  invalidateGoogleMapsLoader,
  useMapsAuthFailure,
} from "@/hooks/use-google-maps";
import { MapErrorFallback } from "@/components/MapErrorFallback";

interface BrowseMapProps {
  origin: { lat: number; lng: number; formatted?: string | null } | null;
}

export function BrowseMap({ origin }: BrowseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const authFailed = useMapsAuthFailure();

  const initMap = () => {
    setError(null);
    setReady(false);
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(containerRef.current, {
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
  };

  // One-time init: load the map centered on a default US view.
  useEffect(() => {
    const cleanup = initMap();
    return cleanup;
  }, []);

  // Pan + marker update when origin changes.
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (!ready || !g?.maps || !map || !origin) return;

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

  if (error || authFailed) {
    return (
      <div className="space-y-2">
        {origin && (
          <OsmMap
            points={[{ lat: origin.lat, lng: origin.lng, label: origin.formatted ?? undefined }]}
            ariaLabel="Browse location map (OpenStreetMap)"
          />
        )}
        <MapErrorFallback
          title={
            origin
              ? "Showing a backup map"
              : "Map view is unavailable right now"
          }
          description={
            origin
              ? "Google Maps is unavailable, so we're showing OpenStreetMap instead. Search and nearby farms still work normally."
              : "You can still search by address and see nearby farms in the list — only the map is affected."
          }
          reason={
            error ?? "Google Maps rejected the request for this domain (referrer or API key issue)."
          }
          onRetry={() => {
            invalidateGoogleMapsLoader();
            initMap();
          }}
        />
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
