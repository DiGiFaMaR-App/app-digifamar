import type { MapProvider } from "@/hooks/use-map-provider";

interface MapProviderToggleProps {
  value: MapProvider;
  onChange: (p: MapProvider) => void;
  /** Shown when Google was requested but is unavailable and we auto-fell back. */
  fallbackActive?: boolean;
  className?: string;
}

const OPTIONS: { id: MapProvider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "osm", label: "OpenStreetMap" },
];

export function MapProviderToggle({
  value,
  onChange,
  fallbackActive = false,
  className = "",
}: MapProviderToggleProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 ${className}`}>
      <div
        className="inline-flex overflow-hidden rounded-md border border-border"
        role="group"
        aria-label="Map provider"
      >
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              value === o.id
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {fallbackActive && value === "google" && (
        <p className="text-[11px] text-muted-foreground">
          Google Maps unavailable — showing OpenStreetMap.
        </p>
      )}
    </div>
  );
}
