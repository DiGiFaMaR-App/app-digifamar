/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  invalidateGoogleMapsLoader,
  useMapsAuthFailure,
} from "@/hooks/use-google-maps";
import { MapErrorFallback } from "@/components/MapErrorFallback";
import { OsmMap } from "@/components/OsmMap";
import { MapProviderToggle } from "@/components/MapProviderToggle";
import { useMapProvider } from "@/hooks/use-map-provider";


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
  const { provider, setProvider } = useMapProvider();

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

  // Init (or re-init) the Google map whenever Google is the selected provider.
  useEffect(() => {
    if (provider !== "google") {
      mapRef.current = null;
      markerRef.current = null;
      return;
    }
    const cleanup = initMap();
    return cleanup;
  }, [provider]);

  // Pan + marker update when origin changes.
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (provider !== "google" || !ready || !g?.maps || !map || !origin) return;

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
  }, [origin, ready, provider]);

  const googleUnavailable = Boolean(error) || authFailed;

  // Explicit OpenStreetMap choice.
  if (provider === "osm") {
    return (
      <div className="space-y-2">
        <MapProviderToggle value={provider} onChange={setProvider} />
        {origin ? (
          <OsmMap
            points={[{ lat: origin.lat, lng: origin.lng, label: origin.formatted ?? undefined }]}
            ariaLabel="Browse location map (OpenStreetMap)"
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Search an address or share your location to see it on the map.
          </div>
        )}
      </div>
    );
  }

  if (googleUnavailable) {
    return (
      <div className="space-y-2">
        <MapProviderToggle value={provider} onChange={setProvider} fallbackActive />
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
    <div className="space-y-2">
      <MapProviderToggle value={provider} onChange={setProvider} />
      <div
        ref={containerRef}
        className="h-64 w-full rounded-xl overflow-hidden border border-border bg-muted"
        role="img"
        aria-label="Browse location map"
      />
    </div>
  );
}
