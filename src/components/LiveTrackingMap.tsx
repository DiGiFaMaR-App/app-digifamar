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
import { trackMapFallbackUsed, trackMapProviderChanged } from "@/lib/analytics/maps";

const SURFACE = "live-tracking-map";


interface LiveTrackingMapProps {
  farmer: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; label?: string };
  farmerLabel?: string;
}

export function LiveTrackingMap({
  farmer,
  destination,
  farmerLabel = "Farmer",
}: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const farmerMarkerRef = useRef<google.maps.Marker | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeRef = useRef<google.maps.Polyline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const authFailed = useMapsAuthFailure();
  const { provider, setProvider } = useMapProvider();

  const handleProviderChange = (next: "google" | "osm") => {
    setProvider(next);
    trackMapProviderChanged({ surface: SURFACE, provider: next });
    if (next === "osm") trackMapFallbackUsed({ surface: SURFACE, reason: "user-choice" });
  };

  const initMap = () => {
    setError(null);
    setReady(false);
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        const g = window.google;
        if (cancelled || !containerRef.current || !g?.maps) return;
        const map = new g.maps.Map(containerRef.current, {
          center: { lat: destination.lat, lng: destination.lng },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });

        destMarkerRef.current = new g.maps.Marker({
          map,
          position: { lat: destination.lat, lng: destination.lng },
          title: destination.label ?? "You",
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#1d4ed8",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
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

  // Init when Google is the selected provider (and when the destination changes).
  useEffect(() => {
    if (provider !== "google") {
      mapRef.current = null;
      farmerMarkerRef.current = null;
      destMarkerRef.current = null;
      routeRef.current = null;
      return;
    }
    const cleanup = initMap();
    return cleanup;
  }, [provider, destination.lat, destination.lng, destination.label]);

  // Farmer marker + route + auto-fit on each update
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (provider !== "google" || !ready || !g || !map || !farmer) return;

    const pos = { lat: farmer.lat, lng: farmer.lng };

    if (!farmerMarkerRef.current) {
      farmerMarkerRef.current = new g.maps.Marker({
        map,
        position: pos,
        title: farmerLabel,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#16a34a",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        zIndex: 10,
      });
    } else {
      farmerMarkerRef.current.setPosition(pos);
    }

    const path = [pos, { lat: destination.lat, lng: destination.lng }];
    if (!routeRef.current) {
      routeRef.current = new g.maps.Polyline({
        map,
        path,
        geodesic: true,
        strokeOpacity: 0,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 0.9,
              strokeColor: "#16a34a",
              scale: 3,
            },
            offset: "0",
            repeat: "12px",
          },
        ],
      });
    } else {
      routeRef.current.setPath(path);
    }

    const bounds = new g.maps.LatLngBounds();
    bounds.extend(pos);
    bounds.extend({ lat: destination.lat, lng: destination.lng });
    map.fitBounds(bounds, 48);
  }, [farmer, destination.lat, destination.lng, farmerLabel, ready, provider]);

  useEffect(() => {
    if (provider !== "google") return;
    if (authFailed) trackMapFallbackUsed({ surface: SURFACE, reason: "auth-failure" });
    else if (error) trackMapFallbackUsed({ surface: SURFACE, reason: "load-error" });
  }, [authFailed, error, provider]);

  const osmPoints = [
    ...(farmer ? [{ lat: farmer.lat, lng: farmer.lng, label: farmerLabel }] : []),
    { lat: destination.lat, lng: destination.lng, label: destination.label },
  ];

  if (provider === "osm") {
    return (
      <div className="space-y-2">
        <MapProviderToggle value={provider} onChange={handleProviderChange} />
        <OsmMap
          points={osmPoints}
          className="h-56 w-full rounded-xl overflow-hidden border border-border bg-muted"
          ariaLabel="Live farmer location map (OpenStreetMap)"
        />
      </div>
    );
  }

  if (error || authFailed) {
    return (
      <div className="space-y-2">
        <MapProviderToggle value={provider} onChange={handleProviderChange} fallbackActive />
        <OsmMap
          points={osmPoints}
          className="h-56 w-full rounded-xl overflow-hidden border border-border bg-muted"
          ariaLabel="Live farmer location map (OpenStreetMap)"
        />
        <MapErrorFallback
          title="Showing a backup map"
          description="Google Maps is unavailable, so we're showing OpenStreetMap instead. Location updates still arrive normally."
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
      <MapProviderToggle value={provider} onChange={handleProviderChange} />
      <div
        ref={containerRef}
        className="h-56 w-full rounded-xl overflow-hidden border border-border bg-muted"
        role="img"
        aria-label="Live farmer location map"
      />
    </div>
  );
}
