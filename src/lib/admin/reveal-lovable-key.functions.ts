/**
 * Reveal LOVABLE_API_KEY — OBSOLETE in the self-contained app.
 *
 * The self-contained build has no server and no LOVABLE_API_KEY; the app no
 * longer depends on the Lovable connector. This stub keeps the export so the
 * /admin/reveal-key route compiles, but it always reports the key is
 * unavailable. Safe to delete along with the route.
 */
export const revealLovableApiKeyFn = async (): Promise<{ value: string }> => {
  throw new Error(
    "LOVABLE_API_KEY is not available in the self-contained app (no server / no Lovable connector).",
  );
};
