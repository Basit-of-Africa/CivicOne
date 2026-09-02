import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "@/lib/env";

/**
 * Field-level encryption for sensitive stored credentials (NIN).
 *
 * AES-256-GCM with a fresh random IV per value. The key is derived from
 * `IDENTITY_ENCRYPTION_KEY` via SHA-256. Payload format:
 *   v1:<iv(base64)>:<authTag(base64)>:<ciphertext(base64)>
 */

const ALGO = "aes-256-gcm";
const VERSION = "v1";

function deriveKey(): Buffer {
  return createHash("sha256").update(env.IDENTITY_ENCRYPTION_KEY).digest();
}

export function encryptSensitive(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSensitive(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unsupported or malformed encrypted payload");
  }
  const decipher = createDecipheriv(
    ALGO,
    deriveKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
