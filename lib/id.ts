import { randomBytes, randomUUID } from "node:crypto";

/**
 * Opaque, prefixed, lexicographically-sortable identifiers.
 *
 * CivicOne never uses emails, phone numbers or sequential integers as
 * primary keys. IDs look like `usr_01JXYZ...` — a Crockford-base32 ULID
 * behind a domain prefix — generated in the application layer.
 */

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(now: number): string {
  let remaining = now;
  let str = "";
  for (let i = 0; i < 10; i++) {
    const mod = remaining % 32;
    str = CROCKFORD[mod] + str;
    remaining = Math.floor(remaining / 32);
  }
  return str;
}

function encodeRandom(): string {
  const bytes = randomBytes(16);
  let str = "";
  for (let i = 0; i < 16; i++) {
    str += CROCKFORD[bytes[i] & 31];
  }
  return str;
}

/**
 * Generate a Crockford-base32 ULID (26 chars) from the current time.
 */
export function ulid(): string {
  return encodeTime(Date.now()) + encodeRandom();
}

/**
 * Generate a prefixed opaque ID, e.g. `generateId("usr")` -> `usr_01JXYZ...`.
 */
export function generateId(prefix: string): string {
  return `${prefix}_${ulid()}`;
}

/**
 * Cryptographically secure random token for cookies / verification links.
 */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Random unguessable token suited to user-facing links (avoids characters
 * that are easily confused or that break inside URLs).
 */
export function randomUrlToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Random UUID (used for PWA manifest id and similar non-key contexts).
 */
export function randomUUIDToken(): string {
  return randomUUID();
}
