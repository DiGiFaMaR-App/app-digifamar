/**
 * Phone number validation, normalization, and formatting.
 *
 * The app is US-first, so the default country is "US" (+1, NANP).
 * All persistence and external API calls (WhatsApp, tel:, SMS) MUST use
 * the E.164 form returned by `normalizeToE164`.
 */

export type CountryCode = "US";

const COUNTRY_DIAL: Record<CountryCode, string> = {
  US: "1",
};

/** Strip everything except digits. */
export function digitsOnly(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

/**
 * Normalize a raw user-entered phone number to strict E.164
 * (e.g. "+16673619136"). Returns null if the value cannot be normalized
 * into a plausible phone number for the given country.
 *
 * Accepts: "+1 (667) 361-9136", "667-361-9136", "16673619136",
 * "(667) 361 9136", " +1.667.361.9136 ", etc.
 */
export function normalizeToE164(
  input: string | null | undefined,
  country: CountryCode = "US",
): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  let digits = digitsOnly(trimmed);
  if (!digits) return null;

  const dial = COUNTRY_DIAL[country];

  if (country === "US") {
    // Strip a leading "1" if it makes the rest 10 digits (NANP).
    if (digits.length === 11 && digits.startsWith("1")) {
      digits = digits.slice(1);
    } else if (hasPlus && digits.startsWith(dial)) {
      digits = digits.slice(dial.length);
    }
    if (digits.length !== 10) return null;
    // NANP: area code and exchange code must not start with 0 or 1.
    if (/^[01]/.test(digits) || /^\d{3}[01]/.test(digits)) return null;
    return `+${dial}${digits}`;
  }

  return null;
}

/** True if the input normalizes to a valid E.164 number. */
export function isValidPhone(
  input: string | null | undefined,
  country: CountryCode = "US",
): boolean {
  return normalizeToE164(input, country) !== null;
}

/**
 * Progressive display formatter for US input fields:
 * "6673619" → "(667) 361-9".
 * Use inside onChange to keep the user's typing readable.
 */
export function formatUSInput(raw: string): string {
  const digits = digitsOnly(raw).replace(/^1(?=\d{10}$)/, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Human-readable display of an E.164 number.
 * "+16673619136" → "+1 (667) 361-9136". Falls back to the input on failure.
 */
export function formatE164Display(e164: string | null | undefined): string {
  if (!e164) return "";
  const normalized = normalizeToE164(e164);
  if (!normalized) return String(e164);
  // US only for now.
  const rest = normalized.slice(2); // strip "+1"
  if (rest.length !== 10) return normalized;
  return `+1 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
}

/**
 * Digits-only form suitable for `wa.me/<number>` and
 * `whatsapp://send?phone=<number>`. Returns null when invalid.
 */
export function toWhatsAppNumber(
  input: string | null | undefined,
  country: CountryCode = "US",
): string | null {
  const e164 = normalizeToE164(input, country);
  return e164 ? e164.slice(1) : null;
}

/** `tel:` href for the given input. Returns null when invalid. */
export function toTelHref(
  input: string | null | undefined,
  country: CountryCode = "US",
): string | null {
  const e164 = normalizeToE164(input, country);
  return e164 ? `tel:${e164}` : null;
}
