import { captureEvent } from "./posthog";

export type MapProviderName = "google" | "osm";

/** Google Maps failed to initialise on a given surface. */
export function trackMapsFailure(props: {
  surface: string;
  code: string;
  message?: string;
  hostname?: string;
}) {
  captureEvent("map_google_failure", {
    surface: props.surface,
    code: props.code,
    message: props.message?.slice(0, 200),
    hostname: props.hostname,
  });
}

/** The OpenStreetMap fallback was rendered instead of Google Maps. */
export function trackMapFallbackUsed(props: {
  surface: string;
  reason: "auth-failure" | "load-error" | "user-choice";
}) {
  captureEvent("map_osm_fallback_used", props);
}

/** The user switched map providers with the toggle. */
export function trackMapProviderChanged(props: { surface: string; provider: MapProviderName }) {
  captureEvent("map_provider_changed", props);
}

/** A map marker was clicked and the detail drawer opened. */
export function trackMapMarkerClick(props: {
  surface: string;
  provider: MapProviderName;
  farmId?: string;
}) {
  captureEvent("map_marker_clicked", props);
}
