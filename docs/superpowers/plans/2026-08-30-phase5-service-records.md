# Phase 5 — Service Records, Document Wallet & Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the persistent administrative record layer on top of Phases 1–4: approved applications produce `GovernmentServiceRecord`s, a private document wallet with short-lived signed download URLs, a "My Services" records dashboard, an administrative timeline, and record detail pages.

**Architecture:** Extends the existing catalogue + application engine. A new `records` module creates a permanent record (and a certificate PDF stored in the wallet) the moment `simulateProvider` approves an application. A new `documents` module stores wallet files as BYTEA (stand-in for object storage in this demo) served only via HMAC-signed, time-limited URLs. A `timeline` module aggregates existing tables (identity verifications, application status history, records, wallet documents) by timestamp — no new event table.

**Tech Stack:** Next.js 15 (RSC + Server Actions), Prisma 6 + PostgreSQL 15, Zod, react-hook-form, Vitest, node:crypto (HMAC-SHA256 for signed URLs, hand-rolled minimal PDF).

## Global Constraints

- Never rebuild Phases 1–4; extend only.
- Record reference is the application's `providerRef` (e.g. `CAC-CO-2026-000001`) — never a NIN.
- Exact enums: `RecordStatus` { PENDING, ACTIVE, COMPLETED, EXPIRED, REJECTED, CANCELLED, ARCHIVED }; `RecordVerificationStatus` { UNVERIFIED, USER_ASSERTED, PENDING, VERIFIED, GOVERNMENT_VERIFIED, EXPIRED, REJECTED }; `RecordSource` { CIVICONE, USER_PROVIDED, GOVERNMENT_API, EXTERNAL_PROVIDER, ADMIN_VERIFIED }; `DocumentCategory` { IDENTITY, CERTIFICATES, LICENCES, BUSINESS, TAX, EDUCATION, PROPERTY, EMPLOYMENT, OTHER }.
- Wallet uploads: PDF/JPG/PNG/WEBP only, ≤5 MB, stored as BYTEA in `wallet_documents`; downloads only via short-lived signed URLs; never public URLs.
- Never `npx prisma migrate dev` (shadow-DB diff drops `search_vector`); hand-write migration SQL and apply with `npx prisma migrate deploy` to both `civicone` and `civicone_test`.
- Follow codebase patterns: `generateId("prefix")`, `@@map` snake_case, `server-only` services, `AppError`/`validationError`, vitest `vi.hoisted` cookieJar mock for `next/headers`, real-session `createUser` helper (status `UNVERIFIED`, USER role, `createSession`).
- New permissions `RECORDS_SELF` (`records:self`) and `DOCUMENTS_SELF` (`documents:self`) go on USER, PROFESSIONAL and SUPER_ADMIN_OVERRIDES.
- TDD: write the failing test, watch it fail, implement, watch it pass, commit per task.
- No delete operations in bash (`rm` etc. are forbidden).

---
### Task 1: Schema — records + wallet models, migration, RBAC, env

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260830000000_records_phase5/migration.sql`
- Modify: `server/rbac.ts`
- Modify: `lib/env.ts`
- Modify: `tests/setup.ts`
- Test: `tests/rbac.test.ts` (modify), `tests/records-schema.test.ts` (create)

**Interfaces:**
- Consumes: existing `User`, `Service`, `ServiceProvider`, `Application` models; `PERMISSIONS` map; `env` object.
- Produces: Prisma models `GovernmentServiceRecord` (delegate `db.governmentServiceRecord`) and `WalletDocument` (delegate `db.walletDocument`) with enums above; `PERMISSIONS.RECORDS_SELF`, `PERMISSIONS.DOCUMENTS_SELF`; `env.DOCUMENT_SIGNING_SECRET`, `env.DOCUMENT_SIGNED_URL_TTL_SECONDS`.

- [ ] **Step 1: Extend the Prisma schema**

Add to `prisma/schema.prisma`, in the enum section:

```prisma
enum RecordStatus {
  PENDING
  ACTIVE
  COMPLETED
  EXPIRED
  REJECTED
  CANCELLED
  ARCHIVED
}

enum RecordVerificationStatus {
  UNVERIFIED
  USER_ASSERTED
  PENDING
  VERIFIED
  GOVERNMENT_VERIFIED
  EXPIRED
  REJECTED
}

enum RecordSource {
  CIVICONE
  USER_PROVIDED
  GOVERNMENT_API
  EXTERNAL_PROVIDER
  ADMIN_VERIFIED
}

enum DocumentCategory {
  IDENTITY
  CERTIFICATES
  LICENCES
  BUSINESS
  TAX
  EDUCATION
  PROPERTY
  EMPLOYMENT
  OTHER
}
```

Add the two models at the end of the schema (before the enums block if models are declared there — match existing layout; add after `ApplicationCounter`):

```prisma
model GovernmentServiceRecord {
  id                  String                  @id @db.VarChar(64)
  userId              String                  @map("user_id") @db.VarChar(64)
  serviceId           String                  @map("service_id") @db.VarChar(64)
  providerId          String                  @map("provider_id") @db.VarChar(64)
  applicationId       String?                 @unique @map("application_id") @db.VarChar(64)
  recordType          String                  @map("record_type") @db.VarChar(80)
  externalReference   String?                 @map("external_reference") @db.VarChar(120)
  status              RecordStatus            @default(ACTIVE)
  issueDate           DateTime?               @map("issue_date")
  expiryDate          DateTime?               @map("expiry_date")
  registrationDate    DateTime?               @map("registration_date")
  verificationStatus  RecordVerificationStatus @default(VERIFIED) @map("verification_status")
  source              RecordSource            @default(CIVICONE)
  metadata            Json?
  createdAt           DateTime                @default(now()) @map("created_at")
  updatedAt           DateTime                @updatedAt @map("updated_at")

  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  service     Service            @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  provider    ServiceProvider    @relation(fields: [providerId], references: [id], onDelete: Restrict)
  application Application?       @relation(fields: [applicationId], references: [id], onDelete: SetNull)
  documents   WalletDocument[]

  @@index([userId])
  @@index([serviceId])
  @@map("government_service_records")
}

model WalletDocument {
  id                 String                  @id @db.VarChar(64)
  userId             String                  @map("user_id") @db.VarChar(64)
  recordId           String?                 @map("record_id") @db.VarChar(64)
  category           DocumentCategory
  name               String
  fileName           String                  @map("file_name")
  mimeType           String                  @map("mime_type")
  sizeBytes          Int                     @map("size_bytes")
  fileData           Bytes                   @map("file_data")
  issuer             String?
  issueDate          DateTime?               @map("issue_date")
  expiryDate         DateTime?               @map("expiry_date")
  verificationStatus RecordVerificationStatus @default(UNVERIFIED) @map("verification_status")
  source             RecordSource            @default(USER_PROVIDED)
  metadata           Json?
  createdAt          DateTime                @default(now()) @map("created_at")
  updatedAt          DateTime                @updatedAt @map("updated_at")

  user   User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  record GovernmentServiceRecord? @relation(fields: [recordId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([category])
  @@index([recordId])
  @@map("wallet_documents")
}
```

Add back-relations to existing models:

- In `model User` (after `applications       Application[]`):
```prisma
  records           GovernmentServiceRecord[]
  walletDocuments   WalletDocument[]
```
- In `model Service` (after its existing relations, e.g. after `savedServices`):
```prisma
  records           GovernmentServiceRecord[]
```
- In `model ServiceProvider` (after its existing relations):
```prisma
  records           GovernmentServiceRecord[]
```
- In `model Application` (after `documents     ApplicationDocument[]`):
```prisma
  record            GovernmentServiceRecord?
```

- [ ] **Step 2: Write the migration**

Create `prisma/migrations/20260830000000_records_phase5/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'REJECTED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecordVerificationStatus" AS ENUM ('UNVERIFIED', 'USER_ASSERTED', 'PENDING', 'VERIFIED', 'GOVERNMENT_VERIFIED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('CIVICONE', 'USER_PROVIDED', 'GOVERNMENT_API', 'EXTERNAL_PROVIDER', 'ADMIN_VERIFIED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('IDENTITY', 'CERTIFICATES', 'LICENCES', 'BUSINESS', 'TAX', 'EDUCATION', 'PROPERTY', 'EMPLOYMENT', 'OTHER');

-- CreateTable
CREATE TABLE "government_service_records" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "provider_id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64),
    "record_type" VARCHAR(80) NOT NULL,
    "external_reference" VARCHAR(120),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "registration_date" TIMESTAMP(3),
    "verification_status" "RecordVerificationStatus" NOT NULL DEFAULT 'VERIFIED',
    "source" "RecordSource" NOT NULL DEFAULT 'CIVICONE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "government_service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_documents" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "record_id" VARCHAR(64),
    "category" "DocumentCategory" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(80) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "file_data" BYTEA NOT NULL,
    "issuer" VARCHAR(160),
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "verification_status" "RecordVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "source" "RecordSource" NOT NULL DEFAULT 'USER_PROVIDED',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallet_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "government_service_records_application_id_key" ON "government_service_records"("application_id");

-- CreateIndex
CREATE INDEX "government_service_records_user_id_idx" ON "government_service_records"("user_id");

-- CreateIndex
CREATE INDEX "government_service_records_service_id_idx" ON "government_service_records"("service_id");

-- CreateIndex
CREATE INDEX "wallet_documents_user_id_idx" ON "wallet_documents"("user_id");

-- CreateIndex
CREATE INDEX "wallet_documents_category_idx" ON "wallet_documents"("category");

-- CreateIndex
CREATE INDEX "wallet_documents_record_id_idx" ON "wallet_documents"("record_id");

-- AddForeignKey
ALTER TABLE "government_service_records" ADD CONSTRAINT "government_service_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_records" ADD CONSTRAINT "government_service_records_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_records" ADD CONSTRAINT "government_service_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_records" ADD CONSTRAINT "government_service_records_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_documents" ADD CONSTRAINT "wallet_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_documents" ADD CONSTRAINT "wallet_documents_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "government_service_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Verify the table names referenced exist: `users`, `services`, `service_providers`, `applications` — all from earlier migrations.

- [ ] **Step 3: Apply the migration to both databases**

```bash
npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
npx prisma generate
```

Expected: both report the `20260830000000_records_phase5` migration as applied.

- [ ] **Step 4: Add RBAC permissions**

In `server/rbac.ts` add to `PERMISSIONS`:
```ts
  RECORDS_SELF: "records:self",
  DOCUMENTS_SELF: "documents:self",
```

Add both to the `USER` role array, the `PROFESSIONAL` role array, and `SUPER_ADMIN_OVERRIDES`.

- [ ] **Step 5: Add env vars**

In `lib/env.ts` add to the schema:
```ts
  DOCUMENT_SIGNING_SECRET: z
    .string()
    .min(16, "DOCUMENT_SIGNING_SECRET must be at least 16 characters")
    .default("civicone-demo-document-signing-secret-change-me"),
  DOCUMENT_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
```

In `tests/setup.ts` add:
```ts
process.env.DOCUMENT_SIGNING_SECRET = "test-document-signing-secret-0123456789";
process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS = "300";
```

- [ ] **Step 6: Write schema smoke tests**

Create `tests/records-schema.test.ts`:

```ts
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { generateId } from "@/lib/id";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});

describe("phase 5 schema", () => {
  it("creates and reads a government service record", async () => {
    const user = await db.user.create({
      data: { id: generateId("usr"), email: `rec-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "UNVERIFIED" },
    });
    const provider = await db.serviceProvider.findFirstOrThrow();
    const service = await db.service.findFirstOrThrow({ where: { providerId: provider.id } });
    const record = await db.governmentServiceRecord.create({
      data: {
        id: generateId("rec"),
        userId: user.id,
        serviceId: service.id,
        providerId: provider.id,
        recordType: "Test Record",
        externalReference: "CAC-TEST-1",
        status: "ACTIVE",
        verificationStatus: "GOVERNMENT_VERIFIED",
        source: "CIVICONE",
      },
    });
    const found = await db.governmentServiceRecord.findUnique({ where: { id: record.id } });
    expect(found).not.toBeNull();
    expect(found!.status).toBe("ACTIVE");
    expect(found!.source).toBe("CIVICONE");
    await db.governmentServiceRecord.delete({ where: { id: record.id } });
    await db.user.delete({ where: { id: user.id } });
  });

  it("creates a wallet document with BYTEA payload", async () => {
    const user = await db.user.create({
      data: { id: generateId("usr"), email: `wdc-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "UNVERIFIED" },
    });
    const doc = await db.walletDocument.create({
      data: {
        id: generateId("wdc"),
        userId: user.id,
        category: "OTHER",
        name: "Test upload",
        fileName: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4,
        fileData: Buffer.from("demo"),
        source: "USER_PROVIDED",
      },
    });
    const found = await db.walletDocument.findUnique({ where: { id: doc.id } });
    expect(found?.fileData).toEqual(Buffer.from("demo"));
    await db.walletDocument.delete({ where: { id: doc.id } });
    await db.user.delete({ where: { id: user.id } });
  });
});
```

Add to `tests/rbac.test.ts` an assertion that `PERMISSIONS.RECORDS_SELF` and `PERMISSIONS.DOCUMENTS_SELF` are granted to `USER` and `PROFESSIONAL` (mirror the existing `APPLICATIONS_SELF` assertions).

- [ ] **Step 7: Run checks + commit**

```bash
npx vitest run tests/records-schema.test.ts tests/rbac.test.ts
npm run typecheck
npm run lint
git add prisma/schema.prisma prisma/migrations/20260830000000_records_phase5/migration.sql server/rbac.ts lib/env.ts tests/setup.ts tests/records-schema.test.ts tests/rbac.test.ts
git commit -m "feat(records): add service record and wallet document schema, permissions and env"
```

---
### Task 2: Certificate PDF generator

**Files:**
- Create: `modules/records/certificate.ts`
- Test: `tests/records-certificate.test.ts`

**Interfaces:**
- Produces: `buildCertificatePdf(opts: { title: string; subtitle: string; lines: Array<[string, string]>; footer: string }): Buffer` — a valid single-page PDF (US Letter, Helvetica base-14 font, no external assets).

- [ ] **Step 1: Write the failing test**

Create `tests/records-certificate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCertificatePdf } from "@/modules/records/certificate";

describe("buildCertificatePdf", () => {
  it("produces a valid PDF containing the record details", () => {
    const pdf = buildCertificatePdf({
      title: "Business Registration Certificate",
      subtitle: "Demo certificate issued by Corporate Affairs Commission",
      lines: [
        ["Record type", "Business Registration"],
        ["Reference", "CAC-CO-2026-000001"],
        ["Holder", "Aisha Bello"],
        ["Issue date", "2026-08-30"],
      ],
      footer: "This is a demonstration certificate generated by CivicOne.",
    });
    const text = pdf.toString("binary");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Business Registration Certificate");
    expect(text).toContain("CAC-CO-2026-000001");
    expect(pdf.length).toBeGreaterThan(300);
  });

  it("escapes parentheses in values", () => {
    const pdf = buildCertificatePdf({
      title: "Certificate (Demo)",
      subtitle: "Subtitle",
      lines: [["Holder", "Obi (Jr.)"]],
      footer: "Footer",
    });
    expect(pdf.toString("binary")).toContain("\\(");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/records-certificate.test.ts`
Expected: FAIL — cannot find module `@/modules/records/certificate`.

- [ ] **Step 3: Implement the generator**

Create `modules/records/certificate.ts`:

```ts
function asciiSafe(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildCertificatePdf(opts: {
  title: string;
  subtitle: string;
  lines: Array<[string, string]>;
  footer: string;
}): Buffer {
  const streamLines: string[] = [];
  streamLines.push(`BT /F1 22 Tf 72 740 Td (${escapePdfText(asciiSafe(opts.title))}) Tj ET`);
  streamLines.push(`BT /F1 11 Tf 72 716 Td (${escapePdfText(asciiSafe(opts.subtitle))}) Tj ET`);
  streamLines.push("0.6 0.6 0.6 RG 72 704 m 540 704 l S");
  let y = 668;
  for (const [label, value] of opts.lines) {
    streamLines.push(`BT /F1 11 Tf 72 ${y} Td (${escapePdfText(asciiSafe(`${label}: ${value}`))}) Tj ET`);
    y -= 26;
  }
  streamLines.push(`BT /F1 8 Tf 72 60 Td (${escapePdfText(asciiSafe(opts.footer))}) Tj ET`);
  const stream = streamLines.join("\n");

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "binary");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/records-certificate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/records/certificate.ts tests/records-certificate.test.ts
git commit -m "feat(records): add certificate PDF generator"
```

---
### Task 3: Record creation on application approval

**Files:**
- Create: `modules/records/service.ts`
- Modify: `modules/applications/service.ts` (`simulateProvider` hook)
- Test: `tests/records-approval.test.ts`

**Interfaces:**
- Consumes: `Application` + `Service` + `ServiceProvider` Prisma relations, `buildCertificatePdf`, `IdentityProfile.legalName`.
- Produces: `createRecordForApprovedApplication(applicationId: string): Promise<{ recordId: string; certificateId: string | null; created: boolean }>` — idempotent, creates a `GovernmentServiceRecord` (status ACTIVE, `GOVERNMENT_VERIFIED`, `CIVICONE`) and a `WalletDocument` certificate (PDF, `GOVERNMENT_VERIFIED`, `CIVICONE`) for the approved application.
- `simulateProvider` now calls it when an application reaches APPROVED.

- [ ] **Step 1: Write the failing test**

Create `tests/records-approval.test.ts` (walk an application to APPROVED via the existing service, then assert a record + certificate exist):

```ts
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

import { db } from "@/server/db";
import { generateId } from "@/lib/id";
import { createSession } from "@/server/auth/session";
import {
  startApplication,
  getApplicationByReference,
  saveAnswers,
  confirmEligibility,
  confirmPayment,
  attachDocument,
  advanceStep,
  simulateProvider,
} from "@/modules/applications/service";
import { createRecordForApprovedApplication } from "@/modules/records/service";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  cookieJar.clear();
  await createUser();
});

async function createUser(): Promise<void> {
  const id = generateId("usr");
  await db.user.create({
    data: { id, email: `recapp-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "UNVERIFIED" },
  });
  const role = await db.role.findUnique({ where: { name: "USER" } });
  if (!role) throw new Error("USER role missing; run npm run db:seed");
  await db.userRole.create({ data: { id: generateId("uro"), userId: id, roleId: role.id } });
  await createSession(id, { ipAddress: "127.0.0.1", userAgent: "vitest" });
}

async function walkToSubmitted(slug: string) {
  const service = await db.service.findUnique({ where: { slug } });
  if (!service) throw new Error(`missing service ${slug}`);
  const { reference } = await startApplication(service.id);
  let app = await getApplicationByReference(reference);
  await confirmEligibility(app.id);
  await advanceStep(app.id);
  app = await getApplicationByReference(reference);
  for (const step of app.steps) {
    if (step.id !== app.currentStepId) continue;
    if (step.type === "FORM") {
      const config = step.config as { formKey: string };
      const form = await db.serviceFormDefinition.findUnique({ where: { key: config.formKey } });
      const def = form!.config as { fields: Array<{ key: string; type: string }> };
      const values: Record<string, unknown> = {};
      for (const field of def.fields) {
        if (field.type === "text" || field.type === "email") values[field.key] = "demo value";
        else if (field.type === "phone") values[field.key] = "+2348012345678";
        else if (field.type === "select" || field.type === "radio") values[field.key] = "value";
        else if (field.type === "address" || field.type === "textarea") values[field.key] = "12 Broad Street, Lagos";
        else if (field.type === "date") values[field.key] = "1990-01-01";
        else if (field.type === "checkbox") values[field.key] = true;
        else if (field.type === "multi-select") values[field.key] = ["value"];
        else if (field.type === "number") values[field.key] = 1;
      }
      await saveAnswers(app.id, config.formKey, values);
    }
    if (step.type === "DOCUMENTS") {
      const config = step.config as { documents: Array<{ key: string; label: string }> };
      for (const doc of config.documents) {
        await attachDocument(app.id, "_documents", doc.key, doc.label, {
          name: `${doc.key}.pdf`, type: "application/pdf", size: 123, buffer: Buffer.from("demo"),
        });
      }
    }
    if (step.type === "PAYMENT") {
      await confirmPayment(app.id);
    }
    await advanceStep(app.id);
    app = await getApplicationByReference(reference);
  }
  return { reference, app };
}

describe("record creation on approval", () => {
  it("creates a record and certificate when a business registration is approved", async () => {
    const { reference, app } = await walkToSubmitted("business-registration");
    expect(app.status).toBe("SUBMITTED");
    await simulateProvider(app.id);
    await simulateProvider(app.id);

    const application = await db.application.findUnique({ where: { reference } });
    const record = await db.governmentServiceRecord.findUnique({ where: { applicationId: application!.id } });
    expect(record).not.toBeNull();
    expect(record!.status).toBe("ACTIVE");
    expect(record!.recordType).toBe("Business Registration");
    expect(record!.verificationStatus).toBe("GOVERNMENT_VERIFIED");
    expect(record!.source).toBe("CIVICONE");
    expect(record!.externalReference).toMatch(/^CAC-/);

    const certificate = await db.walletDocument.findFirst({ where: { recordId: record!.id } });
    expect(certificate).not.toBeNull();
    expect(certificate!.mimeType).toBe("application/pdf");
    expect(certificate!.verificationStatus).toBe("GOVERNMENT_VERIFIED");
    expect(certificate!.fileData.length).toBeGreaterThan(100);
  });

  it("is idempotent — calling twice keeps one record", async () => {
    const { app } = await walkToSubmitted("business-registration");
    await simulateProvider(app.id);
    await simulateProvider(app.id);
    const first = await createRecordForApprovedApplication(app.id);
    const second = await createRecordForApprovedApplication(app.id);
    expect(second.created).toBe(false);
    expect(first.recordId).toBe(second.recordId);
    const count = await db.governmentServiceRecord.count({ where: { applicationId: app.id } });
    expect(count).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/records-approval.test.ts`
Expected: FAIL — cannot find module `@/modules/records/service`.

- [ ] **Step 3: Implement `modules/records/service.ts`**

```ts
import "server-only";
import type { DocumentCategory } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { logAudit } from "@/server/audit";
import { generateId } from "@/lib/id";
import { buildCertificatePdf } from "./certificate";

const RECORD_TYPE_BY_SLUG: Record<string, string> = {
  "business-registration": "Business Registration",
  "national-passport": "Passport",
  "driver-licence": "Driver's Licence",
};

const CERT_CATEGORY_BY_SLUG: Record<string, DocumentCategory> = {
  "business-registration": "BUSINESS",
  "national-passport": "IDENTITY",
  "driver-licence": "LICENCES",
};

const EXPIRY_YEARS_BY_SLUG: Record<string, number | null> = {
  "business-registration": null,
  "national-passport": 10,
  "driver-licence": 5,
};

export interface RecordCreateResult {
  recordId: string;
  certificateId: string | null;
  created: boolean;
}

export async function createRecordForApprovedApplication(
  applicationId: string,
): Promise<RecordCreateResult> {
  const existing = await db.governmentServiceRecord.findUnique({ where: { applicationId } });
  if (existing) return { recordId: existing.id, certificateId: null, created: false };

  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: { service: { include: { provider: true } } },
  });
  if (!application) throw new AppError("Application not found.", { code: "NOT_FOUND" });

  const slug = application.service.slug;
  const recordType = RECORD_TYPE_BY_SLUG[slug] ?? application.service.name;
  const expiryYears = EXPIRY_YEARS_BY_SLUG[slug] ?? null;
  const now = new Date();
  const expiryDate = expiryYears
    ? new Date(now.getTime() + expiryYears * 365 * 24 * 60 * 60 * 1000)
    : null;

  const profile = await db.identityProfile.findUnique({ where: { userId: application.userId } });

  const record = await db.governmentServiceRecord.create({
    data: {
      id: generateId("rec"),
      userId: application.userId,
      serviceId: application.serviceId,
      providerId: application.service.providerId,
      applicationId: application.id,
      recordType,
      externalReference: application.providerRef,
      status: "ACTIVE",
      issueDate: now,
      expiryDate,
      registrationDate: now,
      verificationStatus: "GOVERNMENT_VERIFIED",
      source: "CIVICONE",
      metadata: { applicationReference: application.reference },
    },
  });

  const pdf = buildCertificatePdf({
    title: `${recordType} Certificate`,
    subtitle: `Demo certificate issued by ${application.service.provider.name}`,
    lines: [
      ["Record type", recordType],
      ["Reference", application.providerRef ?? "—"],
      ["Holder", profile?.legalName ?? "—"],
      ["Issue date", now.toISOString().slice(0, 10)],
      ["Expiry date", expiryDate ? expiryDate.toISOString().slice(0, 10) : "N/A"],
      ["Application", application.reference],
    ],
    footer: "This is a demonstration certificate generated by CivicOne. Not an official government document.",
  });

  const certificate = await db.walletDocument.create({
    data: {
      id: generateId("wdc"),
      userId: application.userId,
      recordId: record.id,
      category: CERT_CATEGORY_BY_SLUG[slug] ?? "OTHER",
      name: `${recordType} certificate`,
      fileName: `${slug}-certificate.pdf`,
      mimeType: "application/pdf",
      sizeBytes: pdf.length,
      fileData: pdf,
      issuer: application.service.provider.name,
      issueDate: now,
      expiryDate,
      verificationStatus: "GOVERNMENT_VERIFIED",
      source: "CIVICONE",
    },
  });

  await logAudit({
    actorId: application.userId,
    action: "record.created",
    resourceType: "record",
    resourceId: record.id,
    metadata: { recordType, applicationReference: application.reference },
  });

  return { recordId: record.id, certificateId: certificate.id, created: true };
}
```

- [ ] **Step 4: Hook `simulateProvider`**

In `modules/applications/service.ts`, import:
```ts
import { createRecordForApprovedApplication } from "@/modules/records/service";
```

Replace the approval block inside `simulateProvider` (currently lines ~671–676) with:

```ts
  if (outcome.status === "APPROVED" || outcome.status === "REJECTED") {
    await db.application.update({
      where: { id: application.id },
      data: { completedAt: new Date() },
    });
    if (outcome.status === "APPROVED") {
      try {
        await createRecordForApprovedApplication(application.id);
      } catch (error) {
        console.error("[records] failed to create record on approval", error);
      }
    }
  }
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/records-approval.test.ts`
Expected: PASS (2 tests). Then:
```bash
npx vitest run tests/applications-service.test.ts tests/applications-actions.test.ts
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add modules/records/service.ts modules/applications/service.ts tests/records-approval.test.ts
git commit -m "feat(records): create government service record and certificate on approval"
```

---
### Task 4: Records service — My Services overview + record detail

**Files:**
- Modify: `modules/records/service.ts`
- Test: `tests/records-service.test.ts`

**Interfaces:**
- Consumes: `PERMISSIONS.RECORDS_SELF`, `db.governmentServiceRecord`, `getApplicationsForUser` (from applications module).
- Produces:
  - `RecordCardView { id, recordType, serviceSlug, serviceName, providerName, providerAbbreviation, status, verificationStatus, source, externalReference, issueDate, expiryDate }`
  - `getMyServicesOverview(): Promise<{ active: RecordCardView[]; completed: RecordCardView[]; expiringSoon: RecordCardView[]; archived: RecordCardView[] }>`
  - `RecordDetailView { id, recordType, serviceSlug, serviceName, serviceSummary, providerName, providerAbbreviation, officialUrl, status, verificationStatus, source, externalReference, issueDate, expiryDate, registrationDate, createdAt, documents: WalletDocumentView[], application: { id, reference, status, timeline } | null }`
  - `getRecordById(id: string): Promise<RecordDetailView>`
  - `WalletDocumentView { id, category, name, fileName, mimeType, sizeBytes, issuer, issueDate, expiryDate, verificationStatus, source, createdAt }`

- [ ] **Step 1: Write the failing test**

Create `tests/records-service.test.ts`:

```ts
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

import { db } from "@/server/db";
import { generateId } from "@/lib/id";
import { createSession } from "@/server/auth/session";
import { getMyServicesOverview, getRecordById } from "@/modules/records/service";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  cookieJar.clear();
  await createUser();
});

let userId: string;
async function createUser(): Promise<void> {
  const id = generateId("usr");
  userId = id;
  await db.user.create({
    data: { id, email: `recsvc-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "UNVERIFIED" },
  });
  const role = await db.role.findUnique({ where: { name: "USER" } });
  if (!role) throw new Error("USER role missing; run npm run db:seed");
  await db.userRole.create({ data: { id: generateId("uro"), userId: id, roleId: role.id } });
  await createSession(id, { ipAddress: "127.0.0.1", userAgent: "vitest" });
}

async function seedRecord(slug: string, status: string, expiryYears: number | null, reference: string) {
  const service = await db.service.findUnique({ where: { slug }, include: { provider: true } });
  if (!service) throw new Error(`missing service ${slug}`);
  const now = new Date();
  return db.governmentServiceRecord.create({
    data: {
      id: generateId("rec"),
      userId,
      serviceId: service.id,
      providerId: service.provider.id,
      recordType: service.name,
      externalReference: reference,
      status: status as never,
      issueDate: now,
      expiryDate: expiryYears ? new Date(now.getTime() + expiryYears * 365 * 24 * 60 * 60 * 1000) : null,
      registrationDate: now,
      verificationStatus: "GOVERNMENT_VERIFIED",
      source: "CIVICONE",
    },
  });
}

describe("records service", () => {
  it("groups records into active, completed, expiring soon and archived", async () => {
    await seedRecord("driver-licence", "ACTIVE", 0.1, "FRSC-1"); // expires in ~36 days
    await seedRecord("business-registration", "COMPLETED", null, "CAC-1");
    await seedRecord("national-passport", "ARCHIVED", 10, "NIS-1");
    const overview = await getMyServicesOverview();
    expect(overview.active.some((r) => r.externalReference === "FRSC-1")).toBe(true);
    expect(overview.completed.some((r) => r.externalReference === "CAC-1")).toBe(true);
    expect(overview.archived.some((r) => r.externalReference === "NIS-1")).toBe(true);
    expect(overview.expiringSoon.some((r) => r.externalReference === "FRSC-1")).toBe(true);
  });

  it("returns a record detail view with documents", async () => {
    const record = await seedRecord("business-registration", "ACTIVE", null, "CAC-2");
    await db.walletDocument.create({
      data: {
        id: generateId("wdc"),
        userId,
        recordId: record.id,
        category: "BUSINESS",
        name: "Business Registration certificate",
        fileName: "cert.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4,
        fileData: Buffer.from("demo"),
        verificationStatus: "GOVERNMENT_VERIFIED",
        source: "CIVICONE",
      },
    });
    const detail = await getRecordById(record.id);
    expect(detail.providerName).toBe("Corporate Affairs Commission");
    expect(detail.status).toBe("ACTIVE");
    expect(detail.documents.length).toBe(1);
    expect(detail.documents[0].name).toContain("certificate");
  });

  it("throws NOT_FOUND for another user's record", async () => {
    const other = await db.user.create({
      data: { id: generateId("usr"), email: `recsvc2-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "UNVERIFIED" },
    });
    const service = await db.service.findFirstOrThrow();
    const record = await db.governmentServiceRecord.create({
      data: {
        id: generateId("rec"),
        userId: other.id,
        serviceId: service.id,
        providerId: service.providerId,
        recordType: "Other",
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
        source: "CIVICONE",
      },
    });
    await expect(getRecordById(record.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.governmentServiceRecord.delete({ where: { id: record.id } });
    await db.user.delete({ where: { id: other.id } });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/records-service.test.ts`
Expected: FAIL — `getMyServicesOverview` / `getRecordById` not exported.

- [ ] **Step 3: Implement the functions**

Append to `modules/records/service.ts`:

```ts
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { requireUser } from "@/server/auth/session";
import type {
  RecordSource,
  RecordStatus,
  RecordVerificationStatus,
  ServiceMode,
} from "@prisma/client";

const EXPIRING_SOON_DAYS = 60;

export interface RecordCardView {
  id: string;
  recordType: string;
  serviceSlug: string;
  serviceName: string;
  providerName: string;
  providerAbbreviation: string | null;
  status: RecordStatus;
  verificationStatus: RecordVerificationStatus;
  source: RecordSource;
  externalReference: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
}

export interface WalletDocumentView {
  id: string;
  category: string;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  issuer: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  verificationStatus: RecordVerificationStatus;
  source: RecordSource;
  createdAt: Date;
}

export interface MyServicesOverview {
  active: RecordCardView[];
  completed: RecordCardView[];
  expiringSoon: RecordCardView[];
  archived: RecordCardView[];
}

const recordSelect = {
  id: true,
  recordType: true,
  status: true,
  verificationStatus: true,
  source: true,
  externalReference: true,
  issueDate: true,
  expiryDate: true,
  createdAt: true,
  service: { select: { slug: true, name: true } },
  provider: { select: { name: true, abbreviation: true } },
} as const;

async function loadOwnedRecords() {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.RECORDS_SELF);
  const rows = await db.governmentServiceRecord.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: recordSelect,
  });
  return rows.map((row) => ({
    id: row.id,
    recordType: row.recordType,
    serviceSlug: row.service.slug,
    serviceName: row.service.name,
    providerName: row.provider.name,
    providerAbbreviation: row.provider.abbreviation,
    status: row.status,
    verificationStatus: row.verificationStatus,
    source: row.source,
    externalReference: row.externalReference,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
  }));
}

export async function getMyServicesOverview(): Promise<MyServicesOverview> {
  const cards = await loadOwnedRecords();
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
  return {
    active: cards.filter((c) => c.status === "ACTIVE"),
    completed: cards.filter((c) => c.status === "COMPLETED"),
    expiringSoon: cards.filter(
      (c) => c.expiryDate !== null && c.expiryDate! > now && c.expiryDate! <= soon,
    ),
    archived: cards.filter((c) => c.status === "ARCHIVED"),
  };
}

export interface RecordDetailView {
  id: string;
  recordType: string;
  serviceSlug: string;
  serviceName: string;
  serviceSummary: string;
  providerName: string;
  providerAbbreviation: string | null;
  officialUrl: string | null;
  status: RecordStatus;
  verificationStatus: RecordVerificationStatus;
  source: RecordSource;
  externalReference: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  registrationDate: Date | null;
  createdAt: Date;
  documents: WalletDocumentView[];
  application: {
    id: string;
    reference: string;
    status: string;
    timeline: Array<{ fromStatus: string | null; toStatus: string; reason: string | null; createdAt: Date }>;
  } | null;
}

export async function getRecordById(id: string): Promise<RecordDetailView> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.RECORDS_SELF);
  const record = await db.governmentServiceRecord.findUnique({
    where: { id },
    include: {
      service: { select: { slug: true, name: true, summary: true } },
      provider: { select: { name: true, abbreviation: true, officialUrl: true } },
      application: { include: { statusHistory: { orderBy: { createdAt: "asc" } } } },
      documents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!record || record.userId !== user.id) {
    throw new AppError("Record not found.", { code: "NOT_FOUND" });
  }
  return {
    id: record.id,
    recordType: record.recordType,
    serviceSlug: record.service.slug,
    serviceName: record.service.name,
    serviceSummary: record.service.summary,
    providerName: record.provider.name,
    providerAbbreviation: record.provider.abbreviation,
    officialUrl: record.provider.officialUrl,
    status: record.status,
    verificationStatus: record.verificationStatus,
    source: record.source,
    externalReference: record.externalReference,
    issueDate: record.issueDate,
    expiryDate: record.expiryDate,
    registrationDate: record.registrationDate,
    createdAt: record.createdAt,
    documents: record.documents.map((d) => ({
      id: d.id,
      category: d.category,
      name: d.name,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      issuer: d.issuer,
      issueDate: d.issueDate,
      expiryDate: d.expiryDate,
      verificationStatus: d.verificationStatus,
      source: d.source,
      createdAt: d.createdAt,
    })),
    application: record.application
      ? {
          id: record.application.id,
          reference: record.application.reference,
          status: record.application.status,
          timeline: record.application.statusHistory.map((h) => ({
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            reason: h.reason,
            createdAt: h.createdAt,
          })),
        }
      : null,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/records-service.test.ts`
Expected: PASS (3 tests). Then `npm run typecheck && npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add modules/records/service.ts tests/records-service.test.ts
git commit -m "feat(records): add my services overview and record detail queries"
```

---
### Task 5: Wallet documents service + signed download URLs

**Files:**
- Create: `modules/documents/service.ts`
- Create: `modules/documents/validators.ts`
- Create: `app/(app)/documents/[id]/download/route.ts`
- Test: `tests/wallet-documents.test.ts`

**Interfaces:**
- Consumes: `PERMISSIONS.DOCUMENTS_SELF`, `env.DOCUMENT_SIGNING_SECRET`, `env.DOCUMENT_SIGNED_URL_TTL_SECONDS`, `server/crypto.ts` (`timingSafeEqualStrings`).
- Produces:
  - `DOCUMENT_CATEGORIES: Array<{ value: DocumentCategory; label: string }>`
  - `WalletDocumentView` (re-exported shape from records service)
  - `getWalletDocuments(opts?: { category?: string; limit?: number }): Promise<WalletDocumentView[]>`
  - `getWalletDocumentCount(): Promise<number>`
  - `uploadWalletDocument(input: { category; name; issuer?; issueDate?; expiryDate?; file: { name; type; size; buffer } }): Promise<WalletDocumentView>`
  - `deleteWalletDocument(id: string): Promise<void>`
  - `getWalletDocumentBytes(id: string): Promise<{ fileName; mimeType; sizeBytes; fileData }>`
  - `signDocumentUrl(documentId: string): string`
  - `verifyDocumentSignature(documentId: string, token: string, exp: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `tests/wallet-documents.test.ts`:

```ts
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

import { db } from "@/server/db";
import { generateId } from "@/lib/id";
import { createSession } from "@/server/auth/session";
import {
  getWalletDocuments,
  uploadWalletDocument,
  deleteWalletDocument,
  getWalletDocumentBytes,
  signDocumentUrl,
  verifyDocumentSignature,
  DOCUMENT_CATEGORIES,
} from "@/modules/documents/service";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  cookieJar.clear();
  await createUser();
});

let userId: string;
async function createUser(): Promise<void> {
  const id = generateId("usr");
  userId = id;
  await db.user.create({
    data: { id, email: `wdcsvc-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "UNVERIFIED" },
  });
  const role = await db.role.findUnique({ where: { name: "USER" } });
  if (!role) throw new Error("USER role missing; run npm run db:seed");
  await db.userRole.create({ data: { id: generateId("uro"), userId: id, roleId: role.id } });
  await createSession(id, { ipAddress: "127.0.0.1", userAgent: "vitest" });
}

describe("wallet documents", () => {
  it("exposes the nine categories", () => {
    expect(DOCUMENT_CATEGORIES.map((c) => c.value)).toEqual([
      "IDENTITY", "CERTIFICATES", "LICENCES", "BUSINESS", "TAX",
      "EDUCATION", "PROPERTY", "EMPLOYMENT", "OTHER",
    ]);
  });

  it("uploads a PDF and lists it by category", async () => {
    const uploaded = await uploadWalletDocument({
      category: "EDUCATION",
      name: "School certificate",
      issuer: "University of Lagos",
      file: { name: "cert.pdf", type: "application/pdf", size: 10, buffer: Buffer.from("pdf-bytes") },
    });
    expect(uploaded.category).toBe("EDUCATION");
    expect(uploaded.fileName).toBe("cert.pdf");
    const list = await getWalletDocuments({ category: "EDUCATION" });
    expect(list.some((d) => d.id === uploaded.id)).toBe(true);
  });

  it("rejects a disallowed mime type", async () => {
    await expect(
      uploadWalletDocument({
        category: "OTHER",
        name: "bad",
        file: { name: "evil.exe", type: "application/x-msdownload", size: 10, buffer: Buffer.from("x") },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("signs and verifies a short-lived URL", async () => {
    const doc = await uploadWalletDocument({
      category: "OTHER",
      name: "memo",
      file: { name: "memo.pdf", type: "application/pdf", size: 5, buffer: Buffer.from("memo") },
    });
    const url = signDocumentUrl(doc.id);
    expect(url.startsWith(`/documents/${doc.id}/download?`)).toBe(true);
    const parsed = new URL(url, "http://localhost");
    const exp = Number(parsed.searchParams.get("exp"));
    const sig = parsed.searchParams.get("sig") ?? "";
    expect(verifyDocumentSignature(doc.id, sig, exp)).toBe(true);
    expect(verifyDocumentSignature(doc.id, "bogus", exp)).toBe(false);
    expect(verifyDocumentSignature(doc.id, sig, exp - 1000)).toBe(false);
  });

  it("streams bytes only for the owner and deletes", async () => {
    const doc = await uploadWalletDocument({
      category: "OTHER",
      name: "private",
      file: { name: "p.pdf", type: "application/pdf", size: 3, buffer: Buffer.from("abc") },
    });
    const bytes = await getWalletDocumentBytes(doc.id);
    expect(bytes.fileName).toBe("p.pdf");
    expect(bytes.fileData).toEqual(Buffer.from("abc"));
    await deleteWalletDocument(doc.id);
    const count = await db.walletDocument.count({ where: { id: doc.id } });
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/wallet-documents.test.ts`
Expected: FAIL — cannot find module `@/modules/documents/service`.

- [ ] **Step 3: Implement `modules/documents/validators.ts`**

```ts
import { z } from "zod";

export const walletDocumentUploadSchema = z.object({
  category: z.enum([
    "IDENTITY", "CERTIFICATES", "LICENCES", "BUSINESS", "TAX",
    "EDUCATION", "PROPERTY", "EMPLOYMENT", "OTHER",
  ]),
  name: z.string().min(1, "Document name is required").max(160),
  issuer: z.string().max(160).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
});

export const walletDocumentIdSchema = z.object({
  documentId: z.string().min(1, "Document id is required"),
});
```

- [ ] **Step 4: Implement `modules/documents/service.ts`**

```ts
import "server-only";
import { createHmac } from "node:crypto";
import type { DocumentCategory, RecordSource, RecordVerificationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { generateId } from "@/lib/id";
import { timingSafeEqualStrings } from "@/server/crypto";
import { env } from "@/lib/env";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export const DOCUMENT_CATEGORIES: Array<{ value: DocumentCategory; label: string }> = [
  { value: "IDENTITY", label: "Identity" },
  { value: "CERTIFICATES", label: "Certificates" },
  { value: "LICENCES", label: "Licences" },
  { value: "BUSINESS", label: "Business" },
  { value: "TAX", label: "Tax" },
  { value: "EDUCATION", label: "Education" },
  { value: "PROPERTY", label: "Property" },
  { value: "EMPLOYMENT", label: "Employment" },
  { value: "OTHER", label: "Other" },
];

export interface WalletDocumentView {
  id: string;
  category: DocumentCategory;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  issuer: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  verificationStatus: RecordVerificationStatus;
  source: RecordSource;
  createdAt: Date;
}

const viewSelect = {
  id: true,
  category: true,
  name: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  issuer: true,
  issueDate: true,
  expiryDate: true,
  verificationStatus: true,
  source: true,
  createdAt: true,
} as const;

async function currentUser() {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.DOCUMENTS_SELF);
  return user;
}

export async function getWalletDocuments(opts?: {
  category?: string;
  limit?: number;
}): Promise<WalletDocumentView[]> {
  const user = await currentUser();
  const rows = await db.walletDocument.findMany({
    where: { userId: user.id, ...(opts?.category ? { category: opts.category as DocumentCategory } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts?.limit,
    select: viewSelect,
  });
  return rows.map((row) => ({ ...row }));
}

export async function getWalletDocumentCount(): Promise<number> {
  const user = await currentUser();
  return db.walletDocument.count({ where: { userId: user.id } });
}

export async function uploadWalletDocument(input: {
  category: DocumentCategory;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  file: { name: string; type: string; size: number; buffer: Buffer };
}): Promise<WalletDocumentView> {
  const user = await currentUser();
  if (input.file.size <= 0 || input.file.size > MAX_FILE_BYTES) {
    throw new AppError("File must be between 1 byte and 5 MB.", { code: "VALIDATION_ERROR" });
  }
  if (!ALLOWED_MIME.has(input.file.type)) {
    throw new AppError("File type not supported. Use PDF, JPG, PNG or WEBP.", { code: "VALIDATION_ERROR" });
  }
  const parseDate = (v?: string) => (v ? new Date(`${v}T00:00:00.000Z`) : null);
  const doc = await db.walletDocument.create({
    data: {
      id: generateId("wdc"),
      userId: user.id,
      category: input.category,
      name: input.name,
      fileName: input.file.name.slice(0, 255),
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      fileData: input.file.buffer as unknown as Uint8Array<ArrayBuffer>,
      issuer: input.issuer?.trim() ? input.issuer.trim() : null,
      issueDate: parseDate(input.issueDate),
      expiryDate: parseDate(input.expiryDate),
      verificationStatus: "UNVERIFIED",
      source: "USER_PROVIDED",
    },
    select: viewSelect,
  });
  return { ...doc };
}

export async function deleteWalletDocument(id: string): Promise<void> {
  const user = await currentUser();
  const doc = await db.walletDocument.findFirst({ where: { id, userId: user.id } });
  if (!doc) throw new AppError("Document not found.", { code: "NOT_FOUND" });
  await db.walletDocument.delete({ where: { id } });
}

export async function getWalletDocumentBytes(id: string): Promise<{
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileData: Uint8Array<ArrayBuffer>;
}> {
  const user = await currentUser();
  const doc = await db.walletDocument.findFirst({ where: { id, userId: user.id } });
  if (!doc) throw new AppError("Document not found.", { code: "NOT_FOUND" });
  return { fileName: doc.fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, fileData: doc.fileData };
}

function signValue(value: string): string {
  return createHmac("sha256", env.DOCUMENT_SIGNING_SECRET).update(value).digest("hex");
}

export function signDocumentUrl(documentId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + env.DOCUMENT_SIGNED_URL_TTL_SECONDS;
  const sig = signValue(`${documentId}:${exp}`);
  return `/documents/${documentId}/download?exp=${exp}&sig=${sig}`;
}

export function verifyDocumentSignature(
  documentId: string,
  token: string,
  exp: number,
  now = Date.now(),
): boolean {
  if (!token || !Number.isFinite(exp) || exp < Math.floor(now / 1000)) return false;
  const expected = signValue(`${documentId}:${exp}`);
  return timingSafeEqualStrings(expected, token);
}
```

- [ ] **Step 5: Implement the download route**

Create `app/(app)/documents/[id]/download/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  getWalletDocumentBytes,
  verifyDocumentSignature,
} from "@/modules/documents/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const exp = Number(request.nextUrl.searchParams.get("exp") ?? 0);
  const sig = request.nextUrl.searchParams.get("sig") ?? "";
  if (!verifyDocumentSignature(id, sig, exp)) {
    return NextResponse.json({ error: "This link has expired or is invalid." }, { status: 410 });
  }
  try {
    const document = await getWalletDocumentBytes(id);
    return new NextResponse(new Uint8Array(document.fileData), {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Content-Length": String(document.sizeBytes),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/wallet-documents.test.ts`
Expected: PASS (5 tests). Then `npm run typecheck && npm run lint`.

- [ ] **Step 7: Commit**

```bash
git add modules/documents/service.ts modules/documents/validators.ts "app/(app)/documents/[id]/download/route.ts" tests/wallet-documents.test.ts
git commit -m "feat(documents): add wallet document service with signed download URLs"
```

---
### Task 6: Wallet actions + reuse wallet documents in applications

**Files:**
- Create: `modules/documents/actions.ts`
- Modify: `modules/applications/service.ts` (add `reuseWalletDocument`)
- Modify: `modules/applications/actions.ts` (add `reuseWalletDocumentAction`)
- Test: `tests/wallet-actions.test.ts`

**Interfaces:**
- Consumes: `uploadWalletDocument`, `deleteWalletDocument`, `getWalletDocuments`, `saveAnswers`-style ownership checks.
- Produces:
  - `uploadWalletDocumentAction(input): Promise<ActionResult<WalletDocumentView>>`
  - `deleteWalletDocumentAction(input): Promise<ActionResult<never>>`
  - `reuseWalletDocument(applicationId, formKey, fieldKey, label, walletDocumentId): Promise<void>` in the applications service
  - `reuseWalletDocumentAction(input): Promise<ActionResult<never>>`

- [ ] **Step 1: Write the failing test**

Create `tests/wallet-actions.test.ts`:

```ts
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

import { db } from "@/server/db";
import { generateId } from "@/lib/id";
import { createSession } from "@/server/auth/session";
import { uploadWalletDocumentAction, deleteWalletDocumentAction } from "@/modules/documents/actions";
import { startApplication, getApplicationByReference, reuseWalletDocument, getWalletDocuments } from "@/modules/applications/service";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  cookieJar.clear();
  await createUser();
});

async function createUser(): Promise<void> {
  const id = generateId("usr");
  await db.user.create({
    data: { id, email: `wact-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "UNVERIFIED" },
  });
  const role = await db.role.findUnique({ where: { name: "USER" } });
  if (!role) throw new Error("USER role missing; run npm run db:seed");
  await db.userRole.create({ data: { id: generateId("uro"), userId: id, roleId: role.id } });
  await createSession(id, { ipAddress: "127.0.0.1", userAgent: "vitest" });
}

function makeFile(name: string, type: string): File {
  return new File([Buffer.from("pdf-bytes")], name, { type });
}

describe("wallet actions + reuse", () => {
  it("uploads and deletes a document through the action boundary", async () => {
    const result = await uploadWalletDocumentAction({
      category: "CERTIFICATES",
      name: "Degree certificate",
      issuer: "UNILAG",
      file: makeFile("degree.pdf", "application/pdf"),
    });
    expect(result.ok).toBe(true);
    expect(result.data?.id).toBeTruthy();
    const deleted = await deleteWalletDocumentAction({ documentId: result.data!.id });
    expect(deleted.ok).toBe(true);
  });

  it("returns a typed error for a disallowed file type", async () => {
    const result = await uploadWalletDocumentAction({
      category: "OTHER",
      name: "script",
      file: makeFile("x.exe", "application/x-msdownload"),
    });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_ERROR");
  });

  it("references a wallet document from an application without re-uploading", async () => {
    const uploaded = await uploadWalletDocumentAction({
      category: "IDENTITY",
      name: "NIN slip",
      file: makeFile("nin.pdf", "application/pdf"),
    });
    expect(uploaded.ok).toBe(true);

    const service = await db.service.findUnique({ where: { slug: "business-registration" } });
    const { reference } = await startApplication(service!.id);
    const app = await getApplicationByReference(reference);

    await reuseWalletDocument(app.id, "_documents", "memorandum-articles", "Memorandum and Articles of Association", uploaded.data!.id);

    const applicationDoc = await db.applicationDocument.findFirst({
      where: { applicationId: app.id, fieldKey: "memorandum-articles" },
    });
    expect(applicationDoc).not.toBeNull();
    expect(applicationDoc!.mimeType).toBe("application/pdf");
    expect(applicationDoc!.fileData.length).toBe("pdf-bytes".length);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/wallet-actions.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `modules/documents/actions.ts`**

```ts
"use server";

import { fail, toFieldErrors, validationError, withActionResult } from "@/server/errors";
import {
  deleteWalletDocument,
  uploadWalletDocument,
} from "./service";
import { walletDocumentIdSchema, walletDocumentUploadSchema } from "./validators";

export async function uploadWalletDocumentAction(input: {
  category: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  file: File;
}) {
  const parsed = walletDocumentUploadSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  const buffer = Buffer.from(await input.file.arrayBuffer());
  return withActionResult(() =>
    uploadWalletDocument({
      category: parsed.data.category,
      name: parsed.data.name,
      issuer: parsed.data.issuer,
      issueDate: parsed.data.issueDate,
      expiryDate: parsed.data.expiryDate,
      file: { name: input.file.name, type: input.file.type, size: input.file.size, buffer },
    }),
  );
}

export async function deleteWalletDocumentAction(input: { documentId: string }) {
  const parsed = walletDocumentIdSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => deleteWalletDocument(parsed.data.documentId));
}
```

- [ ] **Step 4: Add `reuseWalletDocument` to the applications service**

In `modules/applications/service.ts`, append after `removeDocument`:

```ts
export async function reuseWalletDocument(
  applicationId: string,
  formKey: string,
  fieldKey: string,
  label: string,
  walletDocumentId: string,
): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);

  const walletDoc = await db.walletDocument.findFirst({
    where: { id: walletDocumentId, userId: user.id },
  });
  if (!walletDoc) throw new AppError("Wallet document not found.", { code: "NOT_FOUND" });

  const document = await db.applicationDocument.create({
    data: {
      id: generateId("adoc"),
      applicationId,
      formKey,
      fieldKey,
      label,
      fileName: walletDoc.fileName,
      mimeType: walletDoc.mimeType,
      sizeBytes: walletDoc.sizeBytes,
      fileData: walletDoc.fileData,
    },
  });

  const data = (application.data as Record<string, Record<string, unknown>> | null) ?? {};
  if (!data[formKey]) data[formKey] = {};
  data[formKey][fieldKey] = document.id;

  await db.applicationAnswer.upsert({
    where: { applicationId_formKey_fieldKey: { applicationId, formKey, fieldKey } },
    update: { value: document.id },
    create: {
      id: generateId("ans"),
      applicationId,
      formKey,
      fieldKey,
      value: document.id,
    },
  });

  await db.application.update({
    where: { id: applicationId },
    data: { data: data as never },
  });
}
```

- [ ] **Step 5: Add `reuseWalletDocumentAction` to the applications actions**

In `modules/applications/actions.ts`, add a schema import and action:

```ts
export async function reuseWalletDocumentAction(input: {
  applicationId: string;
  formKey: string;
  fieldKey: string;
  label: string;
  walletDocumentId: string;
}) {
  const parsed = reuseWalletDocumentSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() =>
    reuseWalletDocument(
      parsed.data.applicationId,
      parsed.data.formKey,
      parsed.data.fieldKey,
      parsed.data.label,
      parsed.data.walletDocumentId,
    ),
  );
}
```

Update imports in `actions.ts`: add `reuseWalletDocument` to the `./service` import and define `reuseWalletDocumentSchema` in `modules/applications/validators.ts`:

```ts
export const reuseWalletDocumentSchema = z.object({
  applicationId: z.string().min(1),
  formKey: z.string().min(1),
  fieldKey: z.string().min(1),
  label: z.string().min(1),
  walletDocumentId: z.string().min(1),
});
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/wallet-actions.test.ts`
Expected: PASS (3 tests). Then `npm run typecheck && npm run lint`.

- [ ] **Step 7: Commit**

```bash
git add modules/documents/actions.ts modules/applications/service.ts modules/applications/actions.ts modules/applications/validators.ts tests/wallet-actions.test.ts
git commit -m "feat(documents): add wallet actions and application document reuse"
```

---
### Task 7: Timeline service

**Files:**
- Create: `modules/timeline/service.ts`
- Test: `tests/timeline.test.ts`

**Interfaces:**
- Consumes: `identity_verifications`, `applications` + `application_status_history`, `government_service_records`, `wallet_documents` for the current user.
- Produces: `getTimeline(opts?: { limit?: number }): Promise<TimelineEvent[]>` where `TimelineEvent { id, type: "identity" | "application" | "record" | "document"; title; description: string | null; createdAt: Date; href: string | null }`.

- [ ] **Step 1: Write the failing test**

Create `tests/timeline.test.ts`:

```ts
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

import { db } from "@/server/db";
import { generateId } from "@/lib/id";
import { createSession } from "@/server/auth/session";
import { getTimeline } from "@/modules/timeline/service";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  cookieJar.clear();
  await createUser();
});

let userId: string;
async function createUser(): Promise<void> {
  const id = generateId("usr");
  userId = id;
  await db.user.create({
    data: { id, email: `tl-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "UNVERIFIED" },
  });
  const role = await db.role.findUnique({ where: { name: "USER" } });
  if (!role) throw new Error("USER role missing; run npm run db:seed");
  await db.userRole.create({ data: { id: generateId("uro"), userId: id, roleId: role.id } });
  await createSession(id, { ipAddress: "127.0.0.1", userAgent: "vitest" });
}

describe("timeline service", () => {
  it("merges identity, application, record and document events by recency", async () => {
    const provider = await db.identityProvider.findFirstOrThrow();
    await db.identityVerification.create({
      data: { id: generateId("iv"), userId, providerId: provider.id, reference: `NIN-VERIFY-${Date.now()}` },
    });
    const service = await db.service.findUnique({ where: { slug: "business-registration" }, include: { provider: true } });
    const app = await db.application.create({
      data: {
        id: generateId("app"),
        reference: `CO-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
        userId,
        serviceId: service!.id,
        workflowId: service!.workflow!.id,
        status: "APPROVED",
      },
    });
    await db.applicationStatusHistory.create({
      data: { id: generateId("ash"), applicationId: app.id, toStatus: "SUBMITTED" },
    });
    await db.applicationStatusHistory.create({
      data: { id: generateId("ash"), applicationId: app.id, toStatus: "APPROVED" },
    });
    await db.governmentServiceRecord.create({
      data: {
        id: generateId("rec"),
        userId,
        serviceId: service!.id,
        providerId: service!.provider.id,
        applicationId: app.id,
        recordType: "Business Registration",
        status: "ACTIVE",
        verificationStatus: "GOVERNMENT_VERIFIED",
        source: "CIVICONE",
      },
    });
    await db.walletDocument.create({
      data: {
        id: generateId("wdc"),
        userId,
        category: "BUSINESS",
        name: "Certificate",
        fileName: "c.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4,
        fileData: Buffer.from("demo"),
      },
    });

    const events = await getTimeline();
    const titles = events.map((e) => e.title);
    expect(titles).toContain("Identity verified");
    expect(titles).toContain("Application created");
    expect(titles).toContain("Application submitted");
    expect(titles).toContain("Application approved");
    expect(titles).toContain("Service record created");
    expect(titles).toContain("Document uploaded");

    const sorted = [...events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    expect(events.map((e) => e.id)).toEqual(sorted.map((e) => e.id));

    const limited = await getTimeline({ limit: 3 });
    expect(limited.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/timeline.test.ts`
Expected: FAIL — cannot find module `@/modules/timeline/service`.

- [ ] **Step 3: Implement the timeline service**

Create `modules/timeline/service.ts`:

```ts
import "server-only";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";

export type TimelineEventType = "identity" | "application" | "record" | "document";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string | null;
  createdAt: Date;
  href: string | null;
}

export async function getTimeline(opts?: { limit?: number }): Promise<TimelineEvent[]> {
  const user = await requireUser();

  const identityVerifications = await db.identityVerification.findMany({
    where: { userId: user.id },
    orderBy: { verifiedAt: "desc" },
  });
  const identityEvents: TimelineEvent[] = identityVerifications.map((v) => ({
    id: `identity-${v.id}`,
    type: "identity",
    title: "Identity verified",
    description: v.reference,
    createdAt: v.verifiedAt,
    href: "/profile/identity",
  }));

  const applications = await db.application.findMany({
    where: { userId: user.id },
    include: { statusHistory: true },
    orderBy: { createdAt: "desc" },
  });
  const applicationEvents: TimelineEvent[] = applications.flatMap((app) => {
    const events: TimelineEvent[] = [
      {
        id: `app-created-${app.id}`,
        type: "application",
        title: "Application created",
        description: app.reference,
        createdAt: app.createdAt,
        href: `/applications/${app.reference}`,
      },
    ];
    for (const history of app.statusHistory) {
      const title =
        history.toStatus === "SUBMITTED"
          ? "Application submitted"
          : history.toStatus === "APPROVED"
            ? "Application approved"
            : history.toStatus === "REJECTED"
              ? "Application rejected"
              : null;
      if (!title) continue;
      events.push({
        id: `status-${history.id}`,
        type: "application",
        title,
        description: app.reference,
        createdAt: history.createdAt,
        href: `/applications/${app.reference}`,
      });
    }
    return events;
  });

  const records = await db.governmentServiceRecord.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const recordEvents: TimelineEvent[] = records.map((r) => ({
    id: `record-${r.id}`,
    type: "record",
    title: "Service record created",
    description: r.recordType,
    createdAt: r.createdAt,
    href: `/records/${r.id}`,
  }));

  const documents = await db.walletDocument.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const documentEvents: TimelineEvent[] = documents.map((d) => ({
    id: `document-${d.id}`,
    type: "document",
    title: "Document uploaded",
    description: d.name,
    createdAt: d.createdAt,
    href: "/documents",
  }));

  const all = [...identityEvents, ...applicationEvents, ...recordEvents, ...documentEvents].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return opts?.limit ? all.slice(0, opts.limit) : all;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/timeline.test.ts`
Expected: PASS. Then `npm run typecheck && npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add modules/timeline/service.ts tests/timeline.test.ts
git commit -m "feat(timeline): add administrative timeline aggregation"
```

---
### Task 8: UI — My Services, record detail, document wallet, timeline, dashboard, nav

**Files:**
- Modify: `lib/navigation.ts`
- Create: `app/(app)/services/my/page.tsx`
- Create: `app/(app)/records/[id]/page.tsx`
- Create: `app/(app)/documents/page.tsx` (replace placeholder)
- Create: `app/(app)/documents/upload/page.tsx`
- Create: `app/(app)/timeline/page.tsx` (replace placeholder)
- Modify: `app/(app)/dashboard/page.tsx`
- Create: `modules/records/components/record-card.tsx`
- Create: `modules/documents/components/document-card.tsx`
- Create: `modules/documents/components/upload-document-form.tsx`
- Create: `modules/timeline/components/timeline-list.tsx`
- Create: `modules/applications/components/wallet-document-picker.tsx` (reuse control)
- Modify: `modules/applications/components/document-upload.tsx` (wallet reuse)
- Modify: `modules/applications/components/dynamic-form.tsx` (pass wallet picker)
- Modify: `modules/applications/components/step-panel.tsx` (walletDocuments prop)
- Modify: `app/(app)/applications/[reference]/page.tsx` (pass walletDocuments)

**Interfaces:**
- Consumes: `getMyServicesOverview`, `getRecordById`, `getWalletDocuments`, `DOCUMENT_CATEGORIES`, `signDocumentUrl`, `getTimeline`, `getApplicationsForUser`, `uploadWalletDocumentAction`, `deleteWalletDocumentAction`, `reuseWalletDocumentAction`.
- Produces: working `/services/my`, `/records/[id]`, `/documents`, `/documents/upload`, `/timeline`, and a wired dashboard; wallet document reuse inside application form/document steps.

- [ ] **Step 1: Update navigation**

In `lib/navigation.ts` change `PRIMARY_NAV` "My Services" href to `/services/my` and `MOBILE_NAV` "Services" href to `/services/my`.

- [ ] **Step 2: Record card component**

Create `modules/records/components/record-card.tsx`:

```tsx
import Link from "next/link";
import { ChevronRight, Landmark, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecordCardView } from "@/modules/records/service";

export function RecordCard({ record }: { record: RecordCardView }) {
  return (
    <Card className="transition-colors hover:border-foreground/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">{record.recordType}</p>
            <h3 className="text-base font-semibold text-foreground">{record.serviceName}</h3>
          </div>
          <StatusBadge status={record.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Landmark className="size-3" aria-hidden="true" />
            {record.providerAbbreviation ?? record.providerName}
          </Badge>
          {record.externalReference ? (
            <span className="text-xs text-muted-foreground">{record.externalReference}</span>
          ) : null}
        </div>
        {record.expiryDate ? (
          <p className="text-xs text-muted-foreground">Expires {record.expiryDate.toLocaleDateString()}</p>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-medium text-secondary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {record.verificationStatus === "GOVERNMENT_VERIFIED" ? "Government verified" : record.verificationStatus}
          </span>
          <Link href={`/records/${record.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View record <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: My Services page**

Create `app/(app)/services/my/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus, Layers, Archive, CheckCircle2, CalendarClock, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyServicesOverview } from "@/modules/records/service";
import { getApplicationsForUser } from "@/modules/applications/service";
import { RecordCard } from "@/modules/records/components/record-card";
import { ApplicationCard } from "@/modules/applications/components/application-card";

export const metadata: Metadata = {
  title: "My Services",
};

export default async function MyServicesPage() {
  const [overview, applications] = await Promise.all([getMyServicesOverview(), getApplicationsForUser()]);
  const active = overview.active;
  const anyRecords = active.length > 0 || overview.completed.length > 0 || overview.archived.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Services"
        description="Records issued to you and applications in progress."
        breadcrumbs={[{ label: "My Services" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/services">
              <FolderPlus aria-hidden="true" />
              Saved services
            </Link>
          </Button>
        }
      />

      {!anyRecords && applications.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" aria-hidden="true" />}
          title="Nothing here yet."
          description="When a service you apply for is approved, its record will appear here."
        />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">Active</h2>
              <span className="text-xs text-muted-foreground">({active.length})</span>
            </div>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active records.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {active.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            )}
          </section>

          {overview.expiringSoon.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-warning" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Expiring soon</h2>
                <span className="text-xs text-muted-foreground">({overview.expiringSoon.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {overview.expiringSoon.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-secondary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">Applications</h2>
              <span className="text-xs text-muted-foreground">({applications.length})</span>
            </div>
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications in progress.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {applications.map((application) => <ApplicationCard key={application.id} application={application} />)}
              </div>
            )}
          </section>

          {overview.completed.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Completed</h2>
                <span className="text-xs text-muted-foreground">({overview.completed.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {overview.completed.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            </section>
          ) : null}

          {overview.archived.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Archived</h2>
                <span className="text-xs text-muted-foreground">({overview.archived.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {overview.archived.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Record detail page**

Create `app/(app)/records/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, FileText, Landmark, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRecordById } from "@/modules/records/service";
import { signDocumentUrl } from "@/modules/documents/service";
import { APPLICATION_STATUS_LABELS } from "@/modules/applications/status";
import { RECORD_STATUS_LABELS, RECORD_VERIFICATION_LABELS, RECORD_SOURCE_LABELS } from "@/modules/records/labels";

export const metadata: Metadata = {
  title: "Record",
};

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getRecordById(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={record.recordType}
        breadcrumbs={[
          { label: "My Services", href: "/services/my" },
          { label: record.recordType },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/services/my">
              <ArrowLeft aria-hidden="true" />
              My services
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">{record.serviceName}</h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Landmark className="size-4" aria-hidden="true" />
                {record.providerName}
              </p>
            </div>
            <StatusBadge status={record.status} label={RECORD_STATUS_LABELS[record.status]} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verification</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ShieldCheck className="size-4 text-secondary" aria-hidden="true" />
                {RECORD_VERIFICATION_LABELS[record.verificationStatus]}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{RECORD_SOURCE_LABELS[record.source]}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issue date</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {record.issueDate ? record.issueDate.toLocaleDateString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expiry</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {record.expiryDate ? record.expiryDate.toLocaleDateString() : "Does not expire"}
              </dd>
            </div>
            {record.externalReference ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{record.externalReference}</dd>
              </div>
            ) : null}
            {record.officialUrl ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Provider</dt>
                <dd className="mt-1">
                  <a href={record.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Official site <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-secondary" aria-hidden="true" />
            Documents
          </CardTitle>
          <CardDescription>Certificates and files linked to this record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {record.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents linked to this record.</p>
          ) : (
            record.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {document.fileName} · {(document.sizeBytes / 1024).toFixed(0)} KB
                  </p>
                </div>
                <a href={signDocumentUrl(document.id)} className="shrink-0 text-sm font-medium text-primary hover:underline">
                  View
                </a>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {record.application ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-secondary" aria-hidden="true" />
              Related application
            </CardTitle>
            <CardDescription>The application that produced this record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{record.application.reference}</p>
              <StatusBadge status={record.application.status} label={APPLICATION_STATUS_LABELS[record.application.status as keyof typeof APPLICATION_STATUS_LABELS]} />
            </div>
            <ol className="space-y-2">
              {record.application.timeline.map((entry, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-foreground">{APPLICATION_STATUS_LABELS[entry.toStatus as keyof typeof APPLICATION_STATUS_LABELS]}</p>
                    <p className="text-xs text-muted-foreground">{entry.createdAt.toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/applications/${record.application.reference}`}>Open application</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Records label constants**

Create `modules/records/labels.ts`:

```ts
import type { RecordSource, RecordStatus, RecordVerificationStatus } from "@prisma/client";

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export const RECORD_VERIFICATION_LABELS: Record<RecordVerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  USER_ASSERTED: "User asserted",
  PENDING: "Pending verification",
  VERIFIED: "Verified",
  GOVERNMENT_VERIFIED: "Government verified",
  EXPIRED: "Verification expired",
  REJECTED: "Verification rejected",
};

export const RECORD_SOURCE_LABELS: Record<RecordSource, string> = {
  CIVICONE: "Created by CivicOne",
  USER_PROVIDED: "Provided by you",
  GOVERNMENT_API: "Government API",
  EXTERNAL_PROVIDER: "External provider",
  ADMIN_VERIFIED: "Verified by administrator",
};
```

- [ ] **Step 6: Document card + upload form**

Create `modules/documents/components/document-card.tsx`:

```tsx
import Link from "next/link";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { signDocumentUrl, type WalletDocumentView } from "@/modules/documents/service";
import { DOCUMENT_CATEGORY_LABELS } from "@/modules/documents/labels";

export function DocumentCard({ document }: { document: WalletDocumentView }) {
  return (
    <Card className="transition-colors hover:border-foreground/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {DOCUMENT_CATEGORY_LABELS[document.category]}
            </p>
            <h3 className="text-base font-semibold text-foreground">{document.name}</h3>
          </div>
          <Badge variant="outline">
            <FileText className="size-3" aria-hidden="true" />
            {document.mimeType.split("/")[1]?.toUpperCase() ?? "FILE"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {document.fileName} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB
        </p>
        {document.issuer ? <p className="text-xs text-muted-foreground">Issued by {document.issuer}</p> : null}
        {document.expiryDate ? (
          <p className="text-xs text-muted-foreground">Expires {document.expiryDate.toLocaleDateString()}</p>
        ) : null}
        {document.verificationStatus === "GOVERNMENT_VERIFIED" ? (
          <span className="flex items-center gap-1 text-xs font-medium text-secondary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Government verified
          </span>
        ) : null}
        <Link
          href={signDocumentUrl(document.id)}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Download className="size-4" aria-hidden="true" />
          View document
        </Link>
      </CardContent>
    </Card>
  );
}
```

Create `modules/documents/labels.ts`:

```ts
import type { DocumentCategory } from "@prisma/client";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  IDENTITY: "Identity",
  CERTIFICATES: "Certificates",
  LICENCES: "Licences",
  BUSINESS: "Business",
  TAX: "Tax",
  EDUCATION: "Education",
  PROPERTY: "Property",
  EMPLOYMENT: "Employment",
  OTHER: "Other",
};
```

Create `modules/documents/components/upload-document-form.tsx`:

```tsx
"use client";

import * as React from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadWalletDocumentAction } from "@/modules/documents/actions";
import { DOCUMENT_CATEGORIES } from "@/modules/documents/service";

export function UploadDocumentForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState("OTHER");
  const [name, setName] = React.useState("");
  const [issuer, setIssuer] = React.useState("");
  const [issueDate, setIssueDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);

  async function submit() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await uploadWalletDocumentAction({
      category,
      name,
      issuer,
      issueDate,
      expiryDate,
      file,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Upload failed.");
      return;
    }
    router.push("/documents");
    router.refresh();
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <FormField label="Category" htmlFor="category" required>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Document name" htmlFor="name" required>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Degree certificate" />
      </FormField>

      <FormField label="File" htmlFor="file" required hint="PDF, JPG, PNG or WEBP — up to 5 MB.">
        <input
          ref={inputRef}
          id="file"
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? <p className="mt-1 text-xs text-muted-foreground">{file.name} · {Math.max(1, Math.round(file.size / 1024))} KB</p> : null}
      </FormField>

      <FormField label="Issuer" htmlFor="issuer" hint="Optional — e.g. University of Lagos.">
        <Input id="issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Issue date" htmlFor="issueDate">
          <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </FormField>
        <FormField label="Expiry date" htmlFor="expiryDate">
          <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </FormField>
      </div>

      {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !file}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}
          Upload document
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 7: Documents wallet page + upload page**

Replace `app/(app)/documents/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getWalletDocuments, DOCUMENT_CATEGORIES } from "@/modules/documents/service";
import { DocumentCard } from "@/modules/documents/components/document-card";
import { DOCUMENT_CATEGORY_LABELS } from "@/modules/documents/labels";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const documents = await getWalletDocuments({ category });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Your private document wallet. Files are stored privately and never shared publicly."
        breadcrumbs={[{ label: "Documents" }]}
        actions={
          <Button asChild>
            <Link href="/documents/upload">
              <UploadCloud aria-hidden="true" />
              Upload document
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/documents"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!category ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/25"}`}
        >
          All
        </Link>
        {DOCUMENT_CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/documents?category=${c.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === c.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/25"}`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-5" aria-hidden="true" />}
          title="No documents in this category."
          description="Upload a document or approve an application to receive certificates here."
          action={
            <Button asChild>
              <Link href="/documents/upload">Upload a document</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `app/(app)/documents/upload/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadDocumentForm } from "@/modules/documents/components/upload-document-form";

export const metadata: Metadata = {
  title: "Upload document",
};

export default function UploadDocumentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload document"
        breadcrumbs={[
          { label: "Documents", href: "/documents" },
          { label: "Upload" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/documents">
              <ArrowLeft aria-hidden="true" />
              Back to documents
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-5 sm:p-6">
          <UploadDocumentForm />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 8: Timeline page**

Replace `app/(app)/timeline/page.tsx`:

```tsx
import type { Metadata } from "next";
import { History } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getTimeline } from "@/modules/timeline/service";
import { TimelineList } from "@/modules/timeline/components/timeline-list";

export const metadata: Metadata = {
  title: "Timeline",
};

export default async function TimelinePage() {
  const events = await getTimeline();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        description="A chronological record of everything you've initiated and managed."
        breadcrumbs={[{ label: "Timeline" }]}
      />
      {events.length === 0 ? (
        <EmptyState
          icon={<History className="size-5" aria-hidden="true" />}
          title="Your timeline is empty."
          description="Actions, applications and records will be listed here as you use CivicOne."
        />
      ) : (
        <TimelineList events={events} />
      )}
    </div>
  );
}
```

Create `modules/timeline/components/timeline-list.tsx`:

```tsx
import Link from "next/link";
import { CheckCircle2, FileText, FolderOpen, Landmark } from "lucide-react";
import type { TimelineEvent } from "@/modules/timeline/service";

const ICONS = {
  identity: CheckCircle2,
  application: FileText,
  record: Landmark,
  document: FolderOpen,
} as const;

export function TimelineList({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const Icon = ICONS[event.type];
        return (
          <li key={event.id} className="flex gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              {event.description ? <p className="text-sm text-muted-foreground">{event.description}</p> : null}
              <p className="text-xs text-muted-foreground">{event.createdAt.toLocaleString()}</p>
              {event.href ? (
                <Link href={event.href} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                  View details
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 9: Wallet document picker + reuse in application steps**

Create `modules/applications/components/wallet-document-picker.tsx`:

```tsx
"use client";

import * as React from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reuseWalletDocumentAction } from "@/modules/applications/actions";
import type { WalletDocumentView } from "@/modules/documents/service";

export function WalletDocumentPicker({
  applicationId,
  formKey,
  fieldKey,
  label,
  walletDocuments,
  onUsed,
}: {
  applicationId: string;
  formKey: string;
  fieldKey: string;
  label: string;
  walletDocuments: WalletDocumentView[];
  onUsed: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string>("");

  if (walletDocuments.length === 0) return null;

  async function useDocument() {
    if (!selected) return;
    setPending(true);
    setError(null);
    const result = await reuseWalletDocumentAction({
      applicationId,
      formKey,
      fieldKey,
      label,
      walletDocumentId: selected,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Could not use the wallet document.");
      return;
    }
    onUsed();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Choose a wallet document" />
          </SelectTrigger>
          <SelectContent>
            {walletDocuments.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void useDocument()} disabled={pending || !selected}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FolderOpen className="size-4" aria-hidden="true" />}
          Use document
        </Button>
      </div>
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
```

Modify `modules/applications/components/document-upload.tsx` to accept an optional `walletDocuments` prop and render the picker when no document is attached. Add to props: `walletDocuments?: WalletDocumentView[]`, import `WalletDocumentPicker` and the type, and inside the `else` branch (no attached doc) render:

```tsx
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={...} />
            <Button ...>Upload</Button>
          </div>
          {walletDocuments && walletDocuments.length > 0 ? (
            <p className="text-xs font-medium text-secondary">
              Use document from your CivicOne Wallet
            </p>
          ) : null}
          <WalletDocumentPicker
            applicationId={applicationId}
            formKey={formKey}
            fieldKey={fieldKey}
            label={label}
            walletDocuments={walletDocuments ?? []}
            onUsed={onChanged}
          />
        </div>
      )}
```

Modify `modules/applications/components/dynamic-form.tsx` to accept `walletDocuments?: WalletDocumentView[]` and forward it to `DocumentUpload` for file/existing-document fields.

Modify `modules/applications/components/step-panel.tsx` to accept `walletDocuments: WalletDocumentView[]` and pass it into `DynamicForm` and the DOCUMENTS step `DocumentUpload`s.

Modify `app/(app)/applications/[reference]/page.tsx`: import `getWalletDocuments` and pass `walletDocuments={await getWalletDocuments()}` into `StepPanel`.

- [ ] **Step 10: Wire the dashboard**

Modify `app/(app)/dashboard/page.tsx`:

- Import `getWalletDocuments`, `signDocumentUrl` from documents service; `getMyServicesOverview` from records service; `getTimeline` from timeline service; `getApplicationsForUser` from applications service; `Link` already imported.
- After `identityStatus`, load data:

```tsx
  const [applications, documents, timeline, overview] = await Promise.all([
    getApplicationsForUser(),
    getWalletDocuments({ limit: 4 }),
    getTimeline({ limit: 5 }),
    getMyServicesOverview(),
  ]);
  const expiringSoon = overview.expiringSoon;
```

- Replace the "My Services" card's `EmptyState` with: if `overview.active.length > 0` render a list of active records (name + link to `/records/{id}`) and a count line; else keep the empty state. Add an action link to `/services/my` in the `SectionHeader` (`actionLabel="View"`, `actionHref="/services/my"`).
- Replace the "My Applications" card: if `applications.length > 0`, list the latest 3 applications (reference → `/applications/{reference}`); else keep empty state. Set action `View records` → `/applications`.
- Replace the "My Documents" card: if `documents.length > 0`, list latest 4 (name → `signDocumentUrl(id)`); else keep empty state.
- Replace the "Upcoming" card: if `expiringSoon.length > 0`, list record types with expiry dates (link `/records/{id}`); else keep empty state.
- Replace the "Recent Activity" card: if `timeline.length > 0`, list latest events (title → href); else keep empty state.

- [ ] **Step 11: Run checks + commit**

```bash
npm run typecheck
npm run lint
npm run build
git add lib/navigation.ts "app/(app)/services/my/page.tsx" "app/(app)/records/[id]/page.tsx" "app/(app)/documents/page.tsx" "app/(app)/documents/upload/page.tsx" "app/(app)/timeline/page.tsx" "app/(app)/dashboard/page.tsx" modules/records/components modules/records/labels.ts modules/documents/components modules/documents/labels.ts modules/timeline/components modules/applications/components/wallet-document-picker.tsx modules/applications/components/document-upload.tsx modules/applications/components/dynamic-form.tsx modules/applications/components/step-panel.tsx "app/(app)/applications/[reference]/page.tsx"
git commit -m "feat(records): add my services, record detail, document wallet, timeline and dashboard UI"
```

---
### Task 9: README, full checks, smoke test, push

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README**

- Change the intro line to mention Phase 5 (service records + document wallet + timeline).
- In the data-model section add:
```
- `government_service_records` — permanent records issued from approved applications (source CIVICONE, verification GOVERNMENT_VERIFIED in the demo).
- `wallet_documents` — private document wallet; files stored as bytes in the DB (object-storage stand-in for this demo), downloaded only via short-lived signed URLs.
```
- Add a **Phase 5** paragraph:
```
**Service records & wallet (Phase 5)**: approved applications automatically produce a `GovernmentServiceRecord` (e.g. a Business Registration) plus a certificate PDF stored in the user's document wallet. `/services/my` groups records into Active / Expiring soon / Applications / Completed / Archived; `/records/[id]` shows the full record with linked documents and the originating application. The document wallet (`/documents`) accepts PDF/JPG/PNG/WEBP up to 5 MB, stored privately with per-file categories and metadata; files are only reachable through short-lived signed URLs. The `/timeline` page aggregates identity verification, application, record and document events. This completes the central CivicOne loop: verify identity → apply → approval → record created → document stored → record in My Services → record on the timeline.
```
- Update "Not built yet" to note Phase 6 (payments, consent sharing, admin consoles, real provider integrations).

- [ ] **Step 2: Run the full checks**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
Expected: all green.

- [ ] **Step 3: Smoke test the dev server**

Start the dev server in a background terminal, confirm `/` returns 200 and `/applications` redirects to login when unauthenticated, then stop it.

- [ ] **Step 4: Commit + push**

```bash
git add README.md
git commit -m "docs: document the Phase 5 service records and document wallet"
git push origin 260821-feat-service-catalogue-phase3
```

---
## Self-Review

**Spec coverage:**
- `GovernmentServiceRecord` with all required fields + verification/source enums — Task 1.
- My Services `/services/my` grouped into Active, Completed, Expiring soon, Applications, Archived — Tasks 4, 8.
- Document wallet `/documents` with PDF/JPG/PNG/WEBP, 9 categories, private storage, short-lived signed URLs, metadata (name/type/issuer/issue/expiry/verification/source) — Tasks 5, 8.
- Document reuse in applications ("Use document from your CivicOne Wallet", no duplicate uploads) — Task 6, Step 8.9.
- Administrative timeline `/timeline` (identity verified, application created/submitted/approved, record created, document uploaded) — Task 7, Step 8.8.
- Record detail `/records/[id]` (record, provider, status, verification, issue/expiry, documents, related application + timeline) — Task 4, Step 8.4.
- Demo: CAC approval creates record (Active), adds certificate to wallet, updates timeline + dashboard — Tasks 3, 8.
- Definition of done (verify → apply → approve → record → document → My Services → timeline) — Tasks 3, 8.

**Placeholder scan:** No TBDs; every step carries full code.

**Type consistency:** `WalletDocumentView` defined once in `modules/documents/service.ts` and imported by records components, application components and the picker; `RecordCardView`/`RecordDetailView` from `modules/records/service.ts`; `TimelineEvent` from `modules/timeline/service.ts`; permission names `RECORDS_SELF`/`DOCUMENTS_SELF` consistent between `rbac.ts` and services.
