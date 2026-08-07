/**
 * Server-side sink for Google Maps load failures.
 * Structured, greppable logs — no credentials are ever accepted or logged.
 */
import { createServerFn } from "@tanstack/react-start";

export type MapsFailurePayload = {
  code: string;
  message: string;
  hint: string;
  hostname: string;
  keySource: string;
  surface: string;
  userAgent?: string;
};

function sanitize(input: unknown): MapsFailurePayload {
  const d = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
  // Never let an API key slip into logs.
  const scrub = (s: string) => s.replace(/AIza[0-9A-Za-z_-]{10,}/g, "AIza…[redacted]");
  return {
    code: scrub(str(d.code, 60)) || "unknown",
    message: scrub(str(d.message)) || "Unknown Google Maps failure",
    hint: scrub(str(d.hint, 400)),
    hostname: str(d.hostname, 120),
    keySource: str(d.keySource, 40) || "unknown",
    surface: str(d.surface, 60) || "unknown",
    userAgent: str(d.userAgent, 200),
  };
}

export const logMapsFailureFn = createServerFn({ method: "POST" })
  .inputValidator(sanitize)
  .handler(async ({ data }) => {
    console.error(
      `[google-maps][${data.code}] ${data.message} | surface=${data.surface} host=${data.hostname} keySource=${data.keySource} | fix: ${data.hint}`,
      JSON.stringify({ ...data, at: new Date().toISOString() }),
    );
    return { logged: true } as const;
  });
