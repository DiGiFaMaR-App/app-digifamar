import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, RefreshCcw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapErrorFallbackProps {
  onRetry?: () => void;
  title?: string;
  reason?: string;
}

export function MapErrorFallback({
  onRetry,
  title = "Map can't load right now",
  reason,
}: MapErrorFallbackProps) {
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setHostname(window.location.hostname);
  }, []);

  const isLovableDomain =
    hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com");
  const isLocalhost = hostname === "localhost";

  const baseDomain = hostname.split(".").slice(-2).join(".");

  return (
    <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-6 text-center">
      <div className="rounded-full bg-muted p-3">
        <MapPin className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {reason ??
            `The active Google Maps key is not allowed for this domain (${hostname || "current domain"}).`}
        </p>
      </div>

      {hostname && !isLovableDomain && !isLocalhost && (
        <div className="max-w-sm rounded border border-border bg-background/60 p-3 text-left text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">
            Add these to your key's HTTP referrer allowlist:
          </p>
          <ul className="space-y-1 font-mono">
            <li>https://{hostname}/*</li>
            <li>https://*.{baseDomain}/*</li>
          </ul>
        </div>
      )}

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
        <Button size="sm" asChild className="gap-1">
          <Link to="/settings/maps">
            <Settings className="h-3.5 w-3.5" />
            Map settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
