/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  loadGoogleMaps,
  invalidateGoogleMapsLoader,
  useMapsAuthFailure,
} from "@/hooks/use-google-maps";
import { MapErrorFallback } from "@/components/MapErrorFallback";
import { OsmMap } from "@/components/OsmMap";
import { MapProviderToggle } from "@/components/MapProviderToggle";
import { FarmDetailDrawer, type MapFarm } from "@/components/FarmDetailDrawer";
import { useMapProvider } from "@/hooks/use-map-provider";
import { farmDetailQueryOptions } from "@/lib/farm-detail";
import {
  trackFirstMarkerRender,
  trackMapDeepLinkOpened,
  trackMapFallbackUsed,
  trackMapLoadDuration,
  trackMapMarkerClick,
  trackMapProviderChanged,
} from "@/lib/analytics/maps";

const SURFACE = "browse-map";

interface BrowseMapProps {
  origin: { lat: number; lng: number; formatted?: string | null } | null;
  /** Farms to plot as clickable markers. */
  farms?: MapFarm[];
  /** Farm id from the URL — opens the detail drawer directly (deep link). */
  selectedFarmId?: string | null;
  /** Called when the selection changes so the route can sync the URL. */
  onSelectFarm?: (farmId: string | null) => void;
}

export function BrowseMap({
  origin,
  farms = [],
  selectedFarmId = null,
  onSelectFarm,
}: BrowseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const farmMarkersRef = useRef<google.maps.Marker[]>([]);
  const loadStartRef = useRef<number>(0);
  const firstMarkersLoggedRef = useRef(false);
  const deepLinkLoggedRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<MapFarm | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const authFailed = useMapsAuthFailure();
  const { provider, setProvider } = useMapProvider();

  const openFarm = (farm: MapFarm, from: "google" | "osm") => {
    setSelected(farm);
    setDrawerOpen(true);
    onSelectFarm?.(farm.user_id);
    trackMapMarkerClick({ surface: SURFACE, provider: from, farmId: farm.user_id });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
    onSelectFarm?.(null);
  };

  // Deep link: open the drawer for ?farm=<id> as soon as the farm is known.
  useEffect(() => {
    if (!selectedFarmId) {
      deepLinkLoggedRef.current = null;
      setDrawerOpen(false);
      setSelected(null);
      return;
    }
    const match = farms.find((f) => f.user_id === selectedFarmId) ?? null;
    if (match) {
      setSelected(match);
      setDrawerOpen(true);
    }
    if (deepLinkLoggedRef.current !== selectedFarmId && (match || farms.length > 0)) {
      deepLinkLoggedRef.current = selectedFarmId;
      trackMapDeepLinkOpened({
        surface: SURFACE,
        farmId: selectedFarmId,
        found: Boolean(match),
      });
    }
  }, [selectedFarmId, farms]);

  const handleProviderChange = (next: "google" | "osm") => {
    setProvider(next);
    trackMapProviderChanged({ surface: SURFACE, provider: next });
    if (next === "osm") trackMapFallbackUsed({ surface: SURFACE, reason: "user-choice" });
  };

  const initMap = () => {
    setError(null);
    setReady(false);
    firstMarkersLoggedRef.current = false;
    loadStartRef.current = performance.now();
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
        trackMapLoadDuration({
          surface: SURFACE,
          provider: "google",
          durationMs: performance.now() - loadStartRef.current,
          success: true,
        });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        trackMapLoadDuration({
          surface: SURFACE,
          provider: "google",
          durationMs: performance.now() - loadStartRef.current,
          success: false,
        });
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
      farmMarkersRef.current = [];
      return;
    }
    const cleanup = initMap();
    return cleanup;
  }, [provider]);

  // Report whenever we actually fall back to OSM because Google is broken.
  useEffect(() => {
    if (provider !== "google") return;
    if (authFailed) trackMapFallbackUsed({ surface: SURFACE, reason: "auth-failure" });
    else if (error) trackMapFallbackUsed({ surface: SURFACE, reason: "load-error" });
  }, [authFailed, error, provider]);

  // Pan + origin marker update when origin changes.
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (provider !== "google" || !ready || !g?.maps || !map || !origin) return;

    const pos = { lat: origin.lat, lng: origin.lng };
    map.setCenter(pos);
    map.setZoom(11);

    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({
        map,
        position: pos,
        title: origin.formatted ?? "Selected location",
        animation: g.maps.Animation.DROP,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#1d4ed8",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        zIndex: 5,
      });
    } else {
      markerRef.current.setPosition(pos);
      markerRef.current.setTitle(origin.formatted ?? "Selected location");
    }
  }, [origin, ready, provider]);

  // Clickable farm markers.
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (provider !== "google" || !ready || !g?.maps || !map) return;

    farmMarkersRef.current.forEach((m) => m.setMap(null));
    farmMarkersRef.current = [];

    farmMarkersRef.current = farms.map((farm) => {
      const marker = new g.maps.Marker({
        map,
        position: { lat: farm.lat, lng: farm.lng },
        title: farm.farm_name,
        cursor: "pointer",
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#16a34a",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 10,
      });
      marker.addListener("click", () => openFarm(farm, "google"));
      return marker;
    });

    if (farms.length > 0) {
      const bounds = new g.maps.LatLngBounds();
      farms.forEach((f) => bounds.extend({ lat: f.lat, lng: f.lng }));
      if (origin) bounds.extend({ lat: origin.lat, lng: origin.lng });
      map.fitBounds(bounds, 48);

      if (!firstMarkersLoggedRef.current) {
        firstMarkersLoggedRef.current = true;
        trackFirstMarkerRender({
          surface: SURFACE,
          provider: "google",
          markerCount: farms.length,
          durationMs: performance.now() - loadStartRef.current,
        });
      }
    }

    return () => {
      farmMarkersRef.current.forEach((m) => m.setMap(null));
      farmMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farms, ready, provider, origin]);

  const googleUnavailable = Boolean(error) || authFailed;

  const drawer = (
    <FarmDetailDrawer
      farm={selected}
      open={drawerOpen}
      onOpenChange={(o) => {
        if (o) setDrawerOpen(true);
        else closeDrawer();
      }}
    />
  );

  // Marker clicks aren't possible inside the OSM embed, so expose the same
  // farms as a clickable list that opens the identical detail drawer.
  const osmFarmList = farms.length > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {farms.map((f) => (
        <button
          key={f.user_id}
          type="button"
          onClick={() => openFarm(f, "osm")}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium transition hover:border-primary/60 hover:text-primary"
        >
          {f.farm_name}
          {f.distance_mi != null && (
            <span className="ml-1 text-muted-foreground">{f.distance_mi.toFixed(1)} mi</span>
          )}
        </button>
      ))}
    </div>
  );

  const osmPoints = [
    ...(origin ? [{ lat: origin.lat, lng: origin.lng, label: origin.formatted ?? undefined }] : []),
    ...farms.map((f) => ({ lat: f.lat, lng: f.lng, label: f.farm_name })),
  ];

  // Explicit OpenStreetMap choice.
  if (provider === "osm") {
    return (
      <div className="space-y-2">
        <MapProviderToggle value={provider} onChange={handleProviderChange} />
        {osmPoints.length > 0 ? (
          <OsmMap points={osmPoints} ariaLabel="Browse location map (OpenStreetMap)" />
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Search an address or share your location to see it on the map.
          </div>
        )}
        {osmFarmList}
        {drawer}
      </div>
    );
  }

  if (googleUnavailable) {
    return (
      <div className="space-y-2">
        <MapProviderToggle value={provider} onChange={handleProviderChange} fallbackActive />
        {osmPoints.length > 0 && (
          <OsmMap points={osmPoints} ariaLabel="Browse location map (OpenStreetMap)" />
        )}
        {osmFarmList}
        <MapErrorFallback
          title={origin ? "Showing a backup map" : "Map view is unavailable right now"}
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
        {drawer}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <MapProviderToggle value={provider} onChange={handleProviderChange} />
      <div
        ref={containerRef}
        className="h-64 w-full rounded-xl overflow-hidden border border-border bg-muted"
        role="img"
        aria-label="Browse location map"
      />
      {farms.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Tap a green pin to see farm details.
        </p>
      )}
      {drawer}
    </div>
  );
}
