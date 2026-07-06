import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlacesAutocomplete, type PlaceSuggestion } from "@/hooks/use-google-maps";

const ZIP_RE = /^\d{5}(-\d{4})?$/;
// Loose "city" or "city, ST" check — used only to surface a friendly hint,
// server-side geocoding is the source of truth.
const CITY_RE = /^[A-Za-z][A-Za-z .'\-]{1,}(,\s?[A-Za-z]{2,})?$/;

export type LocationAutocompleteInputProps = {
  id?: string;
  label?: string;
  placeholder?: string;
  loading?: boolean;
  autoFocus?: boolean;
  onSubmit: (value: string) => void;
};

/**
 * Address / ZIP autocomplete input backed by Google Places (New).
 * - Types 5-digit ZIP → skips suggestions, validates locally, submits.
 * - Types free text → debounced Places suggestions (US-restricted).
 * - Picking a suggestion submits the resolved display string upstream.
 */
export function LocationAutocompleteInput({
  id = "loc-autocomplete",
  label = "ZIP or city",
  placeholder = "ZIP (e.g. 94103) or city (e.g. Portland, OR)",
  loading = false,
  autoFocus = false,
  onSubmit,
}: LocationAutocompleteInputProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const trimmed = value.trim();
  const isZip = ZIP_RE.test(trimmed);
  // Only fetch suggestions for non-ZIP text of at least 3 chars.
  const query = !isZip && trimmed.length >= 3 ? trimmed : "";
  const { suggestions, loading: sugLoading, error: sugError } = usePlacesAutocomplete(query);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const localError = (() => {
    if (!touched || !trimmed) return null;
    if (isZip) return null;
    if (trimmed.length < 3) return "Enter at least 3 characters.";
    if (!CITY_RE.test(trimmed)) return "Try a ZIP or a city (e.g. Portland, OR).";
    return null;
  })();

  const pick = (s: PlaceSuggestion) => {
    const combined = [s.primary, s.secondary].filter(Boolean).join(", ");
    setValue(combined);
    setOpen(false);
    setHighlight(-1);
    onSubmit(combined);
  };

  const submit = () => {
    setTouched(true);
    if (!trimmed) return;
    if (isZip) {
      onSubmit(trimmed);
      setOpen(false);
      return;
    }
    if (highlight >= 0 && suggestions[highlight]) {
      pick(suggestions[highlight]);
      return;
    }
    if (suggestions[0]) {
      pick(suggestions[0]);
      return;
    }
    if (!localError) onSubmit(trimmed);
  };

  const showList = open && !isZip && (sugLoading || suggestions.length > 0 || sugError);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <div ref={wrapRef} className="relative flex-1">
        <Label htmlFor={id} className="sr-only">
          {label}
        </Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setHighlight(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (!showList) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            autoFocus={autoFocus}
            className="pl-8"
            aria-invalid={!!localError}
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={`${id}-listbox`}
            role="combobox"
          />
        </div>
        {localError && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {localError}
          </p>
        )}
        {showList && (
          <ul
            id={`${id}-listbox`}
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          >
            {sugLoading && suggestions.length === 0 && (
              <li className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </li>
            )}
            {!sugLoading && sugError && (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                Couldn't reach place search — you can still submit manually.
              </li>
            )}
            {suggestions.map((s, i) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex w-full items-start gap-2 rounded px-3 py-2 text-left text-sm transition ${
                    i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  }`}
                  role="option"
                  aria-selected={i === highlight}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.primary}</span>
                    {s.secondary && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.secondary}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" disabled={!trimmed || loading || !!localError} className="gap-1.5">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Search className="h-3.5 w-3.5" />
        )}
        Search
      </Button>
    </form>
  );
}
