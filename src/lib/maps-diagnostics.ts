/**
 * Classifies Google Maps load failures into actionable messages and logs them
 * both to the browser console and to the server (structured log).
 */
import { logMapsFailureFn } from "@/lib/maps-log.functions";

export type MapsDiagnosis = {
  code:
    | "no-key"
    | "referrer-blocked"
    | "timeout"
    | "network"
    | "billing-or-api-disabled"
    | "unknown";
  message: string;
  hint: string;
};

export function classifyMapsError(error: unknown, hostname = ""): MapsDiagnosis {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const text = raw.toLowerCase();
  const host = hostname || (typeof window !== "undefined" ? window.location.hostname : "");
  const base = host.split(".").slice(-2).join(".");

  if (text.includes("not configured") || text.includes("no key")) {
    return {
      code: "no-key",
      message: "No Google Maps browser key is configured for this site.",
      hint: "Add a browser key in Map settings (/settings/maps), or set the admin-wide key so every visitor gets one.",
    };
  }
  if (text.includes("rejected") || text.includes("referrer") || text.includes("not usable")) {
    return {
      code: "referrer-blocked",
      message: `Google rejected the Maps key for ${host || "this domain"}.`,
      hint: `In Google Cloud Console, add https://${host}/* and https://*.${base}/* to the key's HTTP referrer allowlist, then reload.`,
    };
  }
  if (text.includes("timed out") || text.includes("timeout")) {
    return {
      code: "timeout",
      message: "Google Maps did not finish loading in time.",
      hint: "Usually a blocked key or a network/ad-blocker issue. Check the key's referrer allowlist and disable blockers for this domain.",
    };
  }
  if (text.includes("failed to load") || text.includes("network")) {
    return {
      code: "network",
      message: "The Google Maps script could not be fetched.",
      hint: "Check the connection and whether an extension, firewall, or CSP is blocking maps.googleapis.com.",
    };
  }
  if (text.includes("billing") || text.includes("api not") || text.includes("disabled")) {
    return {
      code: "billing-or-api-disabled",
      message: "The Maps JavaScript API is disabled or billing is not enabled on the key's project.",
      hint: "Enable the Maps JavaScript API (and Places API New) and turn on billing for that Google Cloud project.",
    };
  }
  return {
    code: "unknown",
    message: raw || "Google Maps failed to load.",
    hint: "Open the browser console for the raw Google error, then verify the key in Map settings.",
  };
}

/** Logs a maps failure to the console and the server. Never throws. */
export function reportMapsFailure(
  error: unknown,
  opts: { surface: string; keySource?: string } = { surface: "unknown" },
): MapsDiagnosis {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const diagnosis = classifyMapsError(error, hostname);

  if (typeof console !== "undefined") {
    console.error(
      `[google-maps][${diagnosis.code}] ${diagnosis.message}\n→ ${diagnosis.hint}\n(surface: ${opts.surface}, host: ${hostname})`,
      error,
    );
  }

  void logMapsFailureFn({
    data: {
      code: diagnosis.code,
      message: diagnosis.message,
      hint: diagnosis.hint,
      hostname,
      keySource: opts.keySource ?? "unknown",
      surface: opts.surface,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    },
  }).catch(() => {
    /* logging must never break the UI */
  });

  return diagnosis;
}
