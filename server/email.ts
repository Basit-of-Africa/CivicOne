import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Phase 6C — Email Delivery Service
 *
 * Uses Resend for transactional email delivery. Falls back to console.log
 * in development or when no API key is configured.
 */

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email. Uses Resend in production, falls back to console in dev.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const client = getResendClient();

  if (client) {
    await client.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text,
    });
  } else {
    // Dev fallback — log to console
    const body = [
      `📧 [Email]`,
      `  To: ${input.to}`,
      `  Subject: ${input.subject}`,
      ``,
      input.text,
    ].join("\n");
    console.log(body);
  }
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${env.APP_URL || "http://localhost:3000"}/auth/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your CivicOne account",
    text: `Welcome to CivicOne! Click the link to verify your email: ${verifyUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Welcome to CivicOne!</h2>
        <p style="color: #666; line-height: 1.6;">
          Thank you for creating an account. Please verify your email address by clicking the button below.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #999; font-size: 12px;">
          If you did not create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const resetUrl = `${env.APP_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your CivicOne password",
    text: `Click the link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Password Reset</h2>
        <p style="color: #666; line-height: 1.6;">
          You requested a password reset. Click the button below to set a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #999; font-size: 12px;">
          This link expires in 1 hour. If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendApplicationStatusEmail(
  to: string,
  reference: string,
  serviceName: string,
  status: string,
): Promise<void> {
  const appUrl = `${env.APP_URL || "http://localhost:3000"}/applications/${reference}`;
  const statusText = status.replace(/_/g, " ").toLowerCase();
  await sendEmail({
    to,
    subject: `Application ${statusText}: ${serviceName}`,
    text: `Your ${serviceName} application (${reference}) is now ${statusText}. View details: ${appUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Application Update</h2>
        <p style="color: #666; line-height: 1.6;">
          Your <strong>${serviceName}</strong> application (<code>${reference}</code>) is now <strong>${statusText}</strong>.
        </p>
        <a href="${appUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Application
        </a>
      </div>
    `,
  });
}

export async function sendPaymentConfirmationEmail(
  to: string,
  reference: string,
  amount: number,
  serviceName: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: `Payment confirmed: ${serviceName}`,
    text: `Your payment of NGN ${amount.toLocaleString()} for ${serviceName} (${reference}) has been confirmed.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Payment Confirmed</h2>
        <p style="color: #666; line-height: 1.6;">
          Your payment of <strong>NGN ${amount.toLocaleString()}</strong> for <strong>${serviceName}</strong> (<code>${reference}</code>) has been confirmed.
        </p>
        <p style="color: #666; line-height: 1.6;">
          Your application will now be processed.
        </p>
      </div>
    `,
  });
}
