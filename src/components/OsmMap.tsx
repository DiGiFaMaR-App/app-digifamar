/**
 * Dependency-free OpenStreetMap fallback.
 * Renders the public openstreetmap.org embed (raster tiles) in an iframe so
 * users can still see locations when the Google Maps JS API is unavailable.
 */
interface OsmPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface OsmMapProps {
  /** Points to fit in view. First point gets the marker. */
  points: OsmPoint[];
  /** Half-size of the viewport box in degrees when a single point is given. */
  spread?: number;
  className?: string;
  ariaLabel?: string;
}

export function OsmMap({
  points,
  spread = 0.02,
  className = "h-64 w-full rounded-xl overflow-hidden border border-border bg-muted",
  ariaLabel = "OpenStreetMap location map",
}: OsmMapProps) {
  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );
  if (valid.length === 0) return null;

  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const pad = valid.length > 1 ? 0.01 : spread;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;

  const marker = valid[0];
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}` +
    `&layer=mapnik&marker=${marker.lat}%2C${marker.lng}`;
  const link = `https://www.openstreetmap.org/?mlat=${marker.lat}&mlon=${marker.lng}#map=13/${marker.lat}/${marker.lng}`;

  return (
    <div className="space-y-1">
      <iframe
        title={ariaLabel}
        aria-label={ariaLabel}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className={className}
      />
      <p className="text-right text-[11px] text-muted-foreground">
        Showing OpenStreetMap ·{" "}
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Open larger map
        </a>
      </p>
    </div>
  );
}
