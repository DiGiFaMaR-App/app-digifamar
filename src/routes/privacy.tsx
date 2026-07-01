import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — DiGiFaMaR" },
      {
        name: "description",
        content:
          "How DiGiFaMaR collects, uses, and protects your information, and how to delete your account and data.",
      },
      { property: "og:title", content: "Privacy Policy — DiGiFaMaR" },
      {
        property: "og:description",
        content:
          "How DiGiFaMaR collects, uses, and protects your information, and how to delete your account and data.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-5 py-12 prose prose-invert prose-headings:text-[#F0FFF0] prose-p:text-[#F0FFF0]/85 prose-li:text-[#F0FFF0]/85 prose-strong:text-[#F0FFF0]">
        <h1>Privacy Policy</h1>
        <p>
          <em>Last updated: June 13, 2026</em>
        </p>

        <p>
          DiGiFaMaR is an escrow-protected agricultural marketplace. We take privacy seriously
          because we handle money on your behalf. This page explains what we collect, why, and how
          to delete your account.
        </p>

        <h2>1. What we collect</h2>
        <ul>
          <li>
            <strong>Account info</strong>: name, email, role (buyer / farmer), region.
          </li>
          <li>
            <strong>Contact info for delivery</strong>: phone number (used only to coordinate
            delivery; never shown publicly).
          </li>
          <li>
            <strong>Listings & order data</strong>: products, prices, quantities, locations, photos,
            order state, escrow ledger entries.
          </li>
          <li>
            <strong>Messages</strong>: in-app chat between buyers and farmers, scoped to a single
            order.
          </li>
          <li>
            <strong>Device & technical</strong>: IP address, device type, app version, crash logs.
          </li>
        </ul>

        <h2>2. How we use it</h2>
        <ul>
          <li>To run the marketplace, escrow flow, and delivery OTP.</li>
          <li>To detect fraud, off-platform contact attempts, and abuse.</li>
          <li>To meet legal and tax obligations and respond to lawful requests.</li>
        </ul>

        <h2>3. Who can see your data</h2>
        <ul>
          <li>
            Your trading partner on an order (buyer ↔ farmer) sees the order details and your in-app
            chat.
          </li>
          <li>
            DiGiFaMaR admins access data only to resolve disputes, investigate fraud, or comply with
            law.
          </li>
          <li>We do not sell your personal information.</li>
        </ul>

        <h2>4. Escrow & money</h2>
        <p>
          Funds are held by our escrow account until delivery is confirmed (via one-time code) and
          inspected. Every money movement is recorded in an append-only escrow ledger that you can
          view for your own orders.
        </p>

        <h2>5. Data retention</h2>
        <p>
          We retain account and transaction records for as long as you have an active account, plus
          the period required by applicable financial and tax regulations.
        </p>

        <h2>6. Your rights</h2>
        <p>
          You can request access to your data, correction of inaccuracies, or deletion of your
          account at any time.
        </p>

        <h2>7. How to delete your account and data</h2>
        <p>You can delete your account directly inside the app:</p>
        <ol>
          <li>
            Open{" "}
            <Link to="/settings/delete-account" className="underline text-[#39FF14]">
              Settings → Delete account
            </Link>
            .
          </li>
          <li>
            Confirm by typing <code>DELETE</code>.
          </li>
          <li>
            Your profile, listings, messages, and wallet balance (if zero) are removed within 30
            days. Order and ledger records tied to completed transactions are retained in anonymized
            form to satisfy financial regulations.
          </li>
        </ol>
        <p>
          If you can't sign in, email <strong>privacy@digifamar.com</strong> and we'll process the
          deletion within 30 days.
        </p>

        <h2>8. Children</h2>
        <p>DiGiFaMaR is not intended for users under 18.</p>

        <h2>9. Contact</h2>
        <p>
          Questions about this policy: <strong>privacy@digifamar.com</strong>.
        </p>
      </article>
    </SiteLayout>
  );
}
