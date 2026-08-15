/**
 * Payment environment banner.
 *
 * Renders nothing once a live publishable key is in place. In the preview and
 * in any sandbox build it tells the user that cards are test cards, so nobody
 * believes a test subscription is a real charge.
 */
const clientToken = (import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] ?? "").trim();

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Card payments are not configured in this environment yet.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-secondary/40 bg-secondary/10 px-4 py-2 text-center text-sm text-foreground">
        Test mode — use card <span className="font-semibold">4242 4242 4242 4242</span>, any future
        expiry and any CVC. No real money moves.
      </div>
    );
  }
  return null;
}
