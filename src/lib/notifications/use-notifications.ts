/**
 * In-app notifications via Supabase Realtime.
 *
 * Subscribes to INSERTs on the caller's `notifications` rows and surfaces a
 * toast for each new one. Also exposes the recent list + unread count and a
 * markRead helper. Fully client-side (no server): the rows are written by DB
 * triggers (order placed) and Edge Functions (escrow/payout events).
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    // Notifications are non-critical; never let a failed load break the shell.
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, data, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems((data ?? []) as AppNotification[]);
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const n = payload.new as AppNotification;
            setItems((prev) => [n, ...prev]);
            toast(n.title, { description: n.body ?? undefined });
          },
        )
        .subscribe();
    } catch {
      /* realtime unavailable (e.g. in tests) */
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  }, [userId]);

  const unreadCount = items.filter((n) => !n.is_read).length;
  return { items, unreadCount, markRead, markAllRead, reload: load };
}
