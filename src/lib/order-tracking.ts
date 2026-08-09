/**
 * Order delivery timeline: placed → packed → shipped → delivered.
 *
 * Rows live in `public.order_tracking`. Buyers and the order's farmer can read
 * them; only the farmer can add an update. Each insert fires a DB trigger that
 * writes an in-app notification for the buyer.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyBuyerOfOrderStatusFn } from "@/lib/notifications/order-status.functions";

export const TRACKING_STEPS = ["placed", "packed", "shipped", "delivered"] as const;
export type TrackingStatus = (typeof TRACKING_STEPS)[number];

export const TRACKING_LABEL: Record<TrackingStatus, string> = {
  placed: "Order placed",
  packed: "Packed at the farm",
  shipped: "Shipped",
  delivered: "Delivered",
};

export type TrackingEvent = {
  id: string;
  order_id: string;
  status: TrackingStatus;
  note: string | null;
  carrier: string | null;
  tracking_number: string | null;
  created_at: string;
};

export async function fetchOrderTracking(orderId: string): Promise<TrackingEvent[]> {
  const { data, error } = await supabase
    .from("order_tracking")
    .select("id, order_id, status, note, carrier, tracking_number, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TrackingEvent[];
}

export const orderTrackingQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: ["order-tracking", orderId],
    queryFn: () => fetchOrderTracking(orderId),
    enabled: Boolean(orderId),
    staleTime: 30_000,
  });

export function useAddTrackingUpdate(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      status: TrackingStatus;
      note?: string;
      carrier?: string;
      trackingNumber?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sign in required");
      const { error } = await supabase.from("order_tracking").insert({
        order_id: orderId,
        status: input.status,
        note: input.note?.trim() || null,
        carrier: input.carrier?.trim() || null,
        tracking_number: input.trackingNumber?.trim() || null,
        created_by: userId,
      });
      if (error) throw new Error(error.message);

      // Out-of-band buyer notifications (SMS + email). Best effort: the
      // in-app notification is already written by a DB trigger, so a delivery
      // problem must never fail the farmer's update.
      try {
        await notifyBuyerOfOrderStatusFn({
          data: {
            orderId,
            status: input.status,
            note: input.note?.trim() || undefined,
            carrier: input.carrier?.trim() || undefined,
            trackingNumber: input.trackingNumber?.trim() || undefined,
          },
        });
      } catch (e) {
        console.warn("[order-tracking] buyer notification failed", e);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["order-tracking", orderId] });
    },
  });
}

/** Furthest step reached, for progress rendering. */
export function currentStepIndex(events: TrackingEvent[]): number {
  return events.reduce((max, e) => Math.max(max, TRACKING_STEPS.indexOf(e.status)), 0);
}
