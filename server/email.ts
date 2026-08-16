import "server-only";

/**
 * Email delivery abstraction.
 *
 * Phase 1: transactional emails are stubbed to the server console so the
 * full verification / reset architecture works end-to-end in development.
 * Later phases plug in a real provider (SMTP / transactional API) behind
 * this interface without touching callers.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const body = [
    `[email:stub] To=${input.to}`,
    `Subject=${input.subject}`,
    ``,
    input.text,
    input.html ? `\n[html omitted]` : "",
  ].join("\n");
  console.log(body);
}
