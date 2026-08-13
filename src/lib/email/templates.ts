/**
 * Branded transactional email templates — shared HTML shell + copy.
 *
 * Pure string builders (no server-only imports) so they can be unit tested and
 * reused by any sender: order status, signup welcome, password reset.
 * Email clients need absolute image URLs and inline styles only.
 */

const ORIGIN = "https://app.digifamar.com";
const LOGO = `${ORIGIN}/__l5e/assets-v1/e967540e-ec58-4039-9edf-61e96db18f7c/digifamar-logo-v10.png`;

const FOREST = "#0F2C1A";
const SAGE = "#9AB79E";
const INK = "#0B1410";
const MIST = "#F5F7F3";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailLayoutInput = {
  title: string;
  /** Plain-text paragraphs; newlines split into <p> blocks. */
  body: string;
  cta?: { label: string; url: string };
  footnote?: string;
  preheader?: string;
};

/** Wraps content in the DiGiFaMaR branded shell (logo header + forest footer). */
export function renderBrandedEmail(input: EmailLayoutInput): string {
  const paragraphs = input.body
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${INK}">${escapeHtml(p)}</p>`,
    )
    .join("");

  const cta = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:12px;background:${FOREST}">
        <a href="${input.cta.url}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px">${escapeHtml(input.cta.label)}</a>
      </td></tr></table>`
    : "";

  const footnote = input.footnote
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6B7A70">${escapeHtml(input.footnote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:${MIST};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader ?? input.title)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MIST};padding:28px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E3E9E3">
      <tr><td style="background:${FOREST};padding:22px 28px" align="left">
        <img src="${LOGO}" width="46" height="46" alt="DiGiFaMaR" style="vertical-align:middle;border-radius:10px;background:#ffffff;padding:4px">
        <span style="display:inline-block;margin-left:12px;vertical-align:middle;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:.2px">DiGiFaMaR</span>
      </td></tr>
      <tr><td style="padding:30px 28px 26px">
        <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:${FOREST};font-weight:700">${escapeHtml(input.title)}</h1>
        ${paragraphs}
        ${cta}
        ${footnote}
      </td></tr>
      <tr><td style="padding:18px 28px;background:${MIST};border-top:1px solid #E3E9E3">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#6B7A70">
          DiGiFaMaR — from American farms, direct to you.<br>
          Escrow-protected orders · All 50 states · <a href="${ORIGIN}" style="color:${FOREST};text-decoration:underline">app.digifamar.com</a>
        </p>
      </td></tr>
    </table>
    <p style="margin:14px 0 0;font-size:11px;color:${SAGE}">© ${new Date().getFullYear()} DiGiFaMaR</p>
  </td></tr>
</table>
</body></html>`;
}

/** Welcome / signup confirmation. */
export function signupEmail(args: { name?: string | null; confirmUrl?: string }) {
  const who = args.name ? `, ${args.name}` : "";
  return {
    subject: "Welcome to DiGiFaMaR",
    html: renderBrandedEmail({
      title: `Welcome to DiGiFaMaR${who}`,
      preheader: "Confirm your email and start buying direct from American farms.",
      body: `Thanks for joining DiGiFaMaR — the marketplace where American farmers sell direct and receive 90% of every sale.\nConfirm your email address to activate your account.`,
      cta: args.confirmUrl ? { label: "Confirm my email", url: args.confirmUrl } : undefined,
      footnote: "If you didn't create this account, you can safely ignore this email.",
    }),
  };
}

/** Password reset. */
export function passwordResetEmail(args: { resetUrl: string; expiresInMinutes?: number }) {
  const mins = args.expiresInMinutes ?? 60;
  return {
    subject: "Reset your DiGiFaMaR password",
    html: renderBrandedEmail({
      title: "Reset your password",
      preheader: "A link to set a new DiGiFaMaR password.",
      body: `We received a request to reset the password for your DiGiFaMaR account.\nThis link expires in ${mins} minutes and can only be used once.`,
      cta: { label: "Set a new password", url: args.resetUrl },
      footnote:
        "If you didn't request a password reset, ignore this email — your password stays unchanged.",
    }),
  };
}

/** Order / tracking status update. */
export function orderStatusEmail(args: { subject: string; body: string; orderUrl?: string }) {
  return {
    subject: args.subject,
    html: renderBrandedEmail({
      title: args.subject,
      preheader: args.body.slice(0, 110),
      body: args.body,
      cta: args.orderUrl ? { label: "View my order", url: args.orderUrl } : undefined,
      footnote: "Payments stay in escrow until you confirm delivery.",
    }),
  };
}
