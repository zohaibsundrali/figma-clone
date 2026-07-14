import { Resend } from "resend";

/**
 * Email delivery via Resend.
 *
 * Required env when sending real email:
 *   RESEND_API_KEY   – API key from https://resend.com/api-keys
 *   EMAIL_FROM       – verified sender, e.g. "Figma Clone <noreply@yourdomain.com>"
 *
 * When RESEND_API_KEY is absent (e.g. local dev), emails are logged to the
 * server console instead of being sent, so the invite flow is still testable.
 */

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Figma Clone <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; simulated: boolean }> {
  if (!resend) {
    console.info(
      `[email:dev] (no RESEND_API_KEY) would send to ${params.to}: ${params.subject}\n${params.text}`
    );
    return { ok: true, simulated: true };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, simulated: false };
    }
    return { ok: true, simulated: false };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, simulated: false };
  }
}

export function buildInviteEmail(opts: {
  fileTitle: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `${opts.inviterName} invited you to "${opts.fileTitle}"`;
  const text =
    `${opts.inviterName} invited you to collaborate on "${opts.fileTitle}" as ${opts.role}.\n\n` +
    `Open this link to accept (sign in if needed):\n${opts.acceptUrl}\n`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto">
      <h2 style="margin:0 0 8px">You've been invited</h2>
      <p style="color:#444;line-height:1.5">
        <strong>${escapeHtml(opts.inviterName)}</strong> invited you to collaborate on
        <strong>${escapeHtml(opts.fileTitle)}</strong> as <strong>${escapeHtml(opts.role)}</strong>.
      </p>
      <p style="margin:24px 0">
        <a href="${opts.acceptUrl}"
           style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Accept invitation
        </a>
      </p>
      <p style="color:#888;font-size:12px">If the button doesn't work, paste this URL into your browser:<br>${escapeHtml(opts.acceptUrl)}</p>
    </div>`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
