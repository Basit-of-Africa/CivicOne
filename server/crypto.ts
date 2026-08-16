import { createHash, timingSafeEqual } from "node:crypto";

/** SHA-256 hex digest. Used to store tokens at rest (never plaintext). */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Constant-time string comparison.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const aHash = sha256(a);
  const bHash = sha256(b);
  const aBuf = Buffer.from(aHash);
  const bBuf = Buffer.from(bHash);
  return timingSafeEqual(aBuf, bBuf);
}
