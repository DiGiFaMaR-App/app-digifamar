import { useId, useRef } from "react";
import { Check } from "lucide-react";
import type { MapProvider } from "@/hooks/use-map-provider";

interface MapProviderToggleProps {
  value: MapProvider;
  onChange: (p: MapProvider) => void;
  /** Shown when Google was requested but is unavailable and we auto-fell back. */
  fallbackActive?: boolean;
  className?: string;
}

const OPTIONS: { id: MapProvider; label: string; hint: string }[] = [
  { id: "google", label: "Google Maps", hint: "Interactive map with clickable farm pins" },
  { id: "osm", label: "OpenStreetMap", hint: "Open-source backup map, no Google account needed" },
];

export function MapProviderToggle({
  value,
  onChange,
  fallbackActive = false,
  className = "",
}: MapProviderToggleProps) {
  const labelId = useId();
  const statusId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].id);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(index, -1);
        break;
      case "Home":
        e.preventDefault();
        move(-1, 1);
        break;
      case "End":
        e.preventDefault();
        move(0, -1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 ${className}`}>
      <div className="flex flex-col gap-1">
        <span id={labelId} className="text-[11px] font-medium text-muted-foreground">
          Map provider
        </span>
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={fallbackActive ? statusId : undefined}
          className="inline-flex overflow-hidden rounded-md border border-border"
        >
          {OPTIONS.map((o, i) => {
            const checked = value === o.id;
            return (
              <button
                key={o.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={`${o.label} — ${o.hint}`}
                tabIndex={checked ? 0 : -1}
                onClick={() => onChange(o.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  checked
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Check
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 ${checked ? "opacity-100" : "opacity-0"}`}
                />
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className="text-[11px] text-muted-foreground"
      >
        {fallbackActive && value === "google"
          ? "Google Maps is unavailable — showing OpenStreetMap instead."
          : ""}
      </p>
    </div>
  );
}
