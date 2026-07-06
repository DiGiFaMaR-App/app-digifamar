import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, RefreshCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationAutocompleteInput } from "@/components/LocationAutocompleteInput";
import type { GeoError } from "@/hooks/use-geolocation";

type Browser = "chrome" | "safari" | "firefox" | "edge" | "other";

function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("chrome")) return "chrome";
  if (ua.includes("safari")) return "safari";
  return "other";
}

const STEPS: Record<Browser, string[]> = {
  chrome: [
    "Click the tune/lock icon on the left of the address bar.",
    "Open Site settings and set Location to Allow.",
    "Reload this page and tap Try again.",
  ],
  edge: [
    "Click the lock icon on the left of the address bar.",
    "Open Permissions for this site and set Location to Allow.",
    "Reload this page and tap Try again.",
  ],
  firefox: [
    "Click the lock icon on the left of the address bar.",
    "Under Permissions, clear the block for Access Your Location.",
    "Reload this page and tap Try again.",
  ],
  safari: [
    "Open Safari → Settings → Websites → Location.",
    "Set this site to Allow, then reload.",
    "Tap Try again below.",
  ],
  other: [
    "Open your browser's site settings for this page.",
    "Allow Location access, then reload.",
    "Tap Try again below.",
  ],
};

interface Props {
  error: GeoError;
  loading: boolean;
  onRetry: () => void;
  onManualSubmit: (value: string) => void;
}

export function GeoPermissionHelp({ error, loading, onRetry, onManualSubmit }: Props) {
  const [browser, setBrowser] = useState<Browser>("other");
  const [manual, setManual] = useState("");

  useEffect(() => {
    setBrowser(detectBrowser());
  }, []);

  const { title, description, showSteps } = useMemo(() => {
    switch (error) {
      case "permission_denied":
        return {
          title: "Location access is blocked",
          description:
            "We only use your location to find farms nearby — it's never stored. You can re-enable it below, or search by ZIP/city instead.",
          showSteps: true,
        };
      case "http_blocked":
        return {
          title: "Secure connection required",
          description:
            "Browsers only share location over HTTPS. Search by ZIP or city below to keep going.",
          showSteps: false,
        };
      case "not_supported":
        return {
          title: "This browser can't share location",
          description: "No problem — enter a ZIP or city and we'll find nearby farms.",
          showSteps: false,
        };
      case "timeout":
        return {
          title: "Location took too long",
          description: "Try again, or enter a ZIP or city below.",
          showSteps: false,
        };
      case "unavailable":
        return {
          title: "Location is unavailable",
          description:
            "Your device couldn't get a location fix right now. Try again, or enter a ZIP or city below.",
          showSteps: false,
        };
      case "lookup_failed":
        return {
          title: "We couldn't find that place",
          description: "Double-check the spelling of the city or ZIP and try again.",
          showSteps: false,
        };
      default:
        return {
          title: "Something went wrong",
          description: "Try again, or enter a ZIP or city below.",
          showSteps: false,
        };
    }
  }, [error]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>

          {showSteps && (
            <ol className="mt-3 space-y-1.5 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              {STEPS[browser].map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-foreground">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={onRetry} disabled={loading} className="gap-1.5">
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Try again
            </Button>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Or search manually
            </p>
            <LocationAutocompleteInput
              id="geo-manual"
              loading={loading}
              onSubmit={onManualSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
