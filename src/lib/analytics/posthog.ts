import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";

let initialized = false;
let identifiedUserId: string | undefined;

/** Initialize PostHog once, in the browser only. No-ops without a project token. */
export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;

  const token = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
  const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

  if (!token || !apiHost) {
    if (import.meta.env.DEV) {
      const missingVariable = !token
        ? "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"
        : "VITE_PUBLIC_POSTHOG_HOST";
      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      );
    }
    return;
  }

  posthog.init(token, {
    api_host: apiHost,
    person_profiles: "identified_only",
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });
  initialized = true;
}

/** Identify the authenticated Supabase user once for this browser session. */
export function identifyUser(user: User) {
  if (!initialized || identifiedUserId === user.id) return;

  if (identifiedUserId) {
    posthog.reset();
  }

  posthog.identify(user.id, {
    email: user.email,
    name:
      typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : undefined,
  });
  identifiedUserId = user.id;
}

/** Clear the persisted identity when the authenticated session ends. */
export function resetAnalytics() {
  if (!initialized || !identifiedUserId) return;
  posthog.reset();
  identifiedUserId = undefined;
}

/** Send a product-analytics event. Safe to call before/without init. */
export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

/** Send an exception to PostHog Error Tracking. Safe to call before/without init. */
export function captureException(error: unknown) {
  if (!initialized) return;
  posthog.captureException(error);
}
