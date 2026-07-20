/**
 * Admin module — CLIENT module (self-contained app).
 *
 * The admin panel queries Supabase directly under the admin's session. The
 * "Admin full-access" RLS policies (has_role(auth.uid(),'admin')) authorize
 * these reads/writes, so no server function or service role is needed in the
 * app. Dispute *resolution* (which moves money) stays in the escrow Edge
 * Function (see escrow-v2/escrow.functions.ts::resolveDisputeFn).
 *
 * Export names + `{ data }` call shapes are kept for drop-in compatibility.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/** Best-effort audit trail; never block an admin action if it can't be written. */
async function audit(entry: {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  outcome?: "success" | "failure";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: auth.user?.id ?? null,
      actor_role: "admin",
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      outcome: entry.outcome ?? "success",
      metadata: (entry.metadata ?? {}) as Json,
    });
  } catch {
    /* audit is best-effort on the client */
  }
}

export const verifyAdminSessionFn = async (): Promise<{ ok: true }> => {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: auth.user.id,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
  return { ok: true };
};

export const listOpenDisputesFn = async () => {
  const { data, error } = await supabase
    .from("disputes")
    .select(
      "id, order_id, raised_by, reason, evidence_urls, state, resolution, created_at, resolved_at",
    )
    .in("state", ["open", "under_review"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const listLedgerForOrderFn = async ({ data }: { data: { orderId: string } }) => {
  const { data: rows, error } = await supabase
    .from("escrow_ledger")
    .select("*")
    .eq("order_id", data.orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return rows ?? [];
};

export const setUserRoleFn = async ({
  data,
}: {
  data: { userId: string; role: "admin" | "farmer" | "buyer"; action: "grant" | "revoke" };
}) => {
  if (data.action === "grant") {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
  }
  await audit({
    action: data.action === "grant" ? "admin.role.grant" : "admin.role.revoke",
    resourceType: "user_role",
    resourceId: data.userId,
    metadata: { role: data.role },
  });
  return { ok: true };
};

export const listUsersFn = async ({ data }: { data?: { search?: string } } = {}) => {
  let q = supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const s = data?.search?.trim();
  if (s) q = q.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`);
  const { data: profiles, error } = await q;
  if (error) throw new Error(error.message);
  const ids = (profiles ?? []).map((p) => p.id);
  const { data: roles } = ids.length
    ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
    : { data: [] as Array<{ user_id: string; role: string }> };
  const roleMap = new Map<string, string[]>();
  (roles ?? []).forEach((r) => {
    const arr = roleMap.get(r.user_id) ?? [];
    arr.push(r.role);
    roleMap.set(r.user_id, arr);
  });
  return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
};

/**
 * Verification columns (rejection_reason/verified_at) are added by the Phase 1
 * migration and are not yet in the generated Supabase types; the query builder
 * is cast until types.ts is regenerated post-migration.
 */
interface FarmerProfileRow {
  user_id: string;
  farm_name: string;
  city: string | null;
  state: string | null;
  products: string[];
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
}

export const listFarmerProfilesFn = async ({
  data,
}: {
  data?: { status?: "pending" | "under_review" | "approved" | "rejected" };
} = {}) => {
  // Non-literal column string so the codegen doesn't validate it against the
  // (pre-migration) generated types; result is cast to FarmerProfileRow below.
  const cols: string =
    "user_id, farm_name, city, state, products, verification_status, rejection_reason, verified_at, created_at";
  let q = supabase
    .from("farmer_profiles")
    .select(cols)
    .order("created_at", { ascending: false })
    .limit(300);
  if (data?.status) q = q.eq("verification_status", data.status);
  const { data: rawRows, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (rawRows ?? []) as unknown as FarmerProfileRow[];
  const ids = rows.map((r) => r.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email, phone").in("id", ids)
    : {
        data: [] as Array<{
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
        }>,
      };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (rows ?? []).map((r) => ({
    ...r,
    full_name: byId.get(r.user_id)?.full_name ?? null,
    email: byId.get(r.user_id)?.email ?? null,
    phone: byId.get(r.user_id)?.phone ?? null,
  }));
};

export const setFarmerVerificationFn = async ({
  data,
}: {
  data: {
    userId: string;
    status: "pending" | "under_review" | "approved" | "rejected";
    reason?: string;
  };
}) => {
  const patch: { verification_status: string; rejection_reason: string | null } = {
    verification_status: data.status,
    rejection_reason: data.status === "rejected" ? (data.reason ?? null) : null,
  };
  const fp = supabase.from("farmer_profiles") as unknown as {
    update: (patch: { verification_status: string; rejection_reason: string | null }) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { error } = await fp.update(patch).eq("user_id", data.userId);
  if (error) throw new Error(error.message);
  await audit({
    action: "admin.farmer.verification",
    resourceType: "farmer_profile",
    resourceId: data.userId,
    metadata: { status: data.status, reason: data.reason ?? null },
  });
  return { ok: true };
};

export const listAllOrdersFn = async ({
  data,
}: {
  data?: { status?: string; limit?: number };
} = {}) => {
  let q = supabase
    .from("orders")
    .select("id, buyer_id, farmer_id, listing_id, qty, total_cents, status, created_at")
    .order("created_at", { ascending: false })
    .limit(data?.limit ?? 200);
  if (data?.status) q = q.eq("status", data.status);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return rows ?? [];
};

export const listAllListingsFn = async ({ data }: { data?: { search?: string } } = {}) => {
  let q = supabase
    .from("listings")
    .select("id, farmer_id, title, category, price_cents, unit, qty_available, status, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const s = data?.search?.trim();
  if (s) q = q.ilike("title", `%${s}%`);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return rows ?? [];
};

export const setListingStatusFn = async ({
  data,
}: {
  data: { id: string; status: "active" | "paused" | "removed" };
}) => {
  const { error } = await supabase
    .from("listings")
    .update({ status: data.status })
    .eq("id", data.id);
  if (error) throw new Error(error.message);
  await audit({
    action: "admin.listing.status",
    resourceType: "listing",
    resourceId: data.id,
    metadata: { status: data.status },
  });
  return { ok: true };
};

export const listAllConversationsFn = async () => {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, buyer_id, farmer_id, product_id, last_message_at, created_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const listMessagesForConversationFn = async ({
  data,
}: {
  data: { conversationId: string };
}) => {
  const { data: rows, error } = await supabase
    .from("messages")
    .select("id, sender_id, content, flagged, created_at")
    .eq("conversation_id", data.conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  await audit({
    action: "admin.chat.read",
    resourceType: "conversation",
    resourceId: data.conversationId,
  });
  return rows ?? [];
};
