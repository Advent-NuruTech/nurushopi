import nodemailer from "nodemailer";
import { env } from "../../env.js";
import { logger } from "../../lib/logger.js";

const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASSWORD! },
    })
  : null;

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  id: string;
  provider: "resend" | "smtp" | "development";
  dailyQuota?: string;
  monthlyQuota?: string;
}

export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

function authTemplate(title: string, intro: string, action: string, href: string, note: string) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${intro}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 12px">
    <tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
      <tr><td style="background:#004D20;padding:22px 28px;color:#fff;font-size:24px;font-weight:700">Nuru<span style="color:#00C83A">Shop</span></td></tr>
      <tr><td style="padding:32px 28px"><h1 style="font-size:24px;line-height:1.3;margin:0 0 14px">${title}</h1><p style="font-size:16px;line-height:1.6;color:#475569;margin:0 0 24px">${intro}</p>
        <a href="${href}" style="display:inline-block;background:#009933;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:12px">${action}</a>
        <p style="font-size:13px;line-height:1.5;color:#64748b;margin:24px 0 0">${note}</p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`;
  return { html, text: `${title}\n\n${intro}\n\n${action}: ${href}\n\n${note}` };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (env.RESEND_API_KEY) {
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "User-Agent": "NuruShop/1.0",
          ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          headers: input.headers,
          reply_to: env.EMAIL_REPLY_TO,
          tags: input.tags,
        }),
      });
    } catch (error) {
      throw new EmailSendError(error instanceof Error ? error.message : "Email request failed");
    }

    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      name?: string;
      message?: string;
    };
    if (!response.ok || !body.id) {
      const retryAfter = Number(response.headers.get("retry-after"));
      throw new EmailSendError(
        body.message ?? "Email provider rejected the request",
        response.status,
        body.name,
        Number.isFinite(retryAfter) ? retryAfter : undefined,
      );
    }
    return {
      id: body.id,
      provider: "resend",
      dailyQuota: response.headers.get("x-resend-daily-quota") ?? undefined,
      monthlyQuota: response.headers.get("x-resend-monthly-quota") ?? undefined,
    };
  }

  if (transporter) {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: env.EMAIL_REPLY_TO,
      headers: input.headers,
    });
    return { id: info.messageId, provider: "smtp" };
  }

  logger.info({ to: input.to, subject: input.subject }, "Email skipped: no transport configured");
  return { id: "development", provider: "development" };
}

export function sendVerificationEmail(to: string, token: string): Promise<SendEmailResult> {
  const link = `${env.WEB_APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const content = authTemplate(
    "Verify your NuruShop email",
    "Confirm your email address to finish setting up your account.",
    "Verify email",
    link,
    "If you did not create this account, no action is needed.",
  );
  return sendEmail({ to, subject: "Verify your NuruShop email", ...content });
}

export function sendPasswordResetEmail(to: string, token: string): Promise<SendEmailResult> {
  const link = `${env.WEB_APP_URL}/auth/reset-password/confirm?token=${encodeURIComponent(token)}`;
  const content = authTemplate(
    "Reset your password",
    "Use the secure link below to choose a new NuruShop password.",
    "Reset password",
    link,
    "This link expires in 1 hour. If you did not request it, no action is needed.",
  );
  return sendEmail({ to, subject: "Reset your NuruShop password", ...content });
}

export function renderMarketingOptInConfirmation(nextDeliveryLabel: string) {
  const subject = "Thank you for subscribing to NuruShop emails";
  const intro = `Thank you for opting in. Your next monthly NuruShop product email is scheduled for ${nextDeliveryLabel}.`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${intro}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 12px">
    <tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
      <tr><td style="background:#004D20;padding:22px 28px;color:#fff;font-size:24px;font-weight:700">Nuru<span style="color:#00C83A">Shop</span></td></tr>
      <tr><td style="padding:32px 28px">
        <h1 style="font-size:24px;line-height:1.3;margin:0 0 14px">Thank you for subscribing</h1>
        <p style="font-size:16px;line-height:1.6;color:#475569;margin:0 0 18px">${intro}</p>
        <p style="font-size:14px;line-height:1.6;color:#64748b;margin:0">You will receive at most one product email each month. You can opt out at any time from your NuruShop profile or from an email.</p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`;
  const text = `${subject}\n\n${intro}\n\nYou will receive at most one product email each month. You can opt out at any time from your NuruShop profile or from an email.`;
  return { subject, html, text };
}

/** Transactional confirmation sent after every affirmative marketing opt-in. */
export function sendMarketingOptInConfirmationEmail(
  to: string,
  nextDeliveryLabel: string,
): Promise<SendEmailResult> {
  const content = renderMarketingOptInConfirmation(nextDeliveryLabel);
  return sendEmail({
    to,
    ...content,
    tags: [{ name: "category", value: "marketing-opt-in" }],
  });
}
