import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — DiGiFaMaR" },
      { name: "description", content: "The terms that govern your use of DiGiFaMaR, our escrow-protected agricultural marketplace." },
      { property: "og:title", content: "Terms of Service — DiGiFaMaR" },
      { property: "og:description", content: "The terms that govern your use of DiGiFaMaR, our escrow-protected agricultural marketplace." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-5 py-12 prose prose-invert prose-headings:text-[#F0FFF0] prose-p:text-[#F0FFF0]/85 prose-li:text-[#F0FFF0]/85 prose-strong:text-[#F0FFF0]">
        <h1>Terms of Service</h1>
        <p><em>Last updated: June 15, 2026</em></p>

        <p>Welcome to DiGiFaMaR. By using our app or website, you agree to these terms. Please read them carefully.</p>

        <h2>1. Who we are</h2>
        <p>DiGiFaMaR is an escrow-protected marketplace that connects farmers and buyers of agricultural products. We facilitate listings, chat, escrow payments, and delivery confirmation. We are not a party to the underlying sale.</p>

        <h2>2. Eligibility</h2>
        <p>You must be at least 18 years old and able to enter a binding contract to use DiGiFaMaR. You agree to provide accurate account, contact, and delivery information.</p>

        <h2>3. Accounts</h2>
        <ul>
          <li>You are responsible for activity on your account and for keeping your credentials secure.</li>
          <li>One person or legal entity per account. No impersonation.</li>
          <li>We may suspend or terminate accounts that violate these terms or our community rules.</li>
        </ul>

        <h2>4. Listings and orders</h2>
        <ul>
          <li>Farmers are responsible for the accuracy of their listings, product quality, and lawful right to sell.</li>
          <li>Buyers are responsible for paying agreed amounts and accepting delivery at the agreed location and time.</li>
          <li>Prices, quantities, and delivery terms are set between buyer and farmer in-app.</li>
        </ul>

        <h2>5. Escrow and payments</h2>
        <ul>
          <li>Buyer funds are held in our escrow account and only released to the farmer after delivery is confirmed by the buyer's one-time code (OTP) or after the auto-release window if no dispute is raised.</li>
          <li>Service and delivery fees, if any, are shown before checkout.</li>
          <li>Refunds and partial releases are handled in line with our dispute process.</li>
        </ul>

        <h2>6. Delivery and OTP</h2>
        <p>Delivery is confirmed by sharing the buyer's one-time code with the farmer or rider at handover. Sharing your OTP outside of delivery is at your own risk.</p>

        <h2>7. Disputes</h2>
        <p>If a delivery is missing, damaged, or materially different from the listing, raise a dispute in-app before confirming delivery. DiGiFaMaR may review evidence (chat, photos, ledger) and decide on release, partial release, or refund. Our decision on escrow movement is final for the purposes of the platform.</p>

        <h2>8. Prohibited conduct</h2>
        <ul>
          <li>No off-platform contact intended to bypass escrow.</li>
          <li>No illegal, unsafe, restricted, or misrepresented goods.</li>
          <li>No fraud, money laundering, harassment, or abuse of other users or staff.</li>
          <li>No scraping, reverse engineering, or interfering with the service.</li>
        </ul>

        <h2>9. Fees</h2>
        <p>We may charge service fees, listing fees, or delivery fees. Current fees are shown in-app at the point of checkout or listing. We may change fees with notice.</p>

        <h2>10. Intellectual property</h2>
        <p>DiGiFaMaR, our logo, and the app are our property. You keep ownership of content you post (listings, photos, messages) and grant us a license to host and display it as needed to run the service.</p>

        <h2>11. Disclaimers</h2>
        <p>The service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted availability, accuracy of user listings, or the conduct of other users.</p>

        <h2>12. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, DiGiFaMaR is not liable for indirect, incidental, or consequential damages. Our total liability for any claim is limited to the fees we collected from you in the 3 months before the event giving rise to the claim.</p>

        <h2>13. Termination</h2>
        <p>You may close your account at any time via <Link to="/settings/delete-account" className="underline text-[#39FF14]">Settings → Delete account</Link>. We may suspend or close accounts that violate these terms.</p>

        <h2>14. Changes to these terms</h2>
        <p>We may update these terms. Material changes will be announced in-app or by email. Continued use after changes means you accept the updated terms.</p>

        <h2>15. Governing law</h2>
        <p>These terms are governed by the laws of the Republic of Kenya, without regard to conflict-of-law rules.</p>

        <h2>16. Contact</h2>
        <p>Questions about these terms: <strong>support@digifamar.com</strong>.</p>

        <p>See also our <Link to="/privacy" className="underline text-[#39FF14]">Privacy Policy</Link>.</p>
      </article>
    </SiteLayout>
  );
}
