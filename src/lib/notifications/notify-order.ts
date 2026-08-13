/**
 * Client helper: fire the out-of-band (email + SMS) buyer notification for an
 * order lifecycle change.
 *
 * In-app notifications for the same events are written by the
 * `trg_orders_status_notify` database trigger for BOTH the buyer and the
 * farmer, so this helper only adds the external channels. It is best effort:
 * a delivery failure must never break the state transition that triggered it.
 */
import { notifyBuyerOfOrderStatusFn } from "@/lib/notifications/order-status.functions";

export type OrderNotifyStatus =
  | "placed"
  | "packed"
  | "shipped"
  | "delivered"
  | "paid"
  | "requires_action"
  | "disputed"
  | "released"
  | "cancelled";

export async function notifyOrderStatus(
  orderId: string,
  status: OrderNotifyStatus,
  note?: string,
): Promise<void> {
  try {
    await notifyBuyerOfOrderStatusFn({ data: { orderId, status, note } });
  } catch (err) {
    console.warn("[notify-order] out-of-band notification failed", err);
  }
}
