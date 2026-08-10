/**
 * Map key environments.
 *
 * Google API keys are usually referrer-restricted per domain, so the app keeps
 * one pair of keys (browser + server geocoding) per environment:
 *   - production → the published site / custom domain
 *   - preview    → Lovable preview builds and local development
 */
export const MAP_ENVIRONMENTS = ["production", "preview"] as const;
export type MapEnvironment = (typeof MAP_ENVIRONMENTS)[number];

export const MAP_ENVIRONMENT_LABELS: Record<MapEnvironment, string> = {
  production: "Production",
  preview: "Preview / development",
};

/** Which environment a given hostname belongs to. */
export function environmentForHostname(hostname: string): MapEnvironment {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovableproject.com") ||
    host.includes("-dev.lovable.app") ||
    host.startsWith("id-preview--")
  ) {
    return "preview";
  }
  return "production";
}

/** Environment of the browser we're currently running in. */
export function currentMapEnvironment(): MapEnvironment {
  if (typeof window === "undefined") return "production";
  return environmentForHostname(window.location.hostname);
}

export function browserKeyName(env: MapEnvironment) {
  return `gmaps_browser_key:${env}` as const;
}

export function serverKeyName(env: MapEnvironment) {
  return `gmaps_server_key:${env}` as const;
}

/** Legacy single-key setting, still honoured as a fallback. */
export const LEGACY_BROWSER_KEY_NAME = "gmaps_browser_key";
