import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, RefreshCcw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapErrorFallbackProps {
  onRetry?: () => void;
  title?: string;
  /** Raw technical reason — shown only under "Technical details". */
  reason?: string;
  /** Friendly one-liner shown to everyone. */
  description?: string;
}

export function MapErrorFallback({
  onRetry,
  title = "Map view is unavailable right now",
  reason,
  description = "You can still browse and search farms below — only the map is affected.",
}: MapErrorFallbackProps) {
  const [hostname, setHostname] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setHostname(window.location.hostname);
  }, []);

  const baseDomain = hostname.split(".").slice(-2).join(".");

  return (
    <div className="flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-6 text-center">
      <div className="rounded-full bg-muted p-3">
        <MapPin className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry ?? (() => window.location.reload())}
          className="gap-1"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Try again
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? "Hide details" : "Technical details"}
        </Button>
      </div>

      {showDetails && (
        <div className="max-w-sm space-y-2 rounded border border-border bg-background/60 p-3 text-left text-xs text-muted-foreground">
          {reason && <p className="break-words">{reason}</p>}
          {hostname && (
            <div>
              <p className="mb-1 font-medium text-foreground">
                If this is a key/referrer issue, allowlist:
              </p>
              <ul className="space-y-1 font-mono">
                <li>https://{hostname}/*</li>
                <li>https://*.{baseDomain}/*</li>
              </ul>
            </div>
          )}
          <Button size="sm" asChild className="mt-1 gap-1">
            <Link to="/settings/maps">
              <Settings className="h-3.5 w-3.5" />
              Map settings
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
