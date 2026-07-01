/**
 * Escrow.com API client (server-only).
 *
 * Opens an Escrow.com transaction for a checkout. Uses the live API
 * (api.escrow.com, HTTP Basic auth with an API key) when ESCROW_COM_API_KEY /
 * ESCROW_COM_EMAIL are configured; otherwise it returns a deterministic
 * *simulated* transaction so the checkout flow completes end-to-end in
 * unprovisioned environments. See https://www.escrow.com/api.
 */
import type { FeeBreakdown } from "@/lib/cart/fees";

const API_BASE = "https://api.escrow.com/2017-09-01";

export type EscrowTransaction = {
  provider: "escrow.com";
  transactionId: string;
  url: string;
  simulated: boolean;
};

export type EscrowCheckoutInput = {
  orderId: string;
  buyerEmail: string | null;
  description: string;
  breakdown: FeeBreakdown;
};

/** Buyer-facing pay page for an Escrow.com transaction id. */
function payUrl(transactionId: string): string {
  return `https://www.escrow.com/transaction/${transactionId}`;
}

export async function createEscrowTransaction(
  input: EscrowCheckoutInput,
): Promise<EscrowTransaction> {
  const apiKey = process.env.ESCROW_COM_API_KEY;
  const email = process.env.ESCROW_COM_EMAIL;

  // No credentials → simulate a transaction so the order still completes.
  if (!apiKey || !email) {
    const transactionId = `sim_${input.orderId}`;
    return {
      provider: "escrow.com",
      transactionId,
      url: payUrl(transactionId),
      simulated: true,
    };
  }

  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");

  // Escrow.com models the full charge as a single "general merchandise" item;
  // our platform + escrow fees are rolled into the transaction total (cents → dollars).
  const payload = {
    currency: "usd",
    description: input.description,
    items: [
      {
        title: input.description,
        description: `DiGiFaMaR order ${input.orderId}`,
        type: "general_merchandise",
        inspection_period: 259200, // 72h, matching the buyer-protection window
        quantity: 1,
        schedule: [
          {
            amount: input.breakdown.totalCents / 100,
            payer_customer: input.buyerEmail ?? email,
            beneficiary_customer: email,
          },
        ],
      },
    ],
    parties: [
      { role: "buyer", customer: input.buyerEmail ?? email },
      { role: "seller", customer: email },
    ],
  };

  const res = await fetch(`${API_BASE}/transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Escrow.com transaction failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id?: number | string };
  if (data.id === undefined || data.id === null) {
    throw new Error("Escrow.com response did not include a transaction id");
  }
  const transactionId = String(data.id);
  return {
    provider: "escrow.com",
    transactionId,
    url: payUrl(transactionId),
    simulated: false,
  };
}
