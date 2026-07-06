/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, invalidateGoogleMapsLoader } from "@/hooks/use-google-maps";
import { MapErrorFallback } from "@/components/MapErrorFallback";

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

  // One-time init
  useEffect(() => {
    const cleanup = initMap();
    return cleanup;
  }, [destination.lat, destination.lng, destination.label]);

  // Farmer marker + route + auto-fit on each update
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (!ready || !g || !map || !farmer) return;

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
  }, [farmer, destination.lat, destination.lng, farmerLabel, ready]);

  if (error) {
    return (
      <MapErrorFallback
        title="Live tracking map unavailable"
        reason={error}
        onRetry={() => {
          invalidateGoogleMapsLoader();
          initMap();
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-56 w-full rounded-xl overflow-hidden border border-border bg-muted"
      role="img"
      aria-label="Live farmer location map"
    />
  );
}
