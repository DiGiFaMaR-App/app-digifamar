/**
 * Buyer notifications for order status changes — server-only.
 *
 * Fired after a farmer posts a tracking update (placed → packed → shipped →
 * delivered). In-app notifications are written by a DB trigger; this module
 * adds the out-of-band channels:
 *   - SMS via Vonage (see `sms.server.ts`)
 *   - Email via Lovable app emails (enabled once a sender domain is verified)
 *
 * Nothing here throws: a delivery problem must never break the farmer's
 * tracking update. Every send returns a structured result instead.
 */
import { sendSms } from "./sms.server";
import { orderStatusEmail } from "@/lib/email/templates";

export type TrackingStatus = "placed" | "packed" | "shipped" | "delivered";

/**
 * Full order lifecycle statuses that trigger a buyer/farmer notification.
 * Superset of the delivery-tracking steps above.
 */
export type OrderNotifyStatus =
  | TrackingStatus
  | "paid"
  | "requires_action"
  | "disputed"
  | "released"
  | "cancelled";

export type NotifyChannelResult = {
  sent: boolean;
  reason?: string;
};

export type NotifyResult = {
  sms: NotifyChannelResult;
  email: NotifyChannelResult;
};

type Copy = { subject: string; sms: string; body: string };

export function statusCopy(
  status: OrderNotifyStatus,
  opts: { farmName?: string | null; note?: string | null; carrier?: string | null; trackingNumber?: string | null },
): Copy {
  const from = opts.farmName ? ` from ${opts.farmName}` : "";
  const tracking = [opts.carrier, opts.trackingNumber].filter(Boolean).join(" ");
  const extras = [opts.note?.trim(), tracking ? `Tracking: ${tracking}` : ""].filter(Boolean).join(" ");

  const base: Record<OrderNotifyStatus, Copy> = {
    placed: {
      subject: "Your DiGiFaMaR order is confirmed",
      sms: `Your order${from} is confirmed. Funds are held safely in escrow.`,
      body: `Your order${from} is confirmed and your payment is held in escrow until you confirm delivery.`,
    },
    packed: {
      subject: "Your order has been packed",
      sms: `Your order${from} has been packed and is being prepared for shipping.`,
      body: `Good news — your order${from} has been packed at the farm and is being prepared for shipping.`,
    },
    shipped: {
      subject: "Your order is on the way",
      sms: `Your order${from} has shipped.`,
      body: `Your order${from} has shipped and is on the way to you.`,
    },
    delivered: {
      subject: "Your order was delivered",
      sms: `Your order${from} was delivered. Confirm delivery in the app to release escrow.`,
      body: `Your order${from} was marked delivered. Confirm delivery in the app so the farmer can be paid from escrow.`,
    },
    paid: {
      subject: "Payment received — funds held in escrow",
      sms: `Payment for your order${from} is held in escrow until you confirm delivery.`,
      body: `We received your payment for your order${from}. The money is held in escrow and is only released to the farmer after you confirm delivery.`,
    },
    requires_action: {
      subject: "Action needed to complete your payment",
      sms: `Your order${from} needs one more step to complete payment. Open DiGiFaMaR to finish.`,
      body: `Your bank asked for an extra verification step before your payment for your order${from} can complete. Open the app to finish it.`,
    },
    disputed: {
      subject: "A dispute was opened on your order",
      sms: `A dispute was opened on your order${from}. Escrow is frozen until it is resolved.`,
      body: `A dispute was opened on your order${from}. Funds stay frozen in escrow until our team resolves it. You can add evidence from the order page.`,
    },
    released: {
      subject: "Escrow released",
      sms: `Escrow for your order${from} has been released to the farmer.`,
      body: `Delivery was confirmed and the escrowed funds for your order${from} have been released to the farmer.`,
    },
    cancelled: {
      subject: "Your order was cancelled",
      sms: `Your order${from} was cancelled.`,
      body: `Your order${from} was cancelled. Any escrowed funds are returned to you.`,
    },
  };

  const copy = base[status];
  if (!extras) return copy;
  return { ...copy, sms: `${copy.sms} ${extras}`.trim(), body: `${copy.body}\n\n${extras}` };
}

/** True when Lovable app emails are wired up (sender domain verified). */
function isEmailConfigured(): boolean {
  return Boolean(process.env.LOVABLE_API_KEY && process.env.EMAIL_SENDER_DOMAIN);
}

async function sendEmail(
  to: string | null | undefined,
  copy: Copy,
  idempotencyKey: string,
): Promise<NotifyChannelResult> {
  if (!to) return { sent: false, reason: "no_email" };
  if (!isEmailConfigured()) return { sent: false, reason: "email_not_configured" };
  try {
    const res = await fetch(`${process.env.APP_ORIGIN ?? ""}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        templateName: "order-status",
        recipientEmail: to,
        idempotencyKey,
        templateData: {
          subject: copy.subject,
          body: copy.body,
          html: orderStatusEmail({ subject: copy.subject, body: copy.body }).html,
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[order-status email] HTTP ${res.status}: ${detail}`);
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[order-status email] send failed:", err);
    return { sent: false, reason: (err as Error)?.message };
  }
}

/** Notify a buyer over SMS + email about a tracking status change. */
export async function notifyBuyerOfStatus(input: {
  orderId: string;
  status: OrderNotifyStatus;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
  farmName?: string | null;
  note?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
}): Promise<NotifyResult> {
  const copy = statusCopy(input.status, input);

  const smsResult = await sendSms(input.buyerPhone, copy.sms);
  const email = await sendEmail(
    input.buyerEmail,
    copy,
    `order-status-${input.orderId}-${input.status}`,
  );

  return {
    sms: smsResult.sent ? { sent: true } : { sent: false, reason: smsResult.reason },
    email,
  };
}
