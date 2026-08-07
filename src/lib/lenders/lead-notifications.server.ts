/**
 * Lender / farmer-loan lead status notifications — SERVER ONLY.
 *
 * Fired when an admin moves a `lender_leads` or `farmer_loan_interest` row to
 * "contacted" or "qualified". No other transition notifies anyone.
 *
 * Channels, in priority order:
 *   1. In-app notification rows (`public.notifications`) for every admin plus
 *      the internal user who made the change.
 *   2. Email to the platform admin(s) via Resend.
 *
 * Every notification attempt (in-app + email) is written to `public.audit_logs`
 * for the audit trail. The lender/lead themselves is NOT contacted — they are
 * still at waitlist stage. The farmer soft-confirmation email is opt-in and
 * off by default (see NOTIFY_FARMER_SOFT_CONFIRMATION).
 */
import { logAudit } from "@/lib/audit/log.server";

export type LeadKind = "lender_lead" | "farmer_loan_interest";
export type NotifiableStatus = "contacted" | "qualified";

/** Optional soft confirmation to the farmer. Off until we're ready to talk. */
const NOTIFY_FARMER_SOFT_CONFIRMATION = false;

export const NOTIFIABLE_STATUSES: NotifiableStatus[] = ["contacted", "qualified"];

export function isNotifiableStatus(s: string): s is NotifiableStatus {
  return (NOTIFIABLE_STATUSES as string[]).includes(s);
}

type AdminRecipient = { id: string; email: string | null; full_name: string | null };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function listAdmins(): Promise<AdminRecipient[]> {
  const db = await admin();
  const { data: roles, error } = await db.from("user_roles").select("user_id").eq("role", "admin");
  if (error || !roles?.length) return [];
  const ids = roles.map((r) => r.user_id);
  const { data: profiles } = await db.from("profiles").select("id, email, full_name").in("id", ids);
  return (profiles ?? []) as AdminRecipient[];
}

/** Subject/body copy — professional and short. */
function compose(kind: LeadKind, status: NotifiableStatus, subjectName: string) {
  const label = kind === "lender_lead" ? "Lender lead" : "Farmer loan interest";
  const verb = status === "contacted" ? "marked as contacted" : "marked as qualified";
  return {
    title: `${label} ${verb}`,
    body: `${subjectName} was ${verb}.`,
    subject: `[DIGIFAMAR] ${label} ${verb} — ${subjectName}`,
  };
}

async function sendAdminEmail(args: {
  to: string[];
  subject: string;
  title: string;
  body: string;
  detail: string;
}): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" };
  if (!args.to.length) return { ok: false, skipped: true, error: "no admin email on file" };

  const from = process.env["RESEND_FROM_EMAIL"] ?? "DIGIFAMAR <onboarding@resend.dev>";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6">
  <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(args.title)}</h2>
  <p style="margin:0 0 8px">${escapeHtml(args.body)}</p>
  <p style="margin:0 0 16px;white-space:pre-line;color:#475569;font-size:14px">${escapeHtml(args.detail)}</p>
  <p style="margin:0;color:#64748b;font-size:12px">Sent automatically by DIGIFAMAR. No action was taken on the applicant's behalf.</p>
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: args.to, subject: args.subject, html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[lead-notify] resend failed [${res.status}]: ${text}`);
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "email send failed" };
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

/**
 * Update a lead's status (service role) and fan out notifications.
 * Returns a report so the UI can surface partial failures instead of pretending
 * everything succeeded.
 */
export async function updateLeadStatusAndNotify(input: {
  kind: LeadKind;
  id: string;
  status: string;
  actorId: string;
}): Promise<{
  id: string;
  status: string;
  notified: boolean;
  adminsNotified: number;
  emailSent: boolean;
  emailError?: string;
}> {
  const db = await admin();
  const table = input.kind === "lender_lead" ? "lender_leads" : "farmer_loan_interest";

  const { data: before, error: readErr } = await db
    .from(table)
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!before) throw new Error("Lead not found");

  const previousStatus = (before as { status: string }).status;
  const { error: updErr } = await db
    .from(table)
    .update({ status: input.status })
    .eq("id", input.id);
  if (updErr) throw new Error(updErr.message);

  // Only an *actual* transition into contacted/qualified notifies anyone.
  const shouldNotify = isNotifiableStatus(input.status) && previousStatus !== input.status;
  if (!shouldNotify) {
    return {
      id: input.id,
      status: input.status,
      notified: false,
      adminsNotified: 0,
      emailSent: false,
    };
  }
  const status = input.status as NotifiableStatus;

  const subjectName =
    input.kind === "lender_lead"
      ? ((before as { name?: string }).name ?? "Lender lead")
      : await farmerLabel(db, (before as { farmer_id?: string }).farmer_id ?? null);

  const detail =
    input.kind === "lender_lead"
      ? [
          `Email: ${(before as { email?: string }).email ?? "—"}`,
          `Phone: ${(before as { phone?: string | null }).phone ?? "—"}`,
          `Entity: ${(before as { entity_type?: string }).entity_type ?? "—"}`,
          `Notes: ${(before as { interest_notes?: string | null }).interest_notes ?? "—"}`,
        ].join("\n")
      : [
          `Requested amount: ${(before as { requested_amount_range?: string }).requested_amount_range ?? "—"}`,
          `Notes: ${(before as { purpose_notes?: string | null }).purpose_notes ?? "—"}`,
        ].join("\n");

  const { title, body, subject } = compose(input.kind, status, subjectName);

  // 1. In-app: every admin + the internal user who made the change.
  const admins = await listAdmins();
  const recipientIds = new Set<string>(admins.map((a) => a.id));
  recipientIds.add(input.actorId);

  const rows = [...recipientIds].map((uid) => ({
    user_id: uid,
    type: `lead.${input.kind}.${status}`,
    title,
    body: `${body}\n${detail}`,
    data: {
      kind: input.kind,
      lead_id: input.id,
      previous_status: previousStatus,
      status,
      actor_id: input.actorId,
    } as never,
  }));
  const { error: notifErr } = await db.from("notifications").insert(rows);
  if (notifErr) console.error("[lead-notify] in-app insert failed", notifErr.message);

  // 2. Email to the platform admin(s).
  const emails = admins.map((a) => a.email).filter((e): e is string => !!e);
  const email = await sendAdminEmail({ to: emails, subject, title, body, detail });

  // 3. Optional soft confirmation to the farmer (disabled for now).
  if (NOTIFY_FARMER_SOFT_CONFIRMATION && input.kind === "farmer_loan_interest") {
    const farmerEmail = await farmerEmailOf(
      db,
      (before as { farmer_id?: string }).farmer_id ?? null,
    );
    if (farmerEmail) {
      await sendAdminEmail({
        to: [farmerEmail],
        subject: "We've received your loan interest",
        title: "Thanks — we've received your interest",
        body: "Our team is reviewing it and will be in touch soon.",
        detail: "",
      });
    }
  }

  // Audit every notification attempt.
  await logAudit({
    actorId: input.actorId,
    actorRole: "admin",
    action: `notify.${input.kind}.status_change`,
    resourceType: table,
    resourceId: input.id,
    outcome: notifErr || (!email.ok && !email.skipped) ? "failure" : "success",
    metadata: {
      previous_status: previousStatus,
      status,
      in_app_recipients: rows.length,
      in_app_error: notifErr?.message ?? null,
      email_recipients: emails.length,
      email_sent: email.ok,
      email_error: email.error ?? null,
    },
  });

  return {
    id: input.id,
    status,
    notified: true,
    adminsNotified: rows.length,
    emailSent: email.ok,
    ...(email.error ? { emailError: email.error } : {}),
  };
}

type Db = Awaited<ReturnType<typeof admin>>;

async function farmerLabel(db: Db, farmerId: string | null): Promise<string> {
  if (!farmerId) return "Farmer";
  const { data } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("id", farmerId)
    .maybeSingle();
  return data?.full_name || data?.email || "Farmer";
}

async function farmerEmailOf(db: Db, farmerId: string | null): Promise<string | null> {
  if (!farmerId) return null;
  const { data } = await db.from("profiles").select("email").eq("id", farmerId).maybeSingle();
  return data?.email ?? null;
}
