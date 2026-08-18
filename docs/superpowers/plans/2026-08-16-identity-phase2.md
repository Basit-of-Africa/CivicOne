# CivicOne Nigeria Phase 2 — Identity Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CivicOne identity layer — a mock-provider NIN verification flow, encrypted NIN credential storage, verification history, identity dashboard/profile states, audit events, and a provider abstraction ready for an authorised real provider later.

**Architecture:** Domain logic lives in `modules/identity/` (service, validators, providers, components) following the exact patterns from `modules/auth/` and `modules/users/`. NIN is encrypted at rest (AES-256-GCM) in a dedicated `IdentityCredential` table and only ever displayed masked (`********1234`). The mock provider only succeeds for fictional demo NINs; arbitrary real NINs always fail. RBAC gates all identity reads (`identity:read:masked` / `identity:read:full`) and verification (`identity:verify`). Every verification action writes a structured `AuditLog` entry that never contains a raw NIN.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma/PostgreSQL, Zod, react-hook-form, existing `@/components/ui/*` primitives.

## Global Constraints

- NEVER scrape, reverse-engineer, or unofficially query NIMC; NEVER claim a connection to NIMC; NEVER use real people's NINs.
- NIN must NOT be used as: DB primary key, URL identifier, public identifier, application reference, or analytics identifier. Use the opaque CivicOne `userId` (`usr_...`) everywhere.
- All identity access must be authorised. Raw NIN access requires `identity:read:full`; masked access requires `identity:read:masked`.
- Never log or store raw NIN outside the encrypted `IdentityCredential.encryptedValue` column. Audit metadata never contains the raw NIN.
- Never expose a raw provider response to the UI — only safe result codes and reasons.
- Use existing conventions: `"use server"` actions → `withActionResult` → typed `ActionResult`; service files import `server-only`; IDs via `generateId("<prefix>")`; Zod server-side validation via `validationError(toFieldErrors(...))`.
- Design tokens and existing UI primitives only; no new dependencies.
- Identity states: `UNVERIFIED`, `VERIFICATION_PENDING`, `VERIFIED`, `VERIFICATION_FAILED`, `REQUIRES_MANUAL_REVIEW`, `SUSPENDED`.
- Keep "CivicOne is an independent technology platform. It is not a government agency." visible on identity surfaces.

---

### Task 1: Environment config, status labels, feature branch

**Files:**
- Modify: `lib/env.ts`
- Modify: `tests/setup.ts`
- Modify: `.env.example`
- Modify: `.env` (untracked — dev key only)
- Modify: `lib/constants.ts`
- Modify: `components/ui/status-badge.tsx`

**Interfaces:**
- Produces: `env.IDENTITY_ENCRYPTION_KEY` (string, ≥32 chars) used by `server/encryption.ts`.

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b 260816-feat-identity-verification-phase2
```

- [ ] **Step 2: Add the encryption key env var to `lib/env.ts`**

Add after the `PASSWORD_RESET_TTL_SECONDS` line:

```typescript
  IDENTITY_ENCRYPTION_KEY: z
    .string()
    .min(32, "IDENTITY_ENCRYPTION_KEY must be at least 32 characters")
    .default(
      "civicone-dev-identity-key-change-me-in-production-0123456789abcdef",
    ),
```

- [ ] **Step 3: Add the key to `tests/setup.ts`**

Append:

```typescript
process.env.IDENTITY_ENCRYPTION_KEY =
  process.env.IDENTITY_ENCRYPTION_KEY ??
  "test-identity-encryption-key-0123456789abcdef";
```

- [ ] **Step 4: Add the key to `.env.example`**

Append:

```bash
# Identity verification
# AES-256-GCM key material used to encrypt stored identity credentials (NIN).
# MUST be replaced with a strong random value in production (e.g. `openssl rand -hex 32`).
IDENTITY_ENCRYPTION_KEY="change-me-this-is-a-development-only-key-0123456789abcdef"
```

- [ ] **Step 5: Append a real generated key to the untracked `.env`**

```bash
grep -q IDENTITY_ENCRYPTION_KEY /workspace/.env || echo "IDENTITY_ENCRYPTION_KEY=\"$(openssl rand -hex 32)\"" >> /workspace/.env
```

- [ ] **Step 6: Add identity status labels to `lib/constants.ts`**

In the `FORMATTED_STATUS` record add:

```typescript
  VERIFICATION_PENDING: "Verification in progress",
  VERIFICATION_FAILED: "Verification failed",
  REQUIRES_MANUAL_REVIEW: "Manual review",
```

- [ ] **Step 7: Add identity status tones to `components/ui/status-badge.tsx`**

In `TONE_BY_STATUS` add:

```typescript
  VERIFICATION_PENDING: "warning",
  VERIFICATION_FAILED: "error",
  REQUIRES_MANUAL_REVIEW: "warning",
```

- [ ] **Step 8: Verify**

Run: `npm run typecheck`
Expected: clean (no errors).

- [ ] **Step 9: Commit**

```bash
git add lib/env.ts tests/setup.ts .env.example lib/constants.ts components/ui/status-badge.tsx
git commit -m "chore(identity): add encryption key config and identity status labels"
```

---

### Task 2: Prisma schema, migration, seed (identity tables)

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: migration via `prisma migrate dev`

**Interfaces:**
- Produces DB tables `identity_providers`, `identity_credentials`, `identity_verifications`, `identity_verification_attempts`, extended `identity_profiles`.
- Produces `IdentityProvider` rows seeded (`MOCK_NIN`), consumed by `modules/identity/service.ts`.

- [ ] **Step 1: Rewrite the identity section of `prisma/schema.prisma`**

Replace the current "Identity (Phase 2 placeholder...)" block (lines 207-229) and the `User` model's relations. Update the `User` model — add after the `auditLogs` line:

```prisma
  identityProfile         IdentityProfile?
  identityCredentials     IdentityCredential[]
  identityVerifications   IdentityVerification[]
  identityVerificationAttempts IdentityVerificationAttempt[]
```

Replace the whole identity block at the end of the file with:

```prisma
// ---------------------------------------------------------------------------
// Identity (Phase 2)
// ---------------------------------------------------------------------------
// NIN is NEVER a key or public identifier. It is stored encrypted inside
// IdentityCredential.encryptedValue and only ever surfaced masked.

enum IdentityVerificationStatus {
  UNVERIFIED
  VERIFICATION_PENDING
  VERIFIED
  VERIFICATION_FAILED
  REQUIRES_MANUAL_REVIEW
  SUSPENDED
}

model IdentityProfile {
  id                   String                      @id @db.VarChar(64)
  userId               String                      @unique @map("user_id") @db.VarChar(64)
  verificationStatus   IdentityVerificationStatus  @default(UNVERIFIED) @map("verification_status")
  providerId           String?                     @map("provider_id") @db.VarChar(64)
  verifiedAt           DateTime?                   @map("verified_at")
  legalName            String?                     @map("legal_name") @db.VarChar(160)
  dateOfBirth          DateTime?                   @map("date_of_birth")
  gender               Gender?
  nationality          String?                     @db.VarChar(80)
  stateOfOrigin        String?                     @map("state_of_origin") @db.VarChar(80)
  lga                  String?                     @db.VarChar(80)
  createdAt            DateTime                    @default(now()) @map("created_at")
  updatedAt            DateTime                    @updatedAt @map("updated_at")

  user                 User                        @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider             IdentityProvider?           @relation("ProfileProvider", fields: [providerId], references: [id], onDelete: SetNull)
  credentials          IdentityCredential[]

  @@map("identity_profiles")
}

model IdentityProvider {
  id        String   @id @db.VarChar(64)
  code      String   @unique @db.VarChar(40)
  name      String   @db.VarChar(120)
  isMock    Boolean  @default(false) @map("is_mock")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  profiles             IdentityProfile[]
  verifications        IdentityVerification[]
  verificationAttempts IdentityVerificationAttempt[]

  @@map("identity_providers")
}

model IdentityCredential {
  id             String   @id @db.VarChar(64)
  userId         String   @map("user_id") @db.VarChar(64)
  profileId      String   @map("profile_id") @db.VarChar(64)
  kind           String   @default("NIN") @db.VarChar(20)
  maskedValue    String   @map("masked_value") @db.VarChar(20)
  encryptedValue String   @map("encrypted_value") @db.Text
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  profile IdentityProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([userId, kind])
  @@index([profileId])
  @@map("identity_credentials")
}

enum IdentityVerificationAttemptResult {
  SUCCESS
  FAILED
  REQUIRES_REVIEW
  UNAVAILABLE
}

model IdentityVerification {
  id         String   @id @db.VarChar(64)
  userId     String   @map("user_id") @db.VarChar(64)
  providerId String   @map("provider_id") @db.VarChar(64)
  reference  String   @unique @db.VarChar(120)
  verifiedAt DateTime @default(now()) @map("verified_at")
  createdAt  DateTime @default(now()) @map("created_at")

  user     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider IdentityProvider @relation(fields: [providerId], references: [id], onDelete: Restrict)

  @@index([userId])
  @@map("identity_verifications")
}

model IdentityVerificationAttempt {
  id         String                            @id @db.VarChar(64)
  userId     String                            @map("user_id") @db.VarChar(64)
  providerId String                            @map("provider_id") @db.VarChar(64)
  result     IdentityVerificationAttemptResult
  reasonCode String?                           @map("reason_code") @db.VarChar(80)
  reference  String?                           @db.VarChar(120)
  createdAt  DateTime                          @default(now()) @map("created_at")

  user     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider IdentityProvider @relation(fields: [providerId], references: [id], onDelete: Restrict)

  @@index([userId])
  @@index([createdAt])
  @@map("identity_verification_attempts")
}
```

- [ ] **Step 2: Add provider seeding to `prisma/seed.ts`**

Add a `providers` array before `async function main()`:

```typescript
const providers: Array<{
  code: string;
  name: string;
  isMock: boolean;
  isActive: boolean;
}> = [
  {
    code: "MOCK_NIN",
    name: "Demo NIN provider (mock)",
    isMock: true,
    isActive: true,
  },
];
```

Inside `main()`, after the role loop, add:

```typescript
  console.log("Seeding identity providers...");

  for (const provider of providers) {
    await prisma.identityProvider.upsert({
      where: { code: provider.code },
      update: {
        name: provider.name,
        isMock: provider.isMock,
        isActive: provider.isActive,
      },
      create: {
        id: generateId("ipr"),
        code: provider.code,
        name: provider.name,
        isMock: provider.isMock,
        isActive: provider.isActive,
      },
    });
  }
```

- [ ] **Step 3: Generate the client and migration**

```bash
npm run db:generate
npm run db:migrate -- --name identity_phase2
```

Inspect the generated SQL in `prisma/migrations/*_identity_phase2/migration.sql`. Expected: `ALTER TYPE "IdentityVerificationStatus" RENAME VALUE 'PENDING' TO 'VERIFICATION_PENDING'` (and `REJECTED` → `VERIFICATION_FAILED`), `ADD VALUE` for the two new enum members, ALTER TABLE on `identity_profiles`, and CREATE TABLE for the four new tables. If Prisma instead creates a brand-new enum type with a `USING` cast, that is also acceptable (no rows use `PENDING`/`REJECTED` in any environment).

- [ ] **Step 4: Apply migration and seed to the test database**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma db seed
```

Expected: migration applies; seed reports roles + identity providers ready.

- [ ] **Step 5: Verify dev database state**

Run: `npm run db:seed`
Expected: seed reports roles + identity providers ready.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations
git commit -m "feat(identity): add identity tables and mock provider seed"
```

---

### Task 3: NIN masking + encryption (TDD)

**Files:**
- Create: `modules/identity/mask.ts`
- Create: `server/encryption.ts`
- Create: `tests/identity-mask.test.ts`
- Create: `tests/identity-encryption.test.ts`

**Interfaces:**
- Produces `maskNin(nin: string): string` — returns `********<last4>`.
- Produces `encryptSensitive(plaintext: string): string` and `decryptSensitive(payload: string): string` — AES-256-GCM, payload format `v1:<iv b64>:<tag b64>:<ciphertext b64>`, key derived via `sha256(env.IDENTITY_ENCRYPTION_KEY)`.
- Consumes: `env.IDENTITY_ENCRYPTION_KEY` (Task 1).

- [ ] **Step 1: Write the failing tests**

`tests/identity-mask.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { maskNin } from "@/modules/identity/mask";

describe("maskNin", () => {
  it("masks all but the last four digits", () => {
    expect(maskNin("12345678901")).toBe("********8901");
  });

  it("strips non-digits before masking", () => {
    expect(maskNin("1234-5678-901")).toBe("********8901");
  });

  it("returns a fully masked string for short inputs", () => {
    expect(maskNin("123")).toBe("********");
    expect(maskNin("")).toBe("********");
  });

  it("never returns the raw NIN", () => {
    const nin = "98765432109";
    expect(maskNin(nin)).not.toContain(nin);
  });
});
```

`tests/identity-encryption.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  decryptSensitive,
  encryptSensitive,
} from "@/server/encryption";

describe("sensitive encryption", () => {
  it("round-trips a value", () => {
    const payload = encryptSensitive("12345678901");
    expect(decryptSensitive(payload)).toBe("12345678901");
  });

  it("does not store plaintext", () => {
    const payload = encryptSensitive("12345678901");
    expect(payload).not.toContain("12345678901");
  });

  it("produces a different ciphertext per call (fresh IV)", () => {
    const a = encryptSensitive("12345678901");
    const b = encryptSensitive("12345678901");
    expect(a).not.toBe(b);
    expect(decryptSensitive(a)).toBe(decryptSensitive(b));
  });

  it("rejects a tampered payload", () => {
    const payload = encryptSensitive("12345678901");
    const parts = payload.split(":");
    const flipped = parts[3].endsWith("=")
      ? `${parts.slice(0, 3).join(":")}:${parts[3].slice(0, -1)}==`
      : `${parts.slice(0, 3).join(":")}:${parts[3]}A`;
    expect(() => decryptSensitive(flipped)).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decryptSensitive("not-a-payload")).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/identity-mask.test.ts tests/identity-encryption.test.ts`
Expected: FAIL — modules do not exist yet.

- [ ] **Step 3: Write `modules/identity/mask.ts`**

```typescript
/**
 * Mask a NIN for display. Only the last four digits are ever shown.
 */
export function maskNin(nin: string): string {
  const digits = nin.replace(/\D/g, "");
  if (digits.length < 4) return "********";
  return `********${digits.slice(-4)}`;
}
```

- [ ] **Step 4: Write `server/encryption.ts`**

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/identity-mask.test.ts tests/identity-encryption.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add modules/identity/mask.ts server/encryption.ts tests/identity-mask.test.ts tests/identity-encryption.test.ts
git commit -m "feat(identity): add NIN masking and field-level encryption"
```

---

### Task 4: RBAC permissions for identity (TDD)

**Files:**
- Modify: `server/rbac.ts`
- Modify: `tests/rbac.test.ts`

**Interfaces:**
- Produces `PERMISSIONS.IDENTITY_READ_MASKED = "identity:read:masked"`, `PERMISSIONS.IDENTITY_READ_FULL = "identity:read:full"`.
- USER/PROFESSIONAL gain `IDENTITY_VERIFY` + `IDENTITY_READ_MASKED`; IDENTITY_ADMIN and SUPER_ADMIN gain `IDENTITY_READ_FULL`.
- Consumed by `modules/identity/service.ts`.

- [ ] **Step 1: Extend the failing test in `tests/rbac.test.ts`**

Add a new `it` block:

```typescript
  it("gates identity reads by scope", () => {
    expect(roleHasPermission("USER", PERMISSIONS.IDENTITY_VERIFY)).toBe(true);
    expect(roleHasPermission("USER", PERMISSIONS.IDENTITY_READ_MASKED)).toBe(true);
    expect(roleHasPermission("USER", PERMISSIONS.IDENTITY_READ_FULL)).toBe(false);
    expect(roleHasPermission("PROFESSIONAL", PERMISSIONS.IDENTITY_READ_MASKED)).toBe(true);
    expect(roleHasPermission("IDENTITY_ADMIN", PERMISSIONS.IDENTITY_READ_MASKED)).toBe(true);
    expect(roleHasPermission("IDENTITY_ADMIN", PERMISSIONS.IDENTITY_READ_FULL)).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", PERMISSIONS.IDENTITY_READ_FULL)).toBe(true);
    expect(roleHasPermission("SERVICE_ADMIN", PERMISSIONS.IDENTITY_READ_FULL)).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify the new case fails**

Run: `npx vitest run tests/rbac.test.ts`
Expected: FAIL — `IDENTITY_READ_MASKED` / `IDENTITY_READ_FULL` are not on `PERMISSIONS`.

- [ ] **Step 3: Update `server/rbac.ts`**

Add to `PERMISSIONS` (after `IDENTITY_VERIFY`):

```typescript
  IDENTITY_READ_MASKED: "identity:read:masked",
  IDENTITY_READ_FULL: "identity:read:full",
```

Add to `ROLE_PERMISSIONS.USER` and `ROLE_PERMISSIONS.PROFESSIONAL`:

```typescript
    PERMISSIONS.IDENTITY_VERIFY,
    PERMISSIONS.IDENTITY_READ_MASKED,
```

Add to `ROLE_PERMISSIONS.IDENTITY_ADMIN`:

```typescript
    PERMISSIONS.IDENTITY_READ_MASKED,
    PERMISSIONS.IDENTITY_READ_FULL,
```

Add to `SUPER_ADMIN_OVERRIDES`:

```typescript
  PERMISSIONS.IDENTITY_READ_MASKED,
  PERMISSIONS.IDENTITY_READ_FULL,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/rbac.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/rbac.ts tests/rbac.test.ts
git commit -m "feat(identity): scope identity read permissions in RBAC"
```

---

### Task 5: Identity validators (TDD)

**Files:**
- Create: `modules/identity/validators.ts`
- Create: `tests/identity-validators.test.ts`

**Interfaces:**
- Produces `ninSchema`, `identityVerifySchema`, `type IdentityVerifyInput = { nin: string; consent: boolean }`.
- Consumed by `modules/identity/service.ts`.

- [ ] **Step 1: Write the failing test**

`tests/identity-validators.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { identityVerifySchema, ninSchema } from "@/modules/identity/validators";

describe("identity validators", () => {
  it("accepts an 11-digit NIN", () => {
    expect(ninSchema.safeParse("12345678901").success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const parsed = ninSchema.safeParse(" 12345678901 ");
    expect(parsed.success).toBe(true);
    expect(parsed.data).toBe("12345678901");
  });

  it("rejects non-11-digit NINs", () => {
    expect(ninSchema.safeParse("12345").success).toBe(false);
    expect(ninSchema.safeParse("123456789012").success).toBe(false);
    expect(ninSchema.safeParse("1234567890a").success).toBe(false);
    expect(ninSchema.safeParse("").success).toBe(false);
  });

  it("requires consent to verify", () => {
    const base = { nin: "12345678901", consent: true };
    expect(identityVerifySchema.safeParse(base).success).toBe(true);
    const noConsent = identityVerifySchema.safeParse({ ...base, consent: false });
    expect(noConsent.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/identity-validators.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `modules/identity/validators.ts`**

```typescript
import { z } from "zod";

export const ninSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "Enter the 11-digit NIN printed on your NIN slip");

export const identityVerifySchema = z
  .object({
    nin: ninSchema,
    consent: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.consent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consent"],
        message: "You must consent to identity verification to continue",
      });
    }
  });

export type IdentityVerifyInput = z.infer<typeof identityVerifySchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/identity-validators.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/identity/validators.ts tests/identity-validators.test.ts
git commit -m "feat(identity): add NIN and consent validators"
```

---

### Task 6: Mock NIN provider (TDD)

**Files:**
- Create: `modules/identity/providers/types.ts`
- Create: `modules/identity/providers/demo-identities.ts`
- Create: `modules/identity/providers/mock-nin.ts`
- Create: `modules/identity/providers/index.ts`
- Create: `tests/mock-nin-provider.test.ts`

**Interfaces:**
- Produces `IdentityProviderAdapter` interface, `ProviderResult` union, `MockNINVerificationProvider`, `getProviderAdapter(code)`, `DEMO_IDENTITIES`, `DEMO_NINS`, `DEMO_REVIEW_NIN`, `DEMO_UNAVAILABLE_NIN`.
- Consumed by `modules/identity/service.ts` (verifyIdentity) and `modules/identity/components/identity-verification-form.tsx` (client-safe `demo-identities.ts` only).

- [ ] **Step 1: Write the failing test**

`tests/mock-nin-provider.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  DEMO_IDENTITIES,
  DEMO_REVIEW_NIN,
  DEMO_UNAVAILABLE_NIN,
  MockNINVerificationProvider,
} from "@/modules/identity/providers";

describe("MockNINVerificationProvider", () => {
  it("succeeds only for seeded demo identities", async () => {
    for (const demo of DEMO_IDENTITIES) {
      const result = await MockNINVerificationProvider.verifyIdentity({
        nin: demo.nin,
      });
      expect(result.result).toBe("SUCCESS");
      if (result.result === "SUCCESS") {
        expect(result.identity.legalName).toBe(demo.legalName);
        expect(result.identity.stateOfOrigin).toBe(demo.stateOfOrigin);
        expect(result.identity.lga).toBe(demo.lga);
        expect(result.identity.nationality).toBe("Nigerian");
      }
    }
  });

  it("never accepts an arbitrary real-looking NIN", async () => {
    const candidates = ["98765432109", "11223344556", "00000000007", "00000000008"];
    for (const nin of candidates) {
      const result = await MockNINVerificationProvider.verifyIdentity({ nin });
      expect(result.result).toBe("FAILED");
      if (result.result === "FAILED") {
        expect(result.reasonCode).toBe("IDENTITY_NOT_FOUND");
      }
    }
  });

  it("returns REQUIRES_REVIEW for the reserved review NIN", async () => {
    const result = await MockNINVerificationProvider.verifyIdentity({
      nin: DEMO_REVIEW_NIN,
    });
    expect(result.result).toBe("REQUIRES_REVIEW");
  });

  it("returns UNAVAILABLE for the reserved unavailable NIN", async () => {
    const result = await MockNINVerificationProvider.verifyIdentity({
      nin: DEMO_UNAVAILABLE_NIN,
    });
    expect(result.result).toBe("UNAVAILABLE");
  });

  it("exposes a stable code and the mock flag", () => {
    expect(MockNINVerificationProvider.code).toBe("MOCK_NIN");
    expect(MockNINVerificationProvider.isMock).toBe(true);
  });

  it("resolves the adapter by code", async () => {
    const { getProviderAdapter } = await import("@/modules/identity/providers");
    expect(getProviderAdapter("MOCK_NIN")).toBe(MockNINVerificationProvider);
    expect(getProviderAdapter("NIMC")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/mock-nin-provider.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `modules/identity/providers/types.ts`**

```typescript
export type ProviderResult =
  | {
      result: "SUCCESS";
      reference: string;
      identity: {
        legalName: string;
        dateOfBirth: string; // ISO date (yyyy-mm-dd)
        gender: "MALE" | "FEMALE";
        nationality: string;
        stateOfOrigin: string;
        lga: string;
      };
    }
  | {
      result: "FAILED";
      reference: string;
      reasonCode: "IDENTITY_NOT_FOUND";
    }
  | {
      result: "REQUIRES_REVIEW";
      reference: string;
      reasonCode: "MANUAL_REVIEW_REQUIRED";
    }
  | {
      result: "UNAVAILABLE";
      reference: string;
      reasonCode: "SERVICE_UNAVAILABLE";
    };

export interface IdentityProviderAdapter {
  readonly code: string;
  readonly name: string;
  readonly isMock: boolean;
  verifyIdentity(input: { nin: string }): Promise<ProviderResult>;
}
```

- [ ] **Step 4: Write `modules/identity/providers/demo-identities.ts`**

```typescript
/**
 * FICTIONAL demo identities used ONLY by the mock provider.
 *
 * These NINs and people DO NOT EXIST. The data is clearly labelled DEMO DATA
 * everywhere it appears. The mock provider accepts exactly these NINs (plus
 * two reserved codes below); any other NIN — including a real person's —
 * always fails verification.
 */

export interface DemoIdentity {
  nin: string;
  legalName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  nationality: string;
  stateOfOrigin: string;
  lga: string;
  note: string;
}

export const DEMO_IDENTITIES: DemoIdentity[] = [
  {
    nin: "00000000001",
    legalName: "Adaeze Ngozi Okafor",
    dateOfBirth: "1990-04-12",
    gender: "FEMALE",
    nationality: "Nigerian",
    stateOfOrigin: "Anambra",
    lga: "Idemili North",
    note: "Demo identity A",
  },
  {
    nin: "00000000002",
    legalName: "Ibrahim Musa Bello",
    dateOfBirth: "1985-11-03",
    gender: "MALE",
    nationality: "Nigerian",
    stateOfOrigin: "Kano",
    lga: "Nassarawa",
    note: "Demo identity B",
  },
  {
    nin: "00000000003",
    legalName: "Chinedu Emmanuel Adeyemi",
    dateOfBirth: "1995-07-22",
    gender: "MALE",
    nationality: "Nigerian",
    stateOfOrigin: "Lagos",
    lga: "Alimosho",
    note: "Demo identity C",
  },
];

// Reserved codes used to exercise the non-success provider outcomes.
export const DEMO_REVIEW_NIN = "00000000009"; // → REQUIRES_REVIEW
export const DEMO_UNAVAILABLE_NIN = "00000000010"; // → UNAVAILABLE

export const DEMO_NINS = [
  ...DEMO_IDENTITIES.map((d) => d.nin),
  DEMO_REVIEW_NIN,
  DEMO_UNAVAILABLE_NIN,
];
```

- [ ] **Step 5: Write `modules/identity/providers/mock-nin.ts`**

```typescript
import { generateId } from "@/lib/id";
import {
  DEMO_IDENTITIES,
  DEMO_REVIEW_NIN,
  DEMO_UNAVAILABLE_NIN,
} from "./demo-identities";
import type { IdentityProviderAdapter, ProviderResult } from "./types";

/**
 * MOCK NIN verification provider — DEVELOPMENT ONLY.
 *
 * This provider NEVER contacts NIMC and NEVER performs a real NIN lookup.
 * It succeeds only for the fictional demo identities. Every other NIN
 * returns FAILED, so an arbitrary (possibly real) NIN is never accepted as
 * a successful verification.
 */
export const MockNINVerificationProvider: IdentityProviderAdapter = {
  code: "MOCK_NIN",
  name: "Demo NIN provider (mock)",
  isMock: true,

  async verifyIdentity(input: { nin: string }): Promise<ProviderResult> {
    const nin = input.nin.trim();
    const reference = generateId("mkn");

    if (nin === DEMO_UNAVAILABLE_NIN) {
      return {
        result: "UNAVAILABLE",
        reference,
        reasonCode: "SERVICE_UNAVAILABLE",
      };
    }
    if (nin === DEMO_REVIEW_NIN) {
      return {
        result: "REQUIRES_REVIEW",
        reference,
        reasonCode: "MANUAL_REVIEW_REQUIRED",
      };
    }

    const match = DEMO_IDENTITIES.find((demo) => demo.nin === nin);
    if (!match) {
      return { result: "FAILED", reference, reasonCode: "IDENTITY_NOT_FOUND" };
    }

    return {
      result: "SUCCESS",
      reference,
      identity: {
        legalName: match.legalName,
        dateOfBirth: match.dateOfBirth,
        gender: match.gender,
        nationality: match.nationality,
        stateOfOrigin: match.stateOfOrigin,
        lga: match.lga,
      },
    };
  },
};

const PROVIDER_BY_CODE: Record<string, IdentityProviderAdapter> = {
  [MockNINVerificationProvider.code]: MockNINVerificationProvider,
};

export function getProviderAdapter(
  code: string,
): IdentityProviderAdapter | null {
  return PROVIDER_BY_CODE[code] ?? null;
}
```

- [ ] **Step 6: Write `modules/identity/providers/index.ts`**

```typescript
export { MockNINVerificationProvider, getProviderAdapter } from "./mock-nin";
export {
  DEMO_IDENTITIES,
  DEMO_NINS,
  DEMO_REVIEW_NIN,
  DEMO_UNAVAILABLE_NIN,
  type DemoIdentity,
} from "./demo-identities";
export type { IdentityProviderAdapter, ProviderResult } from "./types";
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/mock-nin-provider.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 8: Commit**

```bash
git add modules/identity/providers tests/mock-nin-provider.test.ts
git commit -m "feat(identity): add mock NIN verification provider"
```

---

### Task 7: Identity service, actions, integration flow (TDD)

**Files:**
- Create: `modules/identity/service.ts`
- Create: `modules/identity/actions.ts`
- Create: `modules/identity/types.ts`
- Create: `tests/identity-flow.test.ts`

**Interfaces:**
- Consumes: `maskNin`, `encryptSensitive`/`decryptSensitive` (Task 3), `PERMISSIONS.*` (Task 4), `identityVerifySchema` (Task 5), provider adapter + demo NINs (Task 6), `MOCK_NIN` provider row in DB (Task 2).
- Produces:
  - `getIdentityStatus(): Promise<{ status; verifiedAt; maskedNin; legalName }>` — dashboard; no audit.
  - `getIdentityView(): Promise<IdentityView>` — full masked view for profile/identity; logs `identity.accessed`.
  - `verifyIdentity(input): Promise<VerifyIdentityResult>` — mock flow; logs `identity.verification_attempted` / `..._success` / `..._failed`.
  - `getRawNin(): Promise<string>` — requires `identity:read:full`; logs `identity.accessed` (scope full).
  - `verifyIdentityAction(input)` server action (wrapped with `withActionResult`).

- [ ] **Step 1: Write the failing integration test**

`tests/identity-flow.test.ts`:

```typescript
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const { cookieJar, headerStore } = vi.hoisted(() => {
  const cookieJar = new Map<string, { value: string }>();
  const headerStore = new Headers({ "user-agent": "vitest" });
  return { cookieJar, headerStore };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => headerStore,
}));

vi.mock("@/server/email", () => ({
  sendEmail: async () => {},
}));

import { db } from "@/server/db";
import * as auth from "@/modules/auth/service";
import * as identity from "@/modules/identity/service";
import { decryptSensitive } from "@/server/encryption";
import { maskNin } from "@/modules/identity/mask";
import { DEMO_IDENTITIES } from "@/modules/identity/providers";

const demo = DEMO_IDENTITIES[0];
const testEmail = `id_${Date.now()}@example.com`;
const password = "CivicOne2024!";
let userId: string;
const auditActions: string[] = [];

beforeAll(async () => {
  cookieJar.clear();
  headerStore.set("user-agent", "vitest");
  await db.identityProvider.upsert({
    where: { code: "MOCK_NIN" },
    update: { name: "Demo NIN provider (mock)", isMock: true, isActive: true },
    create: {
      id: `ipr_${Date.now()}`,
      code: "MOCK_NIN",
      name: "Demo NIN provider (mock)",
      isMock: true,
      isActive: true,
    },
  });
});

afterAll(async () => {
  if (userId) {
    await db.auditLog.deleteMany({ where: { actorId: userId } }).catch(() => {});
    await db.user.delete({ where: { id: userId } }).catch(() => {});
  }
  await db.$disconnect();
});

describe("identity verification flow (real database)", () => {
  it("registers an account with UNVERIFIED identity", async () => {
    const result = await auth.register({
      identifier: testEmail,
      password,
      confirmPassword: password,
      agreeTerms: true,
    });
    userId = result.userId;

    const status = await identity.getIdentityStatus();
    expect(status.status).toBe("UNVERIFIED");
    expect(status.maskedNin).toBeNull();
  });

  it("requires explicit consent", async () => {
    await expect(
      identity.verifyIdentity({ nin: demo.nin, consent: false }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects an unknown NIN and records a failed attempt", async () => {
    const result = await identity.verifyIdentity({
      nin: "99999999999",
      consent: true,
    });
    expect(result.status).toBe("VERIFICATION_FAILED");
    expect(result.reason).toBeTruthy();

    const attempt = await db.identityVerificationAttempt.findFirst({
      where: { userId, result: "FAILED" },
    });
    expect(attempt).toBeTruthy();
    expect(attempt?.reasonCode).toBe("IDENTITY_NOT_FOUND");
    auditActions.push("identity.verification_failed");

    const view = await identity.getIdentityView();
    expect(view.status).toBe("VERIFICATION_FAILED");
    expect(view.maskedNin).toBeNull();
  });

  it("passes mock verification with a demo NIN", async () => {
    const result = await identity.verifyIdentity({ nin: demo.nin, consent: true });
    expect(result.status).toBe("VERIFIED");
    expect(result.maskedNin).toBe(maskNin(demo.nin));
    expect(result.legalName).toBe(demo.legalName);

    const view = await identity.getIdentityView();
    expect(view.status).toBe("VERIFIED");
    expect(view.maskedNin).toBe(maskNin(demo.nin));
    expect(view.identity.legalName).toBe(demo.legalName);
    expect(view.identity.stateOfOrigin).toBe(demo.stateOfOrigin);
    expect(view.identity.lga).toBe(demo.lga);
    expect(view.providerName).toBeTruthy();
    expect(view.lastAttempt?.result).toBe("SUCCESS");
    auditActions.push("identity.verification_success");
  });

  it("stores the NIN encrypted, never in plaintext", async () => {
    const credential = await db.identityCredential.findUnique({
      where: { userId_kind: { userId, kind: "NIN" } },
    });
    expect(credential).toBeTruthy();
    expect(credential?.encryptedValue).not.toContain(demo.nin);
    expect(credential?.maskedValue).toBe(maskNin(demo.nin));
    expect(decryptSensitive(credential!.encryptedValue)).toBe(demo.nin);
  });

  it("creates a verification record", async () => {
    const verification = await db.identityVerification.findFirst({
      where: { userId },
      include: { provider: true },
    });
    expect(verification).toBeTruthy();
    expect(verification?.provider.code).toBe("MOCK_NIN");
    expect(verification?.reference).toBeTruthy();
  });

  it("records audit events without leaking the raw NIN", async () => {
    const logs = await db.auditLog.findMany({
      where: { actorId: userId, action: { in: auditActions } },
    });
    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
      const serialized = JSON.stringify(log.metadata ?? {});
      expect(serialized).not.toContain(demo.nin);
    }
  });

  it("blocks raw NIN access for a plain user", async () => {
    await expect(identity.getRawNin()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("requires authentication for verification", async () => {
    await auth.logout();
    await expect(
      identity.verifyIdentity({ nin: demo.nin, consent: true }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/identity-flow.test.ts`
Expected: FAIL — `@/modules/identity/service` does not exist.

- [ ] **Step 3: Write `modules/identity/service.ts`**

```typescript
import "server-only";
import type { IdentityVerificationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, toFieldErrors, validationError } from "@/server/errors";
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { logAudit } from "@/server/audit";
import { getRequestContext } from "@/server/request";
import { rateLimit } from "@/server/rate-limit";
import { generateId } from "@/lib/id";
import { decryptSensitive, encryptSensitive } from "@/server/encryption";
import { identityVerifySchema } from "./validators";
import { maskNin } from "./mask";
import { getProviderAdapter } from "./providers";

export type IdentityStatus = IdentityVerificationStatus;

export interface IdentityView {
  status: IdentityStatus;
  verifiedAt: Date | null;
  providerName: string | null;
  lastAttempt: { result: string; reasonCode: string | null; createdAt: Date } | null;
  identity: {
    legalName: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    nationality: string | null;
    stateOfOrigin: string | null;
    lga: string | null;
  };
  maskedNin: string | null;
}

export interface IdentityStatusView {
  status: IdentityStatus;
  verifiedAt: Date | null;
  maskedNin: string | null;
  legalName: string | null;
}

export interface VerifyIdentityResult {
  status: IdentityStatus;
  maskedNin?: string;
  legalName?: string;
  reason?: string;
}

const REASONS: Record<string, string> = {
  IDENTITY_NOT_FOUND:
    "We could not find an identity matching that NIN. Check the number and try again.",
  MANUAL_REVIEW_REQUIRED:
    "Your verification requires manual review. We will update your status shortly.",
  SERVICE_UNAVAILABLE:
    "Identity verification is temporarily unavailable. Please try again later.",
};

async function findProvider() {
  const record = await db.identityProvider.findUnique({
    where: { code: "MOCK_NIN" },
  });
  if (!record || !record.isActive) return null;
  const adapter = getProviderAdapter(record.code);
  if (!adapter) return null;
  return { record, adapter };
}

export async function getIdentityStatus(): Promise<IdentityStatusView> {
  const user = await requireUser();
  const profile = await db.identityProfile.findUnique({ where: { userId: user.id } });
  const credential = await db.identityCredential.findUnique({
    where: { userId_kind: { userId: user.id, kind: "NIN" } },
    select: { maskedValue: true },
  });
  return {
    status: profile?.verificationStatus ?? "UNVERIFIED",
    verifiedAt: profile?.verifiedAt ?? null,
    maskedNin: credential?.maskedValue ?? null,
    legalName: profile?.legalName ?? null,
  };
}

export async function getIdentityView(): Promise<IdentityView> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.IDENTITY_READ_MASKED);

  const [profile, credential, verification, lastAttempt] = await Promise.all([
    db.identityProfile.findUnique({ where: { userId: user.id } }),
    db.identityCredential.findUnique({
      where: { userId_kind: { userId: user.id, kind: "NIN" } },
    }),
    db.identityVerification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { provider: true },
    }),
    db.identityVerificationAttempt.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  await logAudit({
    actorId: user.id,
    action: "identity.accessed",
    resourceType: "identity",
    resourceId: user.id,
    metadata: { scope: "masked" },
  });

  return {
    status: profile?.verificationStatus ?? "UNVERIFIED",
    verifiedAt: profile?.verifiedAt ?? null,
    providerName: verification?.provider.name ?? null,
    lastAttempt: lastAttempt
      ? {
          result: lastAttempt.result,
          reasonCode: lastAttempt.reasonCode,
          createdAt: lastAttempt.createdAt,
        }
      : null,
    identity: {
      legalName: profile?.legalName ?? null,
      dateOfBirth: profile?.dateOfBirth ?? null,
      gender: profile?.gender ?? null,
      nationality: profile?.nationality ?? null,
      stateOfOrigin: profile?.stateOfOrigin ?? null,
      lga: profile?.lga ?? null,
    },
    maskedNin: credential?.maskedValue ?? null,
  };
}

export async function verifyIdentity(input: unknown): Promise<VerifyIdentityResult> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.IDENTITY_VERIFY);

  const parsed = identityVerifySchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }
  const { nin } = parsed.data;

  const ctx = await getRequestContext();
  const limit = await rateLimit(`identity:verify:${user.id}`, {
    max: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) {
    throw new AppError("Too many verification attempts. Please try again later.", {
      code: "RATE_LIMITED",
    });
  }

  const profile = await db.identityProfile.findUnique({ where: { userId: user.id } });
  const current = profile?.verificationStatus ?? "UNVERIFIED";
  if (current === "SUSPENDED") {
    throw new AppError("Your identity has been suspended. Please contact support.", {
      code: "FORBIDDEN",
    });
  }
  if (current === "REQUIRES_MANUAL_REVIEW" || current === "VERIFICATION_PENDING") {
    throw new AppError(
      "Your identity verification is already being processed.",
      { code: "FORBIDDEN" },
    );
  }
  if (current === "VERIFIED") {
    const existing = await db.identityCredential.findUnique({
      where: { userId_kind: { userId: user.id, kind: "NIN" } },
      select: { maskedValue: true },
    });
    return { status: "VERIFIED", maskedNin: existing?.maskedValue };
  }

  const provider = await findProvider();
  if (!provider) {
    throw new AppError("Identity verification is temporarily unavailable.", {
      code: "INTERNAL",
    });
  }

  const attemptId = generateId("iva");
  await logAudit({
    actorId: user.id,
    action: "identity.verification_attempted",
    resourceType: "identity",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { provider: provider.record.code, attemptId },
  });

  const result = await provider.adapter.verifyIdentity({ nin });

  await db.identityVerificationAttempt.create({
    data: {
      id: attemptId,
      userId: user.id,
      providerId: provider.record.id,
      result: result.result,
      reasonCode: "reasonCode" in result ? result.reasonCode : null,
      reference: result.reference,
    },
  });

  if (result.result === "SUCCESS") {
    const identity = result.identity;
    const dateOfBirth = new Date(identity.dateOfBirth);
    const maskedNin = maskNin(nin);
    const encryptedNin = encryptSensitive(nin);

    await db.$transaction(async (tx) => {
      const upserted = await tx.identityProfile.upsert({
        where: { userId: user.id },
        create: {
          id: generateId("idp"),
          userId: user.id,
          verificationStatus: "VERIFIED",
          providerId: provider.record.id,
          verifiedAt: new Date(),
          legalName: identity.legalName,
          dateOfBirth,
          gender: identity.gender,
          nationality: identity.nationality,
          stateOfOrigin: identity.stateOfOrigin,
          lga: identity.lga,
        },
        update: {
          verificationStatus: "VERIFIED",
          providerId: provider.record.id,
          verifiedAt: new Date(),
          legalName: identity.legalName,
          dateOfBirth,
          gender: identity.gender,
          nationality: identity.nationality,
          stateOfOrigin: identity.stateOfOrigin,
          lga: identity.lga,
        },
      });

      await tx.identityCredential.upsert({
        where: { userId_kind: { userId: user.id, kind: "NIN" } },
        create: {
          id: generateId("idc"),
          userId: user.id,
          profileId: upserted.id,
          kind: "NIN",
          maskedValue: maskedNin,
          encryptedValue: encryptedNin,
        },
        update: {
          profileId: upserted.id,
          maskedValue: maskedNin,
          encryptedValue: encryptedNin,
        },
      });

      await tx.identityVerification.create({
        data: {
          id: generateId("idv"),
          userId: user.id,
          providerId: provider.record.id,
          reference: result.reference,
          verifiedAt: new Date(),
        },
      });

      await tx.user.update({ where: { id: user.id }, data: { status: "VERIFIED" } });
    });

    await logAudit({
      actorId: user.id,
      action: "identity.verification_success",
      resourceType: "identity",
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { provider: provider.record.code, attemptId, maskedNin },
    });

    await logAudit({
      actorId: user.id,
      action: "identity.updated",
      resourceType: "identity",
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { status: "VERIFIED", attemptId },
    });

    return { status: "VERIFIED", maskedNin, legalName: identity.legalName };
  }

  const target: IdentityStatus =
    result.result === "REQUIRES_REVIEW"
      ? "REQUIRES_MANUAL_REVIEW"
      : result.result === "FAILED"
        ? "VERIFICATION_FAILED"
        : current;

  if (target !== current) {
    await db.identityProfile.updateMany({
      where: {
        userId: user.id,
        verificationStatus: { in: ["UNVERIFIED", "VERIFICATION_FAILED"] },
      },
      data: { verificationStatus: target },
    });

    await logAudit({
      actorId: user.id,
      action: "identity.updated",
      resourceType: "identity",
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { status: target, attemptId },
    });
  }

  await logAudit({
    actorId: user.id,
    action: "identity.verification_failed",
    resourceType: "identity",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { provider: provider.record.code, result: result.result, attemptId },
  });

  return {
    status: target,
    reason:
      result.result === "FAILED"
        ? REASONS.IDENTITY_NOT_FOUND
        : result.result === "REQUIRES_REVIEW"
          ? REASONS.MANUAL_REVIEW_REQUIRED
          : REASONS.SERVICE_UNAVAILABLE,
  };
}

export async function getRawNin(): Promise<string> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.IDENTITY_READ_FULL);
  const credential = await db.identityCredential.findUnique({
    where: { userId_kind: { userId: user.id, kind: "NIN" } },
    select: { encryptedValue: true },
  });
  if (!credential) {
    throw new AppError("No NIN credential found.", { code: "NOT_FOUND" });
  }
  await logAudit({
    actorId: user.id,
    action: "identity.accessed",
    resourceType: "identity",
    resourceId: user.id,
    metadata: { scope: "full" },
  });
  return decryptSensitive(credential.encryptedValue);
}
```

- [ ] **Step 4: Write `modules/identity/actions.ts`**

```typescript
"use server";

import { withActionResult } from "@/server/errors";
import { verifyIdentity } from "./service";

export async function verifyIdentityAction(input: unknown) {
  return withActionResult(() => verifyIdentity(input));
}
```

- [ ] **Step 5: Write `modules/identity/types.ts`**

```typescript
export type { IdentityVerifyInput } from "./validators";
export type {
  IdentityStatus,
  IdentityStatusView,
  IdentityView,
  VerifyIdentityResult,
} from "./service";
export { verifyIdentityAction } from "./actions";
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/identity-flow.test.ts`
Expected: PASS (9 tests). If a test fails because the test DB has not been migrated/seeded, run:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma db seed
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: all tests pass (existing 53 + new identity tests).

- [ ] **Step 8: Commit**

```bash
git add modules/identity/service.ts modules/identity/actions.ts modules/identity/types.ts tests/identity-flow.test.ts
git commit -m "feat(identity): add verification service, actions and audit trail"
```

---

### Task 8: `/identity/verify` page + verification form

**Files:**
- Modify: `app/(app)/identity/verify/page.tsx`
- Create: `modules/identity/components/identity-verification-form.tsx`
- Create: `modules/identity/components/privacy-explainer.tsx`
- Create: `modules/identity/components/verified-card.tsx`
- Modify: `modules/identity/README.md`

**Interfaces:**
- Consumes: `getIdentityStatus` (Task 7), `verifyIdentityAction` (Task 7), `DEMO_IDENTITIES` (Task 6, client-safe).

- [ ] **Step 1: Write `modules/identity/components/privacy-explainer.tsx`**

```tsx
import { Database, EyeOff, Lock, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  {
    icon: Database,
    title: "What is stored",
    body: "Your verified identity details (legal name, date of birth, gender, nationality, state and LGA) and an encrypted record of your NIN.",
  },
  {
    icon: Share2,
    title: "Why it is stored",
    body: "So your CivicOne account is connected to a confirmed identity and can be reused across eligible public services with your consent.",
  },
  {
    icon: EyeOff,
    title: "Who can access it",
    body: "Only you, through your account. CivicOne never displays your full NIN and never shares your identity without your explicit consent.",
  },
  {
    icon: Lock,
    title: "How it is protected",
    body: "Your NIN is encrypted at rest and never used as an identifier. Access to identity data is authorised and recorded in an audit trail.",
  },
];

export function PrivacyExplainer() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        Your identity data
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <Card key={item.title}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2.5">
                <item.icon className="size-4 shrink-0 text-secondary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        CivicOne is an independent technology platform. It is not a government agency.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Write `modules/identity/components/verified-card.tsx`**

```tsx
import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export interface VerifiedCardProps {
  maskedNin: string | null;
  legalName: string | null;
  verifiedAt: Date | null;
}

export function VerifiedCard({ maskedNin, legalName, verifiedAt }: VerifiedCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-secondary/10 px-5 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <BadgeCheck className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Identity verified</h2>
            <p className="text-sm text-muted-foreground">
              Your identity is connected to your CivicOne account.
            </p>
          </div>
        </div>
      </div>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </dt>
            <dd className="mt-1">
              <StatusBadge status="VERIFIED" />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Legal name
            </dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {legalName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              NIN
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-foreground">
              {maskedNin ?? "********"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Verified on
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {verifiedAt
                ? verifiedAt.toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/profile/identity">View identity details</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Write `modules/identity/components/identity-verification-form.tsx`**

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, BadgeCheck, Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  identityVerifySchema,
  type IdentityVerifyInput,
} from "@/modules/identity/validators";
import { verifyIdentityAction } from "@/modules/identity/actions";
import { DEMO_IDENTITIES } from "@/modules/identity/providers/demo-identities";
import type { VerifyIdentityResult } from "@/modules/identity/service";

export function IdentityVerificationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [showNin, setShowNin] = React.useState(false);
  const [outcome, setOutcome] = React.useState<VerifyIdentityResult | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<IdentityVerifyInput>({
    resolver: zodResolver(identityVerifySchema),
    defaultValues: { nin: "", consent: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await verifyIdentityAction(values);
      if (!result.ok) {
        if (result.error?.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof IdentityVerifyInput, { message });
          }
        } else {
          toast.error(result.error?.message ?? "Unable to verify your identity.");
        }
        return;
      }
      setOutcome(result.data);
      if (result.data?.status === "VERIFIED") {
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  });

  if (outcome?.status === "VERIFIED") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-md border border-success/30 bg-success/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">Identity verified</p>
              <p className="text-sm text-muted-foreground">
                {outcome.legalName ?? "Your identity"} ·{" "}
                <span className="font-mono">{outcome.maskedNin ?? "********"}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/profile/identity">View identity details</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {outcome ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning/5 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {outcome.reason ??
              "We could not verify your identity with the details provided."}
          </p>
        </div>
      ) : null}

      <FormField
        label="NIN"
        htmlFor="nin"
        hint="11-digit National Identification Number printed on your NIN slip."
        error={errors.nin?.message}
        required
      >
        <div className="relative">
          <Input
            id="nin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            placeholder="00000000000"
            className="pr-10 font-mono tracking-wider"
            error={!!errors.nin}
            type={showNin ? "text" : "password"}
            {...register("nin")}
          />
          <button
            type="button"
            onClick={() => setShowNin((v) => !v)}
            aria-label={showNin ? "Hide NIN" : "Show NIN"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {showNin ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </FormField>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id="consent"
          aria-invalid={!!errors.consent}
          onCheckedChange={(checked) => setValue("consent", checked === true)}
        />
        <label htmlFor="consent" className="text-sm leading-5 text-muted-foreground">
          I consent to CivicOne checking my NIN against a trusted identity source to
          verify my identity. My NIN is encrypted and never shown in full.{" "}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Read the privacy policy
          </Link>
          .
        </label>
      </div>
      {errors.consent ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {errors.consent.message}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Verifying…
          </>
        ) : (
          <>
            <Fingerprint aria-hidden="true" />
            Verify identity
          </>
        )}
      </Button>

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-warning">
          Demo data
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          This is a demo environment. Use one of these fictional identities to pass
          verification — no real NIN is accepted.
        </p>
        <ul className="mt-3 space-y-2">
          {DEMO_IDENTITIES.map((demo) => (
            <li key={demo.nin}>
              <button
                type="button"
                onClick={() => setValue("nin", demo.nin, { shouldValidate: true })}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="font-medium text-foreground">{demo.legalName}</span>
                <span className="font-mono text-muted-foreground">{demo.nin}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Rewrite `app/(app)/identity/verify/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { getIdentityStatus } from "@/modules/identity/service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { IdentityVerificationForm } from "@/modules/identity/components/identity-verification-form";
import { PrivacyExplainer } from "@/modules/identity/components/privacy-explainer";
import { VerifiedCard } from "@/modules/identity/components/verified-card";

export const metadata: Metadata = {
  title: "Verify your identity",
};

export default async function IdentityVerifyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const status = await getIdentityStatus();

  if (status.status === "VERIFIED") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Verify your identity"
          description="Your verified identity is active on your account."
          breadcrumbs={[{ label: "Identity verification" }]}
          actions={
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft aria-hidden="true" />
                Back to dashboard
              </Link>
            </Button>
          }
        />
        <VerifiedCard
          maskedNin={status.maskedNin}
          legalName={status.legalName}
          verifiedAt={status.verifiedAt}
        />
        <PrivacyExplainer />
      </div>
    );
  }

  if (status.status === "SUSPENDED" || status.status === "REQUIRES_MANUAL_REVIEW") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Verify your identity"
          breadcrumbs={[{ label: "Identity verification" }]}
          actions={
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft aria-hidden="true" />
                Back to dashboard
              </Link>
            </Button>
          }
        />
        <Card>
          <CardContent className="space-y-3 p-5 sm:p-6">
            <StatusBadge status={status.status} />
            <p className="text-sm text-muted-foreground">
              {status.status === "SUSPENDED"
                ? "Your identity has been suspended. Please contact support for assistance."
                : "Your identity verification is under manual review. We will update your status as soon as it is reviewed."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify your identity"
        description="Confirm who you are to unlock services that require a verified identity."
        breadcrumbs={[{ label: "Identity verification" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-primary px-5 py-6 text-primary-foreground sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Fingerprint className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Verify your Nigerian identity</h2>
              <p className="text-sm text-primary-foreground/80">
                Your NIN helps us establish your identity and connect your CivicOne
                account to services you use.
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <IdentityVerificationForm />
        </CardContent>
      </Card>

      <PrivacyExplainer />
    </div>
  );
}
```

- [ ] **Step 5: Update `modules/identity/README.md`**

Replace the file contents with:

```markdown
# Identity module

Phase 2: mock NIN verification.

- Route: `/identity/verify` — verify your Nigerian identity using a demo NIN.
- Route: `/profile/identity` — identity status, verification history, masked NIN.
- DB: `IdentityProfile` (current status + verified fields), `IdentityCredential`
  (encrypted NIN), `IdentityVerification`, `IdentityVerificationAttempt`,
  `IdentityProvider`.
- Provider: `MockNINVerificationProvider` (mock). It NEVER contacts NIMC and
  only succeeds for the fictional demo identities in
  `providers/demo-identities.ts` (labelled DEMO DATA in the UI). Arbitrary
  real NINs always fail.
- NIN is encrypted at rest (AES-256-GCM via `server/encryption.ts`) and only
  ever displayed masked (`********1234`). Raw NIN access requires the
  `identity:read:full` permission.
- Security: identity access is RBAC-gated; every verification and identity
  access is recorded in the audit log (never the raw NIN).

## Phase 3+ (future)

- Authorised real identity providers (e.g. an official NIMC token endpoint)
- Manual review console for `REQUIRES_MANUAL_REVIEW`
- Identity re-verification and expiry
```

- [ ] **Step 6: Verify build + lint + tests**

Run: `npm run typecheck && npm run lint && npm test`
Expected: clean; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/identity/verify/page.tsx" modules/identity/components modules/identity/README.md
git commit -m "feat(identity): build NIN verification flow and privacy explainer"
```

---

### Task 9: `/profile/identity` page + profile Identity tab + navigation

**Files:**
- Create: `app/(app)/profile/identity/page.tsx`
- Create: `modules/identity/components/identity-summary.tsx`
- Modify: `app/(app)/profile/page.tsx`
- Modify: `lib/navigation.ts`

**Interfaces:**
- Consumes: `getIdentityView` (Task 7). `IdentitySummary` is a server component taking an `IdentityView` prop.

- [ ] **Step 1: Write `modules/identity/components/identity-summary.tsx`**

```tsx
import Link from "next/link";
import { ArrowRight, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { IdentityView } from "@/modules/identity/service";

const ATTEMPT_LABELS: Record<string, string> = {
  SUCCESS: "Successful",
  FAILED: "Failed",
  REQUIRES_REVIEW: "Review required",
  UNAVAILABLE: "Service unavailable",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

export function IdentitySummary({ view }: { view: IdentityView }) {
  const verified = view.status === "VERIFIED";

  if (!verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Identity verification</CardTitle>
          <CardDescription>
            Confirm your identity to unlock services that require a verified identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={view.status} />
            <span className="text-sm text-muted-foreground">
              {view.status === "VERIFICATION_FAILED"
                ? "Your last verification attempt did not match an identity."
                : view.status === "REQUIRES_MANUAL_REVIEW"
                  ? "Your verification is awaiting manual review."
                  : view.status === "SUSPENDED"
                    ? "Your identity has been suspended."
                    : "Your identity is not yet verified."}
            </span>
          </div>
          {view.status === "SUSPENDED" ? null : (
            <Button asChild>
              <Link href="/identity/verify">
                {view.status === "VERIFICATION_FAILED" ? "Try again" : "Verify my identity"}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Identity verification</CardTitle>
            <CardDescription>
              Information confirmed against a trusted identity source.
            </CardDescription>
          </div>
          <StatusBadge status="VERIFIED" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full legal name" value={view.identity.legalName} />
          <Field
            label="Date of birth"
            value={view.identity.dateOfBirth ? formatDate(view.identity.dateOfBirth) : null}
          />
          <Field label="Gender" value={view.identity.gender ?? null} />
          <Field label="Nationality" value={view.identity.nationality} />
          <Field label="State of origin" value={view.identity.stateOfOrigin} />
          <Field label="LGA" value={view.identity.lga} />
          <Field label="NIN (masked)" value={view.maskedNin ? <span className="font-mono">{view.maskedNin}</span> : null} />
        </dl>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">Verification history</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <Field label="Identity status" value={view.status} />
            <Field
              label="Verification date"
              value={view.verifiedAt ? formatDate(view.verifiedAt) : null}
            />
            <Field label="Verification provider" value={view.providerName} />
            <Field
              label="Last verification attempt"
              value={
                view.lastAttempt
                  ? `${ATTEMPT_LABELS[view.lastAttempt.result] ?? view.lastAttempt.result} · ${formatDate(view.lastAttempt.createdAt)}`
                  : null
              }
            />
          </dl>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/40 px-4 py-3">
          <Fingerprint className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Government-verified identity fields cannot be edited directly. To correct
            them, contact support.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `app/(app)/profile/identity/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { getIdentityView } from "@/modules/identity/service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { IdentitySummary } from "@/modules/identity/components/identity-summary";

export const metadata: Metadata = {
  title: "Identity",
};

export default async function ProfileIdentityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const view = await getIdentityView();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity"
        description="Your verified identity and verification history."
        breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Identity" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/profile">
              <ArrowLeft aria-hidden="true" />
              Back to profile
            </Link>
          </Button>
        }
      />
      <IdentitySummary view={view} />
    </div>
  );
}
```

- [ ] **Step 3: Add an Identity tab to `app/(app)/profile/page.tsx`**

Change the imports to add `getIdentityView` and `IdentitySummary`:

```tsx
import { getProfile } from "@/modules/users/service";
import { getIdentityView } from "@/modules/identity/service";
...
import { IdentitySummary } from "@/modules/identity/components/identity-summary";
```

Add a new tab trigger after the "Contact information" trigger:

```tsx
          <TabsTrigger value="identity">Identity</TabsTrigger>
```

Add a new `TabsContent` after the contact `TabsContent`:

```tsx
        <TabsContent value="identity" className="mt-4">
          <IdentitySummary view={await getIdentityView()} />
        </TabsContent>
```

- [ ] **Step 4: Add Identity to `lib/navigation.ts`**

Import `Fingerprint` from `lucide-react`, then add to `SECONDARY_NAV` after the Profile entry:

```typescript
  { label: "Identity", href: "/profile/identity", icon: Fingerprint },
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/profile/identity/page.tsx" "app/(app)/profile/page.tsx" modules/identity/components/identity-summary.tsx lib/navigation.ts
git commit -m "feat(identity): add identity profile page and navigation"
```

---

### Task 10: Dashboard identity card with real state

**Files:**
- Modify: `components/dashboard/identity-card.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getIdentityStatus` (Task 7). `IdentityCard` takes explicit props (presentational, server-safe).

- [ ] **Step 1: Rewrite `components/dashboard/identity-card.tsx`**

```tsx
import Link from "next/link";
import { ArrowRight, BadgeCheck, Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { IdentityStatusView } from "@/modules/identity/service";

export function IdentityCard({ status }: { status: IdentityStatusView }) {
  const verified = status.status === "VERIFIED";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={
              verified
                ? "flex size-10 items-center justify-center rounded-md bg-secondary/10 text-secondary"
                : "flex size-10 items-center justify-center rounded-md bg-primary/5 text-primary"
            }
          >
            {verified ? (
              <BadgeCheck className="size-5" aria-hidden="true" />
            ) : (
              <Fingerprint className="size-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {verified ? "Identity verified" : "Verify your identity"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {verified
                ? `Your identity is connected to your CivicOne account${status.maskedNin ? ` (${status.maskedNin})` : ""}.`
                : "Confirm who you are to access more services."}
            </p>
          </div>
        </div>
        <StatusBadge status={status.status} />
      </div>
      <CardContent className="space-y-4 p-5 pt-0">
        <p className="text-sm text-muted-foreground">
          {verified
            ? "Your verified identity is reused across eligible services with your consent."
            : status.status === "VERIFICATION_FAILED"
              ? "Your last verification attempt did not match an identity. You can try again."
              : status.status === "REQUIRES_MANUAL_REVIEW"
                ? "Your verification is awaiting manual review."
                : status.status === "SUSPENDED"
                  ? "Your identity has been suspended. Please contact support."
                  : "Verifying your identity unlocks services that require a confirmed identity."}
        </p>
        {status.status === "SUSPENDED" ? null : (
          <Button asChild variant={verified ? "outline" : "default"} className="w-full sm:w-auto">
            <Link href={verified ? "/profile/identity" : "/identity/verify"}>
              {verified ? (
                "View identity"
              ) : (
                <>
                  Verify my identity
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Update `app/(app)/dashboard/page.tsx`**

Add import:

```tsx
import { getIdentityStatus } from "@/modules/identity/service";
```

Inside the page, after `needsEmailVerification`, fetch the identity status and pass it to the card:

```tsx
  const identityStatus = await getIdentityStatus();
```

Change the `<IdentityCard />` usage to:

```tsx
          <IdentityCard status={identityStatus} />
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/identity-card.tsx "app/(app)/dashboard/page.tsx"
git commit -m "feat(identity): wire real identity state into the dashboard"
```

---

### Task 11: Privacy page identity section

**Files:**
- Modify: `app/(app)/privacy/page.tsx`

**Interfaces:**
- Consumes: `PrivacyExplainer` (Task 8).

- [ ] **Step 1: Update the privacy page**

- Import `PrivacyExplainer`:

```tsx
import { PrivacyExplainer } from "@/modules/identity/components/privacy-explainer";
```

- Update the "What we don't collect" body so it no longer claims NIN is never collected:

```tsx
  {
    title: "What we don't collect",
    body: "We never collect more than a service genuinely needs. Your NIN is only collected when you choose to verify your identity, with your explicit consent.",
  },
```

- Update the "Consent" body:

```tsx
  {
    title: "Consent",
    body: "Nothing is shared with any service provider or government agency without your explicit, informed consent. Identity verification only runs when you start it, and your NIN is stored encrypted and never displayed in full.",
  },
```

- Render the explainer after the existing section cards:

```tsx
      <PrivacyExplainer />
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/privacy/page.tsx"
git commit -m "feat(identity): add identity privacy explanation to privacy page"
```

---

### Task 12: README update + full verification + handoff

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update `README.md`**

Update the architecture / data-model section to mention the identity tables (`IdentityProvider`, `IdentityCredential`, `IdentityVerification`, `IdentityVerificationAttempt`), the encrypted NIN storage, the identity states, the mock provider (explicitly stating it never contacts NIMC and only accepts demo NINs), and add `IDENTITY_ENCRYPTION_KEY` to the env var table.

- [ ] **Step 2: Apply migration + seed to test DB**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma db seed
```

Expected: clean apply.

- [ ] **Step 3: Full checks**

Run: `npm run typecheck`
Expected: clean.

Run: `npm run lint`
Expected: clean.

Run: `npm test`
Expected: all tests pass (unit + integration suites).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: HTTP smoke tests (dev server)**

With the dev server running (background terminal), verify:
- `/identity/verify` returns 200 for an anonymous visitor then redirects (307 → `/auth/login`) when not signed in.
- After signing in with a fresh account, `/identity/verify` shows the form; submit demo NIN `00000000001` → success screen shows "Identity verified" and masked `********0001`.
- `/profile/identity` shows identity status, verification date, provider "Demo NIN provider (mock)", last attempt, and the masked NIN; full NIN never appears in the HTML.
- `/dashboard` shows "Identity verified" + badge for the verified account; a new unverified account shows "Verify your identity".
- `/profile` Identity tab renders.
- Confirm `civone_session` cookie flow still works after the enum migration.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document Phase 2 identity layer"
```

- [ ] **Step 6: Push the feature branch and hand off**

```bash
git push -u origin 260816-feat-identity-verification-phase2
```

Then use the `finishing-a-development-branch` skill to present merge options (merge to `master` + push, or open a PR).
