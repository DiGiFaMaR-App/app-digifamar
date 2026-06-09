import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LiveTrackingMapProps {
  farmer: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; label?: string };
  farmerLabel?: string;
}

/**
 * Lightweight Leaflet map that auto-fits to the farmer's pin and the
 * destination, and smoothly animates the farmer marker as new coordinates
 * arrive. Tiles come from OpenStreetMap (no API key required).
 */
export function LiveTrackingMap({
  farmer,
  destination,
  farmerLabel = "Farmer",
}: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const farmerMarkerRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);

  // Initial map setup (runs once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([destination.lat, destination.lng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Destination (buyer) pin
    const destIcon = L.divIcon({
      className: "",
      html: `<div style="background:hsl(var(--primary));width:14px;height:14px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px hsl(var(--primary));"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([destination.lat, destination.lng], { icon: destIcon })
      .addTo(map)
      .bindTooltip(destination.label ?? "You", {
        permanent: false,
        direction: "top",
      });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      farmerMarkerRef.current = null;
      routeRef.current = null;
    };
  }, [destination.lat, destination.lng, destination.label]);

  // Farmer marker + auto-fit on each update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !farmer) return;

    const pos: L.LatLngExpression = [farmer.lat, farmer.lng];

    if (!farmerMarkerRef.current) {
      const farmerIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;">
            <div style="position:absolute;inset:-10px;background:hsl(142 70% 45% / 0.25);border-radius:9999px;animation:dfm-pulse 1.6s ease-out infinite;"></div>
            <div style="position:relative;background:hsl(142 70% 35%);width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
          </div>
          <style>@keyframes dfm-pulse{0%{transform:scale(0.6);opacity:0.9}100%{transform:scale(1.8);opacity:0}}</style>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      farmerMarkerRef.current = L.marker(pos, { icon: farmerIcon })
        .addTo(map)
        .bindTooltip(farmerLabel, { permanent: false, direction: "top" });
    } else {
      farmerMarkerRef.current.setLatLng(pos);
    }

    // Draw / update straight-line route preview
    const route: L.LatLngExpression[] = [
      pos,
      [destination.lat, destination.lng],
    ];
    if (!routeRef.current) {
      routeRef.current = L.polyline(route, {
        color: "hsl(142 70% 35%)",
        weight: 3,
        opacity: 0.6,
        dashArray: "6 8",
      }).addTo(map);
    } else {
      routeRef.current.setLatLngs(route);
    }

    // Fit both points in view with a little padding
    const bounds = L.latLngBounds([pos, [destination.lat, destination.lng]]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
  }, [farmer, destination.lat, destination.lng, farmerLabel]);

  return (
    <div
      ref={containerRef}
      className="h-56 w-full rounded-xl overflow-hidden border border-border bg-muted"
      role="img"
      aria-label="Live farmer location map"
    />
  );
}
