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

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    // Dev fallback: log the email so flows are testable without SMTP.
    logger.info({ to, subject, html }, "📧 [DEV] Email (SMTP not configured)");
    return;
  }
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

export function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${env.WEB_APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
  return send(
    to,
    "Verify your NuruShop email",
    `<p>Welcome to NuruShop! Confirm your email:</p><p><a href="${link}">Verify email</a></p>`,
  );
}

export function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${env.WEB_APP_URL}/auth/reset-password/confirm?token=${encodeURIComponent(token)}`;
  return send(
    to,
    "Reset your NuruShop password",
    `<p>Reset your password:</p><p><a href="${link}">Reset password</a></p><p>This link expires in 1 hour.</p>`,
  );
}
