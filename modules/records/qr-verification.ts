import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

/**
 * QR Verification Token
 *
 * Format: v1.{payload}.{signature}
 *
 * Payload (base64url-encoded JSON):
 *   { r: recordId, d: documentId, t: issuedAt }
 *
 * Signature: HMAC-SHA256(payload, VERIFICATION_SECRET)
 *
 * This allows anyone to scan a QR code on a CivicOne certificate
 * and verify its authenticity without needing an account.
 */

interface QrPayload {
  /** Record ID */
  r: string;
  /** Document (certificate) ID */
  d: string;
  /** Issued-at Unix timestamp (seconds) */
  t: number;
}

function getSecret(): string {
  return env.DOCUMENT_SIGNING_SECRET;
}

function base64urlEncode(data: string): string {
  return Buffer.from(data, "utf-8").toString("base64url");
}

function base64urlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/**
 * Generate a verification token for a certificate.
 */
export function generateVerificationToken(recordId: string, documentId: string): string {
  const payload: QrPayload = {
    r: recordId,
    d: documentId,
    t: Math.floor(Date.now() / 1000),
  };
  const encoded = base64urlEncode(JSON.stringify(payload));
  const signature = sign(encoded);
  return `v1.${encoded}.${signature}`;
}

/**
 * Verify a token and return the payload if valid, or null if invalid.
 */
export function verifyVerificationToken(token: string): QrPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, encoded, signature] = parts;
  if (version !== "v1") return null;

  // Verify HMAC signature
  const expectedSignature = sign(encoded);
  if (signature !== expectedSignature) return null;

  // Decode payload
  try {
    const raw = base64urlDecode(encoded);
    const payload = JSON.parse(raw) as QrPayload;
    if (!payload.r || !payload.d || typeof payload.t !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Build the full verification URL for a given token.
 */
export function getVerificationUrl(token: string): string {
  return `${env.APP_URL}/verify/${token}`;
}
