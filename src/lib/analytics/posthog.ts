import posthog from "posthog-js";

let initialized = false;

/** Initialize PostHog once, in the browser only. No-ops without a project token. */
export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const token = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
  if (!token) return;

  const region = (import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string) || "eu";
  const apiHost = region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";

  posthog.init(token, { api_host: apiHost, capture_pageview: true, person_profiles: "identified_only" });
  initialized = true;
}

/** Send a product-analytics event. Safe to call before/without init. */
export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}
