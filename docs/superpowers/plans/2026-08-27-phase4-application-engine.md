# Phase 4: Generic Public-Service Application Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic, configuration-driven application engine that separates an *application* (an attempt to obtain a service) from a *government service record* (Phase 5), so users can start, complete, submit and track applications against the Phase 3 service catalogue.

**Architecture:** New `modules/applications/` module with a Prisma data layer (Application, answers, status history, documents, workflows, form definitions), a pure shared form-config + Zod generator (used by both RSC and client), three deterministic mock providers (CAC, Passport, Driver Licence), a workflow step engine, and `/applications` list + detail pages. The service detail page gains a "Start application" CTA when a service has an active workflow. Identity reuse reads the existing Phase 2 `identityProfile` to pre-fill and lock verified fields.

**Tech Stack:** Next.js 15 App Router (RSC + Server Actions), Prisma 6 + PostgreSQL 15, Zod, react-hook-form + `@hookform/resolvers`, Vitest, Tailwind CSS v4, shadcn-style primitives in `components/ui`.

## Global Constraints

- Do not rebuild Phase 1–3 systems; extend the existing catalogue and identity layers.
- Application reference format is `CO-<year>-<6-digit sequence>`, e.g. `CO-2026-000001`. Never use a NIN as an application reference.
- Statuses are exactly: `DRAFT, READY, PAYMENT_PENDING, SUBMITTED, UNDER_REVIEW, ACTION_REQUIRED, APPROVED, REJECTED, COMPLETED, CANCELLED`.
- Step types are exactly: `ELIGIBILITY, FORM, DOCUMENTS, REVIEW, PAYMENT, SUBMISSION, STATUS, COMPLETION`.
- Forms are configuration-driven (stored in DB, rendered from config). Do not hard-code per-service forms.
- Identity-verified fields are pre-filled, marked "Verified identity information", and never directly editable; the server overwrites them with the verified value.
- No permanent government service records in this phase (Phase 5).
- Every task ends with typecheck + lint + test green and a commit.
- `APPLICATIONS_SELF` permission already exists on USER/PROFESSIONAL/SUPER_ADMIN — reuse it.
- Migration must be written by hand and applied with `npx prisma migrate deploy` (the shadow-DB diff drops the pre-existing `search_vector` column). Regenerate the client with `npx prisma generate`.
- Existing conventions: `generateId("prefix")`, `@@map` snake_case tables, `server-only` service layer, `AppError` / `withActionResult`, `FormField` wrapper for form controls.

---
### Task 1: Phase 4 schema, migration, reference generator, and status labels

**Files:**
- Modify: `prisma/schema.prisma` (enums + 8 models + relations on `Service` and `User`)
- Create: `prisma/migrations/20260827000000_applications_phase4/migration.sql`
- Create: `modules/applications/status.ts` (label + tone maps for the UI and tests)
- Create: `tests/applications-reference.test.ts`
- Modify: `modules/applications/README.md`

**Interfaces:**
- Consumes: `generateId`, `db`.
- Produces: Prisma enums `ApplicationStatus`, `WorkflowStepType`; models `ServiceWorkflow`, `ServiceWorkflowStep`, `ServiceFormDefinition`, `Application`, `ApplicationAnswer`, `ApplicationStatusHistory`, `ApplicationDocument`, `ApplicationCounter`; function `nextApplicationReference(): Promise<string>`; maps `APPLICATION_STATUS_LABELS`, `APPLICATION_STATUS_TONES`.

- [ ] **Step 1: Write the failing reference test**

Create `tests/applications-reference.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { nextApplicationReference } from "@/modules/applications/reference";

describe("application reference", () => {
  it("generates CO-<year>-<6-digit> references", async () => {
    const year = new Date().getFullYear();
    const ref = await nextApplicationReference();
    expect(ref).toMatch(new RegExp(`^CO-${year}-\\d{6}$`));
  });

  it("increments sequentially", async () => {
    const a = await nextApplicationReference();
    const b = await nextApplicationReference();
    const seqA = Number(a.split("-")[2]);
    const seqB = Number(b.split("-")[2]);
    expect(seqB).toBe(seqA + 1);
  });

  afterAll(async () => {
    await db.$disconnect();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/applications-reference.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the enums and models to `prisma/schema.prisma`**

Add these enums before `model ServiceCategory`:

```prisma
enum ApplicationStatus {
  DRAFT
  READY
  PAYMENT_PENDING
  SUBMITTED
  UNDER_REVIEW
  ACTION_REQUIRED
  APPROVED
  REJECTED
  COMPLETED
  CANCELLED
}

enum WorkflowStepType {
  ELIGIBILITY
  FORM
  DOCUMENTS
  REVIEW
  PAYMENT
  SUBMISSION
  STATUS
  COMPLETION
}
```

Add relations to the existing `Service` model (after the `savedBy` line):

```prisma
  workflow     ServiceWorkflow?
  applications Application[]
```

Add to the existing `User` model:

```prisma
  applications Application[]
```

Append these models at the end of the file:

```prisma
model ServiceWorkflow {
  id        String   @id @db.VarChar(64)
  serviceId String   @unique @map("service_id") @db.VarChar(64)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  service      Service                @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  steps        ServiceWorkflowStep[]
  applications Application[]

  @@map("service_workflows")
}

model ServiceWorkflowStep {
  id          String           @id @db.VarChar(64)
  workflowId  String           @map("workflow_id") @db.VarChar(64)
  type        WorkflowStepType
  title       String           @db.VarChar(160)
  description String?          @db.Text
  config      Json?
  sortOrder   Int              @default(0) @map("sort_order")
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  workflow ServiceWorkflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@index([workflowId])
  @@map("service_workflow_steps")
}

model ServiceFormDefinition {
  id        String   @id @db.VarChar(64)
  key       String   @unique @db.VarChar(80)
  name      String   @db.VarChar(160)
  config    Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("service_form_definitions")
}

model Application {
  id            String            @id @db.VarChar(64)
  reference     String            @unique @db.VarChar(32)
  userId        String            @map("user_id") @db.VarChar(64)
  serviceId     String            @map("service_id") @db.VarChar(64)
  workflowId    String            @map("workflow_id") @db.VarChar(64)
  status        ApplicationStatus
  currentStepId String?           @map("current_step_id") @db.VarChar(64)
  data          Json?
  providerRef   String?           @map("provider_ref") @db.VarChar(80)
  providerName  String?           @map("provider_name") @db.VarChar(40)
  submittedAt   DateTime?         @map("submitted_at")
  completedAt   DateTime?         @map("completed_at")
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")

  user          User                         @relation(fields: [userId], references: [id], onDelete: Cascade)
  service       Service                      @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  workflow      ServiceWorkflow              @relation(fields: [workflowId], references: [id], onDelete: Restrict)
  answers       ApplicationAnswer[]
  statusHistory ApplicationStatusHistory[]
  documents     ApplicationDocument[]

  @@index([userId])
  @@index([serviceId])
  @@index([status])
  @@map("applications")
}

model ApplicationAnswer {
  id            String @id @db.VarChar(64)
  applicationId String @map("application_id") @db.VarChar(64)
  formKey       String @map("form_key") @db.VarChar(80)
  fieldKey      String @map("field_key") @db.VarChar(120)
  value         Json?
  verified      Boolean @default(false)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@unique([applicationId, formKey, fieldKey])
  @@index([applicationId])
  @@map("application_answers")
}

model ApplicationStatusHistory {
  id            String             @id @db.VarChar(64)
  applicationId String             @map("application_id") @db.VarChar(64)
  fromStatus    ApplicationStatus? @map("from_status")
  toStatus      ApplicationStatus  @map("to_status")
  reason        String?            @db.VarChar(255)
  actorUserId   String?            @map("actor_user_id") @db.VarChar(64)
  createdAt     DateTime           @default(now()) @map("created_at")

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@map("application_status_history")
}

model ApplicationDocument {
  id            String   @id @db.VarChar(64)
  applicationId String   @map("application_id") @db.VarChar(64)
  formKey       String   @map("form_key") @db.VarChar(80)
  fieldKey      String   @map("field_key") @db.VarChar(120)
  label         String   @db.VarChar(200)
  fileName      String   @map("file_name") @db.VarChar(255)
  mimeType      String   @map("mime_type") @db.VarChar(100)
  sizeBytes     Int      @map("size_bytes")
  fileData      Bytes    @map("file_data")
  createdAt     DateTime @default(now()) @map("created_at")

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@map("application_documents")
}

model ApplicationCounter {
  year Int @id
  seq  Int

  @@map("application_counters")
}
```

- [ ] **Step 4: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: Prisma Client regenerated, no errors.

- [ ] **Step 5: Write the migration by hand**

Create `prisma/migrations/20260827000000_applications_phase4/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'READY', 'PAYMENT_PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('ELIGIBILITY', 'FORM', 'DOCUMENTS', 'REVIEW', 'PAYMENT', 'SUBMISSION', 'STATUS', 'COMPLETION');

-- CreateTable
CREATE TABLE "service_workflows" (
    "id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_workflow_steps" (
    "id" VARCHAR(64) NOT NULL,
    "workflow_id" VARCHAR(64) NOT NULL,
    "type" "WorkflowStepType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_form_definitions" (
    "id" VARCHAR(64) NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" VARCHAR(64) NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "workflow_id" VARCHAR(64) NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "current_step_id" VARCHAR(64),
    "data" JSONB,
    "provider_ref" VARCHAR(80),
    "provider_name" VARCHAR(40),
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_answers" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "form_key" VARCHAR(80) NOT NULL,
    "field_key" VARCHAR(120) NOT NULL,
    "value" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "from_status" "ApplicationStatus",
    "to_status" "ApplicationStatus" NOT NULL,
    "reason" VARCHAR(255),
    "actor_user_id" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "form_key" VARCHAR(80) NOT NULL,
    "field_key" VARCHAR(120) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "file_data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_counters" (
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    CONSTRAINT "application_counters_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_workflows_service_id_key" ON "service_workflows"("service_id");

-- CreateIndex
CREATE INDEX "service_workflow_steps_workflow_id_idx" ON "service_workflow_steps"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_form_definitions_key_key" ON "service_form_definitions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "applications_reference_key" ON "applications"("reference");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE INDEX "applications_service_id_idx" ON "applications"("service_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "application_answers_application_id_form_key_field_key_key" ON "application_answers"("application_id", "form_key", "field_key");

-- CreateIndex
CREATE INDEX "application_answers_application_id_idx" ON "application_answers"("application_id");

-- CreateIndex
CREATE INDEX "application_status_history_application_id_idx" ON "application_status_history"("application_id");

-- CreateIndex
CREATE INDEX "application_documents_application_id_idx" ON "application_documents"("application_id");

-- AddForeignKey
ALTER TABLE "service_workflows" ADD CONSTRAINT "service_workflows_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_workflow_steps" ADD CONSTRAINT "service_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "service_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "service_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 6: Apply the migration to both databases**

```bash
npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
```

Expected: `20260827000000_applications_phase4` applied to both. Confirm `application_counters` exists.

- [ ] **Step 7: Implement the reference generator**

Create `modules/applications/reference.ts`:

```ts
import "server-only";
import { db } from "@/server/db";

/**
 * Allocate the next sequential application reference.
 *
 * References look like `CO-2026-000001`. Sequence allocation uses a single
 * atomic UPSERT on the per-year counter so concurrent starts cannot collide.
 */
export async function nextApplicationReference(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db.$queryRaw<Array<{ seq: number }>>`
    INSERT INTO "application_counters" ("year", "seq")
    VALUES (${year}, 1)
    ON CONFLICT ("year")
    DO UPDATE SET "seq" = "application_counters"."seq" + 1
    RETURNING "seq"
  `;
  const seq = rows[0]?.seq ?? 1;
  return `CO-${year}-${String(seq).padStart(6, "0")}`;
}
```

- [ ] **Step 8: Create the status label/tone maps**

Create `modules/applications/status.ts`:

```ts
import type { ApplicationStatus } from "@prisma/client";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready to submit",
  PAYMENT_PENDING: "Payment pending",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ACTION_REQUIRED: "Action required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const APPLICATION_STATUS_TONES: Record<
  ApplicationStatus,
  "neutral" | "info" | "warning" | "success" | "error" | "secondary"
> = {
  DRAFT: "neutral",
  READY: "info",
  PAYMENT_PENDING: "warning",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  ACTION_REQUIRED: "warning",
  APPROVED: "success",
  REJECTED: "error",
  COMPLETED: "success",
  CANCELLED: "neutral",
};
```

- [ ] **Step 9: Run the reference test + checks + commit**

```bash
npx vitest run tests/applications-reference.test.ts
npm run typecheck
npm run lint
```

Expected: reference test PASSES, typecheck/lint clean.
Then update `modules/applications/README.md` with a one-line "Phase 4" note and commit:

```bash
git add prisma/schema.prisma prisma/migrations/20260827000000_applications_phase4 modules/applications/reference.ts modules/applications/status.ts tests/applications-reference.test.ts modules/applications/README.md
git commit -m "feat(applications): add application schema, migration and reference generator"
```

---
### Task 2: Form configuration + shared Zod schema generator

**Files:**
- Create: `modules/applications/form-config.ts`
- Create: `tests/form-config.test.ts`

**Interfaces:**
- Consumes: nothing external (pure Zod).
- Produces: `FormFieldType`, `FormField`, `FormDefinition`, `VerifiedIdentity`, `buildFormSchema(definition): ZodType`, `buildIdentityPrefill(fields, identity): Record<string,string>`, `applyIdentityAnswers(fields, values, identity): Record<string,unknown>`.

- [ ] **Step 1: Write the failing tests**

Create `tests/form-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildFormSchema,
  buildIdentityPrefill,
  applyIdentityAnswers,
  type FormDefinition,
} from "@/modules/applications/form-config";

const personalDetails: FormDefinition = {
  key: "personal-details",
  name: "Personal details",
  fields: [
    { key: "fullName", label: "Full name", type: "text", required: true, identityField: "legalName" },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "phone", label: "Phone", type: "phone", required: false },
    { key: "age", label: "Age", type: "number", required: false, min: 18, max: 120 },
    { key: "dob", label: "Date of birth", type: "date", required: false },
    { key: "nationality", label: "Nationality", type: "select", required: true, options: [{ label: "Nigeria", value: "nigeria" }, { label: "Other", value: "other" }] },
    { key: "newsletter", label: "Newsletter", type: "checkbox", required: false },
    { key: "doc", label: "Document", type: "file", required: false },
  ],
};

describe("buildFormSchema", () => {
  it("accepts valid answers", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({
      fullName: "Ada Obi",
      email: "ada@example.com",
      nationality: "nigeria",
      newsletter: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({ email: "ada@example.com" });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({
      fullName: "Ada Obi",
      email: "not-an-email",
      nationality: "nigeria",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects out-of-range numbers", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({
      fullName: "Ada Obi",
      email: "ada@example.com",
      nationality: "nigeria",
      age: 12,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an empty string for optional fields", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({
      fullName: "Ada Obi",
      email: "ada@example.com",
      nationality: "nigeria",
      phone: "",
      age: "",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("identity helpers", () => {
  const identity = { legalName: "Ada Obi", dateOfBirth: "1990-05-01", nationality: "Nigeria", gender: "Female" };

  it("builds a prefill map for verified fields only", () => {
    const prefill = buildIdentityPrefill(personalDetails.fields, identity);
    expect(prefill).toEqual({ fullName: "Ada Obi" });
  });

  it("returns an empty prefill when identity is not verified", () => {
    expect(buildIdentityPrefill(personalDetails.fields, null)).toEqual({});
  });

  it("overwrites submitted values with verified identity values", () => {
    const values = applyIdentityAnswers(personalDetails.fields, { fullName: "Wrong Name", email: "ada@example.com" }, identity);
    expect(values.fullName).toBe("Ada Obi");
    expect(values.email).toBe("ada@example.com");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/form-config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `form-config.ts`**

Create `modules/applications/form-config.ts`:

```ts
import { z } from "zod";

export const FIELD_TYPES = [
  "text", "textarea", "number", "date", "select", "radio",
  "checkbox", "multi-select", "phone", "email", "address",
  "file", "existing-document",
] as const;
export type FormFieldType = (typeof FIELD_TYPES)[number];

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: FormFieldOption[];
  identityField?: "legalName" | "dateOfBirth" | "nationality" | "gender";
  maxLength?: number;
  min?: number;
  max?: number;
  accept?: string;
}

export interface FormDefinition {
  key: string;
  name: string;
  fields: FormField[];
}

export interface VerifiedIdentity {
  legalName: string;
  dateOfBirth: string;
  nationality: string;
  gender: string;
}

function fieldBaseSchema(field: FormField): z.ZodTypeAny {
  switch (field.type) {
    case "number": {
      let s = z.coerce.number({ message: "Enter a valid number" });
      if (field.min !== undefined) s = s.min(field.min, `Must be at least ${field.min}`);
      if (field.max !== undefined) s = s.max(field.max, `Must be at most ${field.max}`);
      return s;
    }
    case "date":
      return z.string().refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: "Enter a valid date",
      });
    case "email":
      return z.string().email("Enter a valid email address");
    case "phone":
      return z.string().regex(/^\+?[0-9\s()-]{7,15}$/, "Enter a valid phone number");
    case "checkbox":
      return z.boolean();
    case "multi-select":
      return z.array(z.string());
    case "select":
    case "radio":
      return z.string();
    case "file":
    case "existing-document":
      return z.string();
    default:
      return z.string();
  }
}

function buildFieldSchema(field: FormField): z.ZodTypeAny {
  const required = field.required ?? false;
  let base = fieldBaseSchema(field);

  if (field.type === "checkbox" && required) {
    base = z.boolean().refine((v) => v === true, "You must confirm this");
  }
  if (field.type === "multi-select" && required) {
    base = z.array(z.string()).min(1, "Select at least one option");
  }
  if (
    required &&
    (field.type === "text" || field.type === "textarea" || field.type === "address" ||
     field.type === "select" || field.type === "radio" || field.type === "file" ||
     field.type === "existing-document" || field.type === "phone" || field.type === "email")
  ) {
    base = (base as z.ZodString).min(1, "This field is required");
  }
  if (field.maxLength && (base as z.ZodString).min) {
    base = (base as z.ZodString).max(field.maxLength, `Must be ${field.maxLength} characters or fewer`);
  }

  if (!required && field.type !== "checkbox") {
    base = base.optional().or(z.literal(""));
  }

  return base;
}

export function buildFormSchema(definition: FormDefinition): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of definition.fields) {
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}

export function buildIdentityPrefill(
  fields: FormField[],
  identity: VerifiedIdentity | null,
): Record<string, string> {
  const prefill: Record<string, string> = {};
  if (!identity) return prefill;
  for (const field of fields) {
    if (field.identityField && identity[field.identityField]) {
      prefill[field.key] = identity[field.identityField];
    }
  }
  return prefill;
}

export function applyIdentityAnswers(
  fields: FormField[],
  values: Record<string, unknown>,
  identity: VerifiedIdentity | null,
): Record<string, unknown> {
  const out = { ...values };
  if (!identity) return out;
  for (const field of fields) {
    if (field.identityField && identity[field.identityField]) {
      out[field.key] = identity[field.identityField];
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests + checks + commit**

```bash
npx vitest run tests/form-config.test.ts
npm run typecheck
npm run lint
git add modules/applications/form-config.ts tests/form-config.test.ts
git commit -m "feat(applications): add configuration-driven form schema generator"
```

---
### Task 3: Workflow step config parsing + mock providers

**Files:**
- Create: `modules/applications/workflow-config.ts`
- Create: `modules/applications/providers.ts`
- Create: `tests/applications-providers.test.ts`

**Interfaces:**
- Consumes: `ApplicationStatus` enum.
- Produces: typed step config schemas (`eligibilityConfigSchema`, `formConfigSchema`, `documentsConfigSchema`, `paymentConfigSchema`, `submissionConfigSchema`); `parseWorkflowStepConfig(step)`; `MockProvider`, `getMockProvider(id)`, `MockProviderId`.

- [ ] **Step 1: Write the failing tests**

Create `tests/applications-providers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getMockProvider } from "@/modules/applications/providers";

const ctx = {
  reference: "CO-2026-000001",
  providerRef: null as string | null,
  status: "SUBMITTED" as const,
};

describe("mock providers", () => {
  it("exposes all three demo providers", () => {
    expect(getMockProvider("MOCK_CAC").id).toBe("MOCK_CAC");
    expect(getMockProvider("MOCK_PASSPORT").id).toBe("MOCK_PASSPORT");
    expect(getMockProvider("MOCK_DRIVER_LICENCE").id).toBe("MOCK_DRIVER_LICENCE");
  });

  it("throws for unknown providers", () => {
    expect(() => getMockProvider("NOPE" as never)).toThrow();
  });

  it("submits and returns a provider reference", async () => {
    const cac = getMockProvider("MOCK_CAC");
    const result = await cac.submit(ctx);
    expect(result.providerRef).toMatch(/^CAC-/);
  });

  it("progresses CAC through review to approval", async () => {
    const cac = getMockProvider("MOCK_CAC");
    let status = "SUBMITTED" as const;
    const outcomes: string[] = [];
    while (status !== "APPROVED" && status !== "REJECTED") {
      const next = await cac.advance({ ...ctx, providerRef: "CAC-x", status });
      status = next.status;
      outcomes.push(status);
    }
    expect(outcomes).toContain("UNDER_REVIEW");
    expect(outcomes[outcomes.length - 1]).toBe("APPROVED");
  });

  it("can force a rejection outcome", async () => {
    const cac = getMockProvider("MOCK_CAC");
    const next = await cac.advance(
      { ...ctx, providerRef: "CAC-x", status: "UNDER_REVIEW" as const },
      { forceOutcome: "REJECTED" },
    );
    expect(next.status).toBe("REJECTED");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/applications-providers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `workflow-config.ts`**

Create `modules/applications/workflow-config.ts`:

```ts
import { z } from "zod";
import type { WorkflowStepType } from "@prisma/client";

export const eligibilityConfigSchema = z.object({
  confirmLabel: z.string().optional(),
  eligibilityText: z.string().optional(),
});
export type EligibilityConfig = z.infer<typeof eligibilityConfigSchema>;

export const formConfigSchema = z.object({ formKey: z.string() });
export type FormConfig = z.infer<typeof formConfigSchema>;

export const documentsConfigSchema = z.object({
  documents: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      required: z.boolean().optional().default(true),
      accept: z.string().optional(),
    }),
  ),
});
export type DocumentsConfig = z.infer<typeof documentsConfigSchema>;

export const paymentConfigSchema = z.object({
  demo: z.boolean().optional().default(true),
});
export type PaymentConfig = z.infer<typeof paymentConfigSchema>;

export const submissionConfigSchema = z.object({
  provider: z.enum(["MOCK_CAC", "MOCK_PASSPORT", "MOCK_DRIVER_LICENCE"]),
});
export type SubmissionConfig = z.infer<typeof submissionConfigSchema>;

export interface WorkflowStepView {
  id: string;
  type: WorkflowStepType;
  title: string;
  description: string | null;
  sortOrder: number;
  config: Record<string, unknown> | null;
}

export function parseWorkflowStepConfig(
  type: WorkflowStepType,
  config: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!config) return null;
  switch (type) {
    case "ELIGIBILITY":
      return eligibilityConfigSchema.parse(config);
    case "FORM":
      return formConfigSchema.parse(config);
    case "DOCUMENTS":
      return documentsConfigSchema.parse(config);
    case "PAYMENT":
      return paymentConfigSchema.parse(config);
    case "SUBMISSION":
      return submissionConfigSchema.parse(config);
    default:
      return null;
  }
}
```

- [ ] **Step 4: Implement `providers.ts`**

Create `modules/applications/providers.ts`:

```ts
import type { ApplicationStatus } from "@prisma/client";

export type MockProviderId = "MOCK_CAC" | "MOCK_PASSPORT" | "MOCK_DRIVER_LICENCE";

export interface ProviderContext {
  reference: string;
  providerRef: string | null;
  status: ApplicationStatus;
}

export interface ProviderOutcome {
  status: ApplicationStatus;
  note: string;
}

export interface MockProvider {
  id: MockProviderId;
  label: string;
  submit(ctx: ProviderContext): Promise<{ providerRef: string; note: string }>;
  advance(
    ctx: ProviderContext,
    opts?: { forceOutcome?: "APPROVED" | "REJECTED" },
  ): Promise<ProviderOutcome>;
}

const MockCACProvider: MockProvider = {
  id: "MOCK_CAC",
  label: "Corporate Affairs Commission (demo)",
  async submit(ctx) {
    return { providerRef: `CAC-${ctx.reference}`, note: "Application accepted by the CAC (demo)." };
  },
  async advance(ctx, opts) {
    if (opts?.forceOutcome) {
      return {
        status: opts.forceOutcome,
        note:
          opts.forceOutcome === "APPROVED"
            ? "Company registration approved (demo)."
            : "Company registration rejected (demo).",
      };
    }
    if (ctx.status === "SUBMITTED") {
      return { status: "UNDER_REVIEW", note: "Your application is being reviewed by the CAC (demo)." };
    }
    return { status: "APPROVED", note: "Your company registration was approved (demo)." };
  },
};

const MockPassportProvider: MockProvider = {
  id: "MOCK_PASSPORT",
  label: "Nigeria Immigration Service (demo)",
  async submit(ctx) {
    return { providerRef: `NIS-${ctx.reference}`, note: "Passport application accepted (demo)." };
  },
  async advance(ctx, opts) {
    if (opts?.forceOutcome) {
      return {
        status: opts.forceOutcome,
        note:
          opts.forceOutcome === "APPROVED"
            ? "Passport application approved (demo)."
            : "Passport application rejected (demo).",
      };
    }
    if (ctx.status === "SUBMITTED") {
      return { status: "UNDER_REVIEW", note: "Your passport application is under review (demo)." };
    }
    if (ctx.status === "UNDER_REVIEW") {
      return { status: "ACTION_REQUIRED", note: "Additional information may be requested (demo)." };
    }
    return { status: "APPROVED", note: "Your passport application was approved (demo)." };
  },
};

const MockDriverLicenceProvider: MockProvider = {
  id: "MOCK_DRIVER_LICENCE",
  label: "Federal Road Safety Corps (demo)",
  async submit(ctx) {
    return { providerRef: `FRSC-${ctx.reference}`, note: "Licence application accepted (demo)." };
  },
  async advance(ctx, opts) {
    if (opts?.forceOutcome) {
      return {
        status: opts.forceOutcome,
        note:
          opts.forceOutcome === "APPROVED"
            ? "Driver licence approved (demo)."
            : "Driver licence rejected (demo).",
      };
    }
    if (ctx.status === "SUBMITTED") {
      return { status: "UNDER_REVIEW", note: "Your licence application is under review (demo)." };
    }
    return { status: "APPROVED", note: "Your driver licence was approved (demo)." };
  },
};

const PROVIDERS: Record<MockProviderId, MockProvider> = {
  MOCK_CAC: MockCACProvider,
  MOCK_PASSPORT: MockPassportProvider,
  MOCK_DRIVER_LICENCE: MockDriverLicenceProvider,
};

export function getMockProvider(id: MockProviderId): MockProvider {
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new Error(`Unknown mock provider: ${String(id)}`);
  }
  return provider;
}
```

- [ ] **Step 5: Run tests + checks + commit**

```bash
npx vitest run tests/applications-providers.test.ts
npm run typecheck
npm run lint
git add modules/applications/workflow-config.ts modules/applications/providers.ts tests/applications-providers.test.ts
git commit -m "feat(applications): add workflow step config and mock providers"
```

---
### Task 4: Seed form definitions and workflows for the three demo services

**Files:**
- Create: `prisma/application-seed-data.ts`
- Modify: `prisma/seed.ts`
- Create: `tests/applications-workflow-seed.test.ts`

**Interfaces:**
- Consumes: `ServiceFormDefinition`, `ServiceWorkflow`, `ServiceWorkflowStep` models; `generateId`.
- Produces: exported `FORM_DEFINITIONS_SEED: FormDefinition[]` (reusing types from `modules/applications/form-config`), `WORKFLOWS_SEED` array; seed writes forms + workflows for `business-registration`, `national-passport`, `driver-licence`.

- [ ] **Step 1: Write the failing seed test**

Create `tests/applications-workflow-seed.test.ts`:

```ts
import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { hasActiveWorkflow } from "@/modules/applications/workflow";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});

describe("seeded workflows", () => {
  it("provides active workflows for the three demo services", async () => {
    for (const slug of ["business-registration", "national-passport", "driver-licence"]) {
      const service = await db.service.findUnique({ where: { slug } });
      expect(service).not.toBeNull();
      expect(await hasActiveWorkflow(service!.id)).toBe(true);
    }
  });

  it("seeds form definitions referenced by workflow steps", async () => {
    const forms = await db.serviceFormDefinition.findMany();
    const keys = new Set(forms.map((f) => f.key));
    expect(keys.has("personal-details")).toBe(true);
    expect(keys.has("company-details")).toBe(true);
    expect(keys.has("passport-details")).toBe(true);
    expect(keys.has("driver-details")).toBe(true);
  });

  it("orders workflow steps correctly", async () => {
    const service = await db.service.findUnique({ where: { slug: "business-registration" } });
    const workflow = await db.serviceWorkflow.findUnique({
      where: { serviceId: service!.id },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    const types = workflow!.steps.map((s) => s.type);
    expect(types[0]).toBe("ELIGIBILITY");
    expect(types[types.length - 1]).toBe("COMPLETION");
  });
});
```

- [ ] **Step 2: Create `modules/applications/workflow.ts` (active-workflow query)**

Create `modules/applications/workflow.ts`:

```ts
import "server-only";
import { db } from "@/server/db";

export async function hasActiveWorkflow(serviceId: string): Promise<boolean> {
  const workflow = await db.serviceWorkflow.findUnique({ where: { serviceId } });
  return Boolean(workflow && workflow.isActive);
}
```

- [ ] **Step 3: Create the seed data file**

Create `prisma/application-seed-data.ts`:

```ts
import type { FormDefinition } from "../modules/applications/form-config";
import type { ServiceMode } from "@prisma/client";

export const FORM_DEFINITIONS_SEED: FormDefinition[] = [
  {
    key: "personal-details",
    name: "Personal details",
    fields: [
      { key: "fullName", label: "Full name", type: "text", required: true, identityField: "legalName", hint: "Verified identity information", maxLength: 120 },
      { key: "dateOfBirth", label: "Date of birth", type: "date", required: true, identityField: "dateOfBirth", hint: "Verified identity information" },
      { key: "nationality", label: "Nationality", type: "text", required: true, identityField: "nationality", hint: "Verified identity information", maxLength: 80 },
      { key: "gender", label: "Gender", type: "select", required: true, identityField: "gender", hint: "Verified identity information", options: [{ label: "Female", value: "Female" }, { label: "Male", value: "Male" }] },
      { key: "phone", label: "Phone number", type: "phone", required: true, placeholder: "+234 800 000 0000" },
      { key: "email", label: "Email address", type: "email", required: true },
      { key: "residentialAddress", label: "Residential address", type: "address", required: false, maxLength: 300 },
    ],
  },
  {
    key: "company-details",
    name: "Company details",
    fields: [
      { key: "companyName", label: "Proposed company name", type: "text", required: true, maxLength: 160, hint: "This is the name that will be registered with the CAC." },
      { key: "companyType", label: "Company type", type: "select", required: true, options: [{ label: "Private Limited Company", value: "private-limited" }, { label: "Public Limited Company", value: "public-limited" }, { label: "Company Limited by Guarantee", value: "guarantee" }, { label: "Unlimited Company", value: "unlimited" }] },
      { key: "businessSector", label: "Business sector", type: "select", required: true, options: [{ label: "Technology", value: "technology" }, { label: "Agriculture", value: "agriculture" }, { label: "Retail & Trade", value: "retail" }, { label: "Finance", value: "finance" }, { label: "Manufacturing", value: "manufacturing" }, { label: "Services", value: "services" }, { label: "Other", value: "other" }] },
      { key: "registeredAddress", label: "Registered office address", type: "address", required: true, maxLength: 300 },
      { key: "contactPhone", label: "Contact phone", type: "phone", required: true },
      { key: "contactEmail", label: "Contact email", type: "email", required: true },
    ],
  },
  {
    key: "passport-details",
    name: "Passport details",
    fields: [
      { key: "passportType", label: "Passport type", type: "select", required: true, options: [{ label: "Standard 32-page", value: "standard-32" }, { label: "Standard 64-page", value: "standard-64" }] },
      { key: "maritalStatus", label: "Marital status", type: "select", required: true, options: [{ label: "Single", value: "single" }, { label: "Married", value: "married" }, { label: "Divorced", value: "divorced" }, { label: "Widowed", value: "widowed" }] },
      { key: "stateOfOrigin", label: "State of origin", type: "select", required: true, options: STATE_OPTIONS },
      { key: "photo", label: "Passport photograph", type: "file", required: true, accept: "image/png,image/jpeg" },
    ],
  },
  {
    key: "driver-details",
    name: "Driver details",
    fields: [
      { key: "licenceClass", label: "Licence class", type: "select", required: true, options: [{ label: "A (Motorcycle)", value: "A" }, { label: "B (Car)", value: "B" }, { label: "C (Light vehicle)", value: "C" }, { label: "E (Heavy vehicle)", value: "E" }, { label: "F (Special vehicle)", value: "F" }] },
      { key: "stateOfIssuance", label: "State of issuance", type: "select", required: true, options: STATE_OPTIONS },
      { key: "trainingCertificate", label: "Training school certificate", type: "file", required: false, accept: ".pdf" },
    ],
  },
];

const STATE_OPTIONS: Array<{ label: string; value: string }> = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa",
  "Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger",
  "Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe",
  "Zamfara","FCT (Abuja)",
].map((name) => ({ label: name, value: name }));

export interface WorkflowStepSeed {
  type: "ELIGIBILITY" | "FORM" | "DOCUMENTS" | "REVIEW" | "PAYMENT" | "SUBMISSION" | "STATUS" | "COMPLETION";
  title: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface WorkflowSeed {
  serviceSlug: string;
  provider: "MOCK_CAC" | "MOCK_PASSPORT" | "MOCK_DRIVER_LICENCE";
  steps: WorkflowStepSeed[];
}

export const WORKFLOWS_SEED: WorkflowSeed[] = [
  {
    serviceSlug: "business-registration",
    provider: "MOCK_CAC",
    steps: [
      { type: "ELIGIBILITY", title: "Check eligibility", description: "Make sure you can apply." },
      { type: "FORM", title: "Company details", config: { formKey: "company-details" } },
      { type: "DOCUMENTS", title: "Documents", config: { documents: [
        { key: "memorandum-articles", label: "Memorandum and Articles of Association", required: true },
        { key: "directors-identification", label: "Directors' identification", required: true },
        { key: "registered-address-proof", label: "Proof of registered address", required: true },
      ] } },
      { type: "REVIEW", title: "Review your application" },
      { type: "PAYMENT", title: "Fees", config: { demo: true } },
      { type: "SUBMISSION", title: "Submit to CAC", config: { provider: "MOCK_CAC" } },
      { type: "COMPLETION", title: "Track your application" },
    ],
  },
  {
    serviceSlug: "national-passport",
    provider: "MOCK_PASSPORT",
    steps: [
      { type: "ELIGIBILITY", title: "Check eligibility" },
      { type: "FORM", title: "Personal details", config: { formKey: "personal-details" } },
      { type: "FORM", title: "Passport details", config: { formKey: "passport-details" } },
      { type: "DOCUMENTS", title: "Documents", config: { documents: [
        { key: "nin", label: "National Identification Number (NIN)", required: true },
        { key: "birth-certificate", label: "Birth certificate or declaration of age", required: true },
        { key: "lga-letter", label: "Local government letter of identification", required: true },
        { key: "passport-photo", label: "Passport photograph", required: true, accept: "image/png,image/jpeg" },
      ] } },
      { type: "REVIEW", title: "Review your application" },
      { type: "PAYMENT", title: "Fees", config: { demo: true } },
      { type: "SUBMISSION", title: "Submit to NIS", config: { provider: "MOCK_PASSPORT" } },
      { type: "COMPLETION", title: "Track your application" },
    ],
  },
  {
    serviceSlug: "driver-licence",
    provider: "MOCK_DRIVER_LICENCE",
    steps: [
      { type: "ELIGIBILITY", title: "Check eligibility" },
      { type: "FORM", title: "Personal details", config: { formKey: "personal-details" } },
      { type: "FORM", title: "Driver details", config: { formKey: "driver-details" } },
      { type: "DOCUMENTS", title: "Documents", config: { documents: [
        { key: "passport-photo", label: "Passport photograph", required: true, accept: "image/png,image/jpeg" },
        { key: "training-certificate", label: "Training school certificate", required: false, accept: ".pdf" },
      ] } },
      { type: "REVIEW", title: "Review your application" },
      { type: "PAYMENT", title: "Fees", config: { demo: true } },
      { type: "SUBMISSION", title: "Submit to FRSC", config: { provider: "MOCK_DRIVER_LICENCE" } },
      { type: "COMPLETION", title: "Track your application" },
    ],
  },
];

// `ServiceMode` import is intentionally unused here; kept for symmetry with the
// catalogue seed types. Remove if lint complains — this line will be deleted.
void (null as unknown as ServiceMode);
```

Remove the `ServiceMode` import and the final `void` line — they are only there to avoid an unused-import lint trap; delete them before committing.

- [ ] **Step 4: Extend `prisma/seed.ts`**

After the "Seeding demo services" block (before `main` closes), add:

```ts
  console.log("Seeding form definitions...");
  for (const form of FORM_DEFINITIONS_SEED) {
    await prisma.serviceFormDefinition.upsert({
      where: { key: form.key },
      update: { name: form.name, config: form.config },
      create: {
        id: generateId("frm"),
        key: form.key,
        name: form.name,
        config: form.config,
      },
    });
  }
  console.log(`Done. ${await prisma.serviceFormDefinition.count()} form definitions ready.`);

  console.log("Seeding service workflows...");
  for (const w of WORKFLOWS_SEED) {
    const service = await prisma.service.findUnique({ where: { slug: w.serviceSlug } });
    if (!service) {
      throw new Error(`Seed error: workflow references missing service ${w.serviceSlug}`);
    }
    const workflow = await prisma.serviceWorkflow.upsert({
      where: { serviceId: service.id },
      update: { isActive: true },
      create: { id: generateId("wfl"), serviceId: service.id, isActive: true },
    });
    await prisma.serviceWorkflowStep.deleteMany({ where: { workflowId: workflow.id } });
    for (const [index, step] of w.steps.entries()) {
      await prisma.serviceWorkflowStep.create({
        data: {
          id: generateId("wfs"),
          workflowId: workflow.id,
          type: step.type,
          title: step.title,
          description: step.description ?? null,
          config: step.config ?? undefined,
          sortOrder: index,
        },
      });
    }
  }
  console.log(`Done. ${await prisma.serviceWorkflow.count()} workflows ready.`);
```

Update the imports at the top of `prisma/seed.ts`:

```ts
import {
  JURISDICTIONS,
  SERVICE_CATEGORIES_SEED,
  SERVICE_PROVIDERS_SEED,
  DEMO_SERVICES_SEED,
} from "./service-catalogue-data";
import { FORM_DEFINITIONS_SEED, WORKFLOWS_SEED } from "./application-seed-data";
```

- [ ] **Step 5: Run the seed + tests + checks + commit**

```bash
npm run db:seed
npx vitest run tests/applications-workflow-seed.test.ts
npm run typecheck
npm run lint
```

Expected: seed prints `3 workflows ready`; the seed test passes (needs `db:seed` run against `civicone_test` too — run `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npm run db:seed`).
Then commit:

```bash
git add prisma/application-seed-data.ts prisma/seed.ts modules/applications/workflow.ts tests/applications-workflow-seed.test.ts
git commit -m "feat(applications): seed form definitions and workflows for demo services"
```

---
### Task 5: Core application service — create, list, get, save answers, advance, transitions, documents, payment, cancel, identity reuse

**Files:**
- Create: `modules/applications/service.ts`
- Create: `modules/applications/validators.ts`
- Create: `tests/applications-service.test.ts`

**Interfaces:**
- Consumes: `nextApplicationReference`, `buildFormSchema`, `applyIdentityAnswers`, `parseWorkflowStepConfig`, `getMockProvider`, `hasActiveWorkflow`-related queries, `getIdentityReuseContext` (from this task).
- Produces:
  - `startApplication(serviceId): Promise<{ reference: string }>`
  - `getApplicationsForUser(): Promise<ApplicationCardView[]>`
  - `getApplicationByReference(reference): Promise<ApplicationDetailView>`
  - `saveAnswers(applicationId, formKey, values): Promise<void>`
  - `confirmEligibility(applicationId): Promise<void>`
  - `confirmPayment(applicationId): Promise<void>`
  - `attachDocument(applicationId, formKey, fieldKey, label, file: {name,type,size,buffer}): Promise<void>`
  - `removeDocument(applicationId, documentId): Promise<void>`
  - `advanceStep(applicationId): Promise<void>`
  - `simulateProvider(applicationId): Promise<{ status: string }>`
  - `cancelApplication(applicationId): Promise<void>`
  - `getApplicationDocument(reference, documentId): Promise<ApplicationDocument & { applicationReference: string }>`
  - `getIdentityReuseContext(userId): Promise<IdentityReuseContext>`

- [ ] **Step 1: Write the failing integration tests**

Create `tests/applications-service.test.ts`:

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
import type { SessionUser } from "@/server/auth/session";
import {
  startApplication,
  getApplicationsForUser,
  getApplicationByReference,
  saveAnswers,
  confirmEligibility,
  confirmPayment,
  attachDocument,
  advanceStep,
  simulateProvider,
  cancelApplication,
} from "@/modules/applications/service";

let user: SessionUser;

async function createUser(): Promise<SessionUser> {
  const id = generateId("usr");
  await db.user.create({
    data: {
      id,
      email: `app-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`,
      status: "ACTIVE",
    },
  });
  return { id, roleNames: ["USER"] } as SessionUser;
}

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  user = await createUser();
  cookieJar.clear();
});

async function startFor(slug: string) {
  const service = await db.service.findUnique({ where: { slug } });
  if (!service) throw new Error(`missing service ${slug}`);
  const app = await startApplication(service.id);
  const detail = await getApplicationByReference(app.reference);
  return { service, ...app, detail };
}

describe("application engine", () => {
  it("creates a DRAFT with a CO reference and first step", async () => {
    const { reference, detail } = await startFor("business-registration");
    expect(reference).toMatch(/^CO-\d{4}-\d{6}$/);
    expect(detail.status).toBe("DRAFT");
    expect(detail.steps[0].id).toBe(detail.currentStepId);
    expect(detail.steps[detail.steps.length - 1].type).toBe("COMPLETION");
  });

  it("lists applications for the user", async () => {
    await startFor("national-passport");
    const cards = await getApplicationsForUser();
    expect(cards.length).toBe(1);
    expect(cards[0].reference).toMatch(/^CO-/);
    expect(cards[0].status).toBe("DRAFT");
    expect(cards[0].serviceName).toBeTruthy();
  });

  it("rejects starting an application for a service without a workflow", async () => {
    const service = await db.service.findUnique({ where: { slug: "tin-registration" } });
    await expect(startApplication(service!.id)).rejects.toThrow();
  });

  it("rejects saving answers that fail validation", async () => {
    const { detail } = await startFor("business-registration");
    const formStep = detail.steps.find((s) => s.type === "FORM")!;
    const config = formStep.config as { formKey: string };
    await expect(
      saveAnswers(detail.id, config.formKey, { companyName: "" }),
    ).rejects.toThrow();
  });

  it("saves answers and walks the whole workflow to SUBMITTED", async () => {
    const { service, detail } = await startFor("business-registration");
    expect(service).toBeTruthy();
    let current = detail;
    let steps = current.steps;
    let idx = steps.findIndex((s) => s.id === current.currentStepId);

    // ELIGIBILITY
    await confirmEligibility(current.id);
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    idx = current.steps.findIndex((s) => s.id === current.currentStepId);
    expect(current.steps[idx].type).toBe("FORM");

    // FORM
    const formConfig = current.steps[idx].config as { formKey: string };
    await saveAnswers(current.id, formConfig.formKey, {
      companyName: "Demo Ventures Ltd",
      companyType: "private-limited",
      businessSector: "services",
      registeredAddress: "12 Broad Street, Lagos",
      contactPhone: "+2348012345678",
      contactEmail: "hello@demoventures.example",
    });
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    idx = current.steps.findIndex((s) => s.id === current.currentStepId);
    expect(current.steps[idx].type).toBe("DOCUMENTS");

    // DOCUMENTS
    const docsConfig = current.steps[idx].config as { documents: Array<{ key: string; label: string }> };
    for (const doc of docsConfig.documents) {
      await attachDocument(
        current.id,
        "_documents",
        doc.key,
        doc.label,
        { name: `${doc.key}.pdf`, type: "application/pdf", size: 123, buffer: Buffer.from("demo") },
      );
    }
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    idx = current.steps.findIndex((s) => s.id === current.currentStepId);
    expect(current.steps[idx].type).toBe("REVIEW");

    // REVIEW -> PAYMENT
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    idx = current.steps.findIndex((s) => s.id === current.currentStepId);
    expect(current.steps[idx].type).toBe("PAYMENT");
    expect(current.status).toBe("PAYMENT_PENDING");

    // PAYMENT -> SUBMISSION
    await confirmPayment(current.id);
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    idx = current.steps.findIndex((s) => s.id === current.currentStepId);
    expect(current.steps[idx].type).toBe("SUBMISSION");

    // SUBMISSION -> SUBMITTED + provider ref
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    expect(current.status).toBe("SUBMITTED");
    expect(current.providerRef).toMatch(/^CAC-/);
    expect(current.submittedAt).not.toBeNull();
  });

  it("rejects advancing past a step that has not been completed", async () => {
    const { detail } = await startFor("business-registration");
    await expect(advanceStep(detail.id)).rejects.toThrow();
  });

  it("simulates provider progress to APPROVED and records history", async () => {
    const { detail } = await startFor("business-registration");
    let current = detail;
    let steps = current.steps;
    let idx = steps.findIndex((s) => s.id === current.currentStepId);
    await confirmEligibility(current.id);
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    steps = current.steps;
    idx = steps.findIndex((s) => s.id === current.currentStepId);
    const formConfig = steps[idx].config as { formKey: string };
    await saveAnswers(current.id, formConfig.formKey, {
      companyName: "Demo Ventures Ltd",
      companyType: "private-limited",
      businessSector: "services",
      registeredAddress: "12 Broad Street, Lagos",
      contactPhone: "+2348012345678",
      contactEmail: "hello@demoventures.example",
    });
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    steps = current.steps;
    idx = steps.findIndex((s) => s.id === current.currentStepId);
    const docsConfig = steps[idx].config as { documents: Array<{ key: string; label: string }> };
    for (const doc of docsConfig.documents) {
      await attachDocument(current.id, "_documents", doc.key, doc.label, {
        name: `${doc.key}.pdf`, type: "application/pdf", size: 123, buffer: Buffer.from("demo"),
      });
    }
    await advanceStep(current.id);
    current = await getApplicationByReference(current.reference);
    await advanceStep(current.id); // REVIEW -> PAYMENT
    current = await getApplicationByReference(current.reference);
    await confirmPayment(current.id);
    await advanceStep(current.id); // PAYMENT -> SUBMISSION
    current = await getApplicationByReference(current.reference);
    await advanceStep(current.id); // SUBMISSION -> SUBMITTED
    current = await getApplicationByReference(current.reference);
    expect(current.status).toBe("SUBMITTED");

    const outcome = await simulateProvider(current.id);
    expect(["UNDER_REVIEW", "APPROVED"]).toContain(outcome.status);
    const after = await getApplicationByReference(current.reference);
    expect(after.timeline.length).toBeGreaterThan(1);
  });

  it("cancels an editable application", async () => {
    const { detail } = await startFor("business-registration");
    await cancelApplication(detail.id);
    const after = await getApplicationByReference(detail.reference);
    expect(after.status).toBe("CANCELLED");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/applications-service.test.ts`
Expected: FAIL — `modules/applications/service` not found.

- [ ] **Step 3: Implement `validators.ts`**

Create `modules/applications/validators.ts`:

```ts
import { z } from "zod";

export const applicationReferenceSchema = z
  .string()
  .regex(/^CO-\d{4}-\d{6}$/, "Invalid application reference");

export const applicationIdSchema = z.object({
  applicationId: z.string().min(1, "Application id is required"),
});

export const serviceIdForApplicationSchema = z.object({
  serviceId: z.string().min(1, "Service id is required"),
});

export const saveAnswersSchema = z.object({
  applicationId: z.string().min(1),
  formKey: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
});

export const uploadDocumentSchema = z.object({
  applicationId: z.string().min(1),
  formKey: z.string().min(1),
  fieldKey: z.string().min(1),
  label: z.string().min(1),
});

export const documentIdSchema = z.object({
  documentId: z.string().min(1),
});
```

- [ ] **Step 4: Implement `service.ts`**

Create `modules/applications/service.ts`:

```ts
import "server-only";
import type {
  Application,
  ApplicationStatus,
  ServiceMode,
} from "@prisma/client";
import { db } from "@/server/db";
import { AppError, toFieldErrors, validationError } from "@/server/errors";
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { logAudit } from "@/server/audit";
import { getRequestContext } from "@/server/request";
import { generateId } from "@/lib/id";
import { nextApplicationReference } from "./reference";
import {
  applyIdentityAnswers,
  buildFormSchema,
  type VerifiedIdentity,
} from "./form-config";
import {
  documentsConfigSchema,
  formConfigSchema,
  parseWorkflowStepConfig,
  type WorkflowStepView,
} from "./workflow-config";
import { getMockProvider, type MockProviderId } from "./providers";
import { applicationReferenceSchema } from "./validators";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export interface IdentityReuseContext {
  verified: boolean;
  legalName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  gender: string | null;
}

export async function getIdentityReuseContext(userId: string): Promise<IdentityReuseContext> {
  const profile = await db.identityProfile.findUnique({ where: { userId } });
  const verified = profile?.verificationStatus === "VERIFIED";
  return {
    verified,
    legalName: verified ? profile?.legalName ?? null : null,
    dateOfBirth:
      verified && profile?.dateOfBirth
        ? profile.dateOfBirth.toISOString().slice(0, 10)
        : null,
    nationality: verified ? profile?.nationality ?? null : null,
    gender: verified ? profile?.gender ?? null : null,
  };
}

function toVerifiedIdentity(ctx: IdentityReuseContext): VerifiedIdentity | null {
  if (!ctx.verified) return null;
  return {
    legalName: ctx.legalName ?? "",
    dateOfBirth: ctx.dateOfBirth ?? "",
    nationality: ctx.nationality ?? "",
    gender: ctx.gender ?? "",
  };
}

const stepSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  sortOrder: true,
  config: true,
} as const;

const cardSelect = {
  id: true,
  reference: true,
  status: true,
  updatedAt: true,
  service: { select: { slug: true, name: true } },
  provider: { select: { name: true, abbreviation: true } },
  currentStepId: true,
  workflow: {
    select: { steps: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, type: true } } },
  },
} as const;

export interface ApplicationCardView {
  id: string;
  reference: string;
  status: ApplicationStatus;
  serviceSlug: string;
  serviceName: string;
  providerName: string;
  providerAbbreviation: string | null;
  updatedAt: Date;
  nextAction: string;
}

export interface ApplicationDocumentView {
  id: string;
  formKey: string;
  fieldKey: string;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface ApplicationTimelineEntry {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  reason: string | null;
  createdAt: Date;
}

export interface ApplicationDetailView {
  id: string;
  reference: string;
  status: ApplicationStatus;
  serviceSlug: string;
  serviceName: string;
  serviceSummary: string;
  providerName: string;
  providerAbbreviation: string | null;
  jurisdictionName: string;
  mode: ServiceMode;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  currentStepId: string | null;
  steps: WorkflowStepView[];
  answers: Record<string, Record<string, unknown>>;
  verifiedFields: Record<string, boolean>;
  documents: ApplicationDocumentView[];
  timeline: ApplicationTimelineEntry[];
  identity: IdentityReuseContext;
  nextAction: string;
}

export async function startApplication(
  serviceId: string,
): Promise<{ reference: string }> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: {
      workflow: { include: { steps: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!service || !service.isActive) {
    throw new AppError("Service not found.", { code: "NOT_FOUND" });
  }
  const workflow = service.workflow;
  if (!workflow || !workflow.isActive || workflow.steps.length === 0) {
    throw new AppError("This service cannot be applied for online yet.", {
      code: "CONFLICT",
    });
  }

  const reference = await nextApplicationReference();
  const firstStep = workflow.steps[0];

  const application = await db.application.create({
    data: {
      id: generateId("app"),
      reference,
      userId: user.id,
      serviceId: service.id,
      workflowId: workflow.id,
      status: "DRAFT",
      currentStepId: firstStep.id,
    },
  });

  const ctx = await getRequestContext();
  await logAudit({
    actorId: user.id,
    action: "application.created",
    resourceType: "application",
    resourceId: application.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { reference },
  });

  return { reference };
}

export async function getApplicationsForUser(): Promise<ApplicationCardView[]> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  const rows = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: cardSelect,
  });

  return rows.map((row) => {
    const steps = row.workflow.steps;
    const current = steps.find((s) => s.id === row.currentStepId);
    const nextAction =
      row.status === "DRAFT" || row.status === "READY" || row.status === "PAYMENT_PENDING"
        ? `Continue: ${current?.title ?? "application"}`
        : row.status === "SUBMITTED" || row.status === "UNDER_REVIEW" || row.status === "ACTION_REQUIRED"
          ? "Awaiting provider update"
          : row.status === "APPROVED"
            ? "Ready to complete"
            : row.status;
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      serviceSlug: row.service.slug,
      serviceName: row.service.name,
      providerName: row.provider.name,
      providerAbbreviation: row.provider.abbreviation,
      updatedAt: row.updatedAt,
      nextAction,
    };
  });
}

export async function getApplicationByReference(
  reference: string,
): Promise<ApplicationDetailView> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  const parsed = applicationReferenceSchema.safeParse(reference);
  if (!parsed.success) {
    throw new AppError("Invalid application reference.", { code: "NOT_FOUND" });
  }

  const row = await db.application.findUnique({
    where: { reference },
    include: {
      service: {
        select: {
          slug: true,
          name: true,
          summary: true,
          mode: true,
          provider: { select: { name: true, abbreviation: true } },
          jurisdiction: { select: { name: true } },
        },
      },
      workflow: {
        include: { steps: { orderBy: { sortOrder: "asc" }, select: stepSelect } },
      },
      answers: true,
      documents: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!row || row.userId !== user.id) {
    throw new AppError("Application not found.", { code: "NOT_FOUND" });
  }

  const steps = row.workflow.steps.map((step) => ({
    id: step.id,
    type: step.type,
    title: step.title,
    description: step.description,
    sortOrder: step.sortOrder,
    config: parseWorkflowStepConfig(
      step.type,
      step.config as Record<string, unknown> | null,
    ),
  }));

  const answers: Record<string, Record<string, unknown>> = {};
  const verifiedFields: Record<string, boolean> = {};
  for (const answer of row.answers) {
    if (!answers[answer.formKey]) answers[answer.formKey] = {};
    answers[answer.formKey][answer.fieldKey] = answer.value;
    if (answer.verified) verifiedFields[answer.fieldKey] = true;
  }

  const identity = await getIdentityReuseContext(user.id);

  const current = steps.find((s) => s.id === row.currentStepId);
  const nextAction =
    row.status === "DRAFT" || row.status === "READY" || row.status === "PAYMENT_PENDING"
      ? `Continue: ${current?.title ?? "application"}`
      : row.status === "SUBMITTED" || row.status === "UNDER_REVIEW" || row.status === "ACTION_REQUIRED"
        ? "Awaiting provider update"
        : row.status;

  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    serviceSlug: row.service.slug,
    serviceName: row.service.name,
    serviceSummary: row.service.summary,
    providerName: row.service.provider.name,
    providerAbbreviation: row.service.provider.abbreviation,
    jurisdictionName: row.service.jurisdiction.name,
    mode: row.service.mode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    currentStepId: row.currentStepId,
    steps,
    answers,
    verifiedFields,
    documents: row.documents.map((d) => ({
      id: d.id,
      formKey: d.formKey,
      fieldKey: d.fieldKey,
      label: d.label,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      createdAt: d.createdAt,
    })),
    timeline: row.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
    identity,
    nextAction,
  };
}

async function getOwnedApplication(applicationId: string, user: { id: string }) {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: { workflow: { include: { steps: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!application || application.userId !== user.id) {
    throw new AppError("Application not found.", { code: "NOT_FOUND" });
  }
  return application;
}

function assertEditable(status: ApplicationStatus): void {
  if (status !== "DRAFT" && status !== "READY" && status !== "PAYMENT_PENDING") {
    throw new AppError("This application can no longer be edited.", {
      code: "CONFLICT",
    });
  }
}

async function transitionStatus(
  applicationId: string,
  toStatus: ApplicationStatus,
  reason?: string,
  actorUserId?: string,
): Promise<void> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true },
  });
  if (!application) throw new AppError("Application not found.", { code: "NOT_FOUND" });
  if (application.status === toStatus) return;
  await db.$transaction([
    db.application.update({
      where: { id: applicationId },
      data: { status: toStatus },
    }),
    db.applicationStatusHistory.create({
      data: {
        id: generateId("ash"),
        applicationId,
        fromStatus: application.status,
        toStatus,
        reason: reason ?? null,
        actorUserId: actorUserId ?? null,
      },
    }),
  ]);
}

export async function saveAnswers(
  applicationId: string,
  formKey: string,
  values: Record<string, unknown>,
): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);

  const form = await db.serviceFormDefinition.findUnique({ where: { key: formKey } });
  if (!form) throw new AppError("Form definition not found.", { code: "NOT_FOUND" });

  const definition = form.config as {
    key: string;
    name: string;
    fields: Parameters<typeof buildFormSchema>[0]["fields"];
  };

  const schema = buildFormSchema(definition);
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }

  const identity = toVerifiedIdentity(await getIdentityReuseContext(user.id));
  const finalValues = applyIdentityAnswers(definition.fields, parsed.data as Record<string, unknown>, identity);

  const data = (application.data as Record<string, Record<string, unknown>> | null) ?? {};
  data[formKey] = finalValues;

  await db.$transaction([
    db.application.update({ where: { id: applicationId }, data: { data } }),
    ...definition.fields.map((field) =>
      db.applicationAnswer.upsert({
        where: {
          applicationId_formKey_fieldKey: {
            applicationId,
            formKey,
            fieldKey: field.key,
          },
        },
        update: {
          value: finalValues[field.key] ?? null,
          verified: Boolean(field.identityField && identity?.[field.identityField]),
        },
        create: {
          id: generateId("ans"),
          applicationId,
          formKey,
          fieldKey: field.key,
          value: finalValues[field.key] ?? null,
          verified: Boolean(field.identityField && identity?.[field.identityField]),
        },
      }),
    ),
  ]);
}

export async function confirmEligibility(applicationId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);
  const data = (application.data as Record<string, unknown> | null) ?? {};
  data.eligibilityConfirmed = true;
  await db.application.update({
    where: { id: applicationId },
    data: { data: data as never },
  });
}

export async function confirmPayment(applicationId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);
  const data = (application.data as Record<string, unknown> | null) ?? {};
  data.paymentConfirmed = true;
  await db.application.update({
    where: { id: applicationId },
    data: { data: data as never },
  });
}

export async function attachDocument(
  applicationId: string,
  formKey: string,
  fieldKey: string,
  label: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);

  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    throw new AppError("File must be between 1 byte and 5 MB.", { code: "VALIDATION_ERROR" });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new AppError("File type not supported.", { code: "VALIDATION_ERROR" });
  }

  const document = await db.applicationDocument.create({
    data: {
      id: generateId("adoc"),
      applicationId,
      formKey,
      fieldKey,
      label,
      fileName: file.name.slice(0, 255),
      mimeType: file.type,
      sizeBytes: file.size,
      fileData: file.buffer,
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

export async function removeDocument(applicationId: string, documentId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);
  const document = await db.applicationDocument.findFirst({
    where: { id: documentId, applicationId },
  });
  if (!document) throw new AppError("Document not found.", { code: "NOT_FOUND" });
  await db.applicationDocument.delete({ where: { id: documentId } });
}

export async function advanceStep(applicationId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);

  const steps = application.workflow.steps;
  const index = steps.findIndex((s) => s.id === application.currentStepId);
  if (index < 0) throw new AppError("Application is not at an editable step.", { code: "CONFLICT" });
  const current = steps[index];

  await validateStep(application, current);

  const next = steps[index + 1];

  if (current.type === "SUBMISSION") {
    const config = (current.config ?? {}) as { provider?: MockProviderId };
    const provider = getMockProvider(config.provider ?? "MOCK_CAC");
    const submitted = await provider.submit({
      reference: application.reference,
      providerRef: application.providerRef,
      status: application.status,
    });
    await db.application.update({
      where: { id: applicationId },
      data: {
        providerRef: submitted.providerRef,
        providerName: provider.id,
        submittedAt: new Date(),
      },
    });
    await transitionStatus(applicationId, "SUBMITTED", submitted.note, user.id);
  }

  if (next) {
    await db.application.update({
      where: { id: applicationId },
      data: { currentStepId: next.id },
    });
    const statusForStep: Partial<Record<string, ApplicationStatus>> = {
      REVIEW: "READY",
      PAYMENT: "PAYMENT_PENDING",
    };
    const target = statusForStep[next.type];
    if (target) await transitionStatus(applicationId, target, `Moved to ${next.title}`, user.id);
  }
}

async function validateStep(
  application: Application & { workflow: { steps: Array<{ id: string; type: string; config: unknown }> } },
  step: { id: string; type: string; config: unknown },
): Promise<void> {
  const data = (application.data as Record<string, unknown> | null) ?? {};

  if (step.type === "ELIGIBILITY") {
    if (data.eligibilityConfirmed !== true) {
      throw new AppError("Please confirm the eligibility statement first.", { code: "VALIDATION_ERROR" });
    }
    return;
  }

  if (step.type === "FORM") {
    const config = formConfigSchema.safeParse(step.config);
    if (!config.success) throw new AppError("Form step is misconfigured.", { code: "INTERNAL" });
    const form = await db.serviceFormDefinition.findUnique({
      where: { key: config.data.formKey },
    });
    if (!form) throw new AppError("Form definition not found.", { code: "INTERNAL" });
    const definition = form.config as Parameters<typeof buildFormSchema>[0];
    const formData = (data[config.data.formKey] as Record<string, unknown> | null) ?? {};
    const parsed = buildFormSchema(definition).safeParse(formData);
    if (!parsed.success) {
      throw new AppError("Please complete this form before continuing.", { code: "VALIDATION_ERROR" });
    }
    return;
  }

  if (step.type === "DOCUMENTS") {
    const config = documentsConfigSchema.safeParse(step.config);
    if (!config.success) throw new AppError("Documents step is misconfigured.", { code: "INTERNAL" });
    for (const doc of config.data.documents) {
      if (!doc.required) continue;
      const attached = await db.applicationDocument.findFirst({
        where: { applicationId: application.id, fieldKey: doc.key },
      });
      if (!attached) {
        throw new AppError(`Please attach: ${doc.label}`, { code: "VALIDATION_ERROR" });
      }
    }
    return;
  }

  if (step.type === "PAYMENT") {
    if (data.paymentConfirmed !== true) {
      throw new AppError("Please confirm your payment before continuing.", { code: "VALIDATION_ERROR" });
    }
    return;
  }
}

export async function simulateProvider(
  applicationId: string,
): Promise<{ status: string }> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);

  const providerId = application.providerName as MockProviderId | null;
  if (!providerId) {
    throw new AppError("This application has not been submitted.", { code: "CONFLICT" });
  }
  if (!["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED"].includes(application.status)) {
    throw new AppError("There is nothing to simulate right now.", { code: "CONFLICT" });
  }

  const provider = getMockProvider(providerId);
  const outcome = await provider.advance({
    reference: application.reference,
    providerRef: application.providerRef,
    status: application.status,
  });

  await transitionStatus(application.id, outcome.status, outcome.note, user.id);
  if (outcome.status === "APPROVED" || outcome.status === "REJECTED") {
    await db.application.update({
      where: { id: application.id },
      data: { completedAt: new Date() },
    });
  }

  const ctx = await getRequestContext();
  await logAudit({
    actorId: user.id,
    action: "application.status_simulated",
    resourceType: "application",
    resourceId: application.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { to: outcome.status },
  });

  return { status: outcome.status };
}

export async function cancelApplication(applicationId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  if (["APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(application.status)) {
    throw new AppError("This application can no longer be cancelled.", { code: "CONFLICT" });
  }
  await transitionStatus(applicationId, "CANCELLED", "Cancelled by applicant", user.id);
}

export async function getApplicationDocument(
  reference: string,
  documentId: string,
): Promise<{ applicationReference: string; fileName: string; mimeType: string; fileData: Buffer }> {
  const user = await requireUser();
  const application = await db.application.findUnique({
    where: { reference },
    select: { id: true, userId: true, reference: true },
  });
  if (!application || application.userId !== user.id) {
    throw new AppError("Application not found.", { code: "NOT_FOUND" });
  }
  const document = await db.applicationDocument.findFirst({
    where: { id: documentId, applicationId: application.id },
  });
  if (!document) throw new AppError("Document not found.", { code: "NOT_FOUND" });
  return {
    applicationReference: application.reference,
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileData: document.fileData,
  };
}
```

- [ ] **Step 5: Run the integration tests + checks + commit**

Before running, seed the test DB:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npm run db:seed
npx vitest run tests/applications-service.test.ts
npm run typecheck
npm run lint
```

Expected: all application-engine tests PASS, typecheck/lint clean.
Then commit:

```bash
git add modules/applications/service.ts modules/applications/validators.ts tests/applications-service.test.ts
git commit -m "feat(applications): build the core application engine"
```

---
### Task 6: Server actions + document download route + identity reuse wiring

**Files:**
- Create: `modules/applications/actions.ts`
- Create: `app/(app)/applications/[reference]/documents/[documentId]/route.ts`
- Create: `tests/applications-actions.test.ts`

**Interfaces:**
- Consumes: all `modules/applications/service.ts` functions.
- Produces: `startApplicationAction(serviceId)`, `saveAnswersAction(input)`, `confirmEligibilityAction(applicationId)`, `confirmPaymentAction(applicationId)`, `uploadDocumentAction(input)`, `removeDocumentAction(input)`, `advanceStepAction(applicationId)`, `simulateProviderAction(applicationId)`, `cancelApplicationAction(applicationId)`; a GET route returning file bytes.

- [ ] **Step 1: Write the failing action tests**

Create `tests/applications-actions.test.ts`:

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
import { startApplicationAction, advanceStepAction, saveAnswersAction } from "@/modules/applications/actions";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  cookieJar.clear();
});

async function createUser() {
  const id = generateId("usr");
  await db.user.create({
    data: { id, email: `act-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`, status: "ACTIVE" },
  });
  return id;
}

describe("application server actions", () => {
  it("starts an application and returns its reference", async () => {
    const userId = await createUser();
    cookieJar.set("session", { value: JSON.stringify({ userId }) });
    const service = await db.service.findUnique({ where: { slug: "business-registration" } });
    const result = await startApplicationAction(service!.id);
    expect(result.ok).toBe(true);
    expect(result.data?.reference).toMatch(/^CO-\d{4}-\d{6}$/);
  });

  it("returns a typed error when the service cannot be applied for", async () => {
    const userId = await createUser();
    cookieJar.set("session", { value: JSON.stringify({ userId }) });
    const service = await db.service.findUnique({ where: { slug: "tin-registration" } });
    const result = await startApplicationAction(service!.id);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("CONFLICT");
  });

  it("rejects invalid answers through the action boundary", async () => {
    const userId = await createUser();
    cookieJar.set("session", { value: JSON.stringify({ userId }) });
    const service = await db.service.findUnique({ where: { slug: "business-registration" } });
    const started = await startApplicationAction(service!.id);
    const app = await db.application.findUnique({ where: { reference: started.data!.reference } });
    const result = await saveAnswersAction({
      applicationId: app!.id,
      formKey: "company-details",
      values: { companyName: "" },
    });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects advancing past an incomplete step", async () => {
    const userId = await createUser();
    cookieJar.set("session", { value: JSON.stringify({ userId }) });
    const service = await db.service.findUnique({ where: { slug: "business-registration" } });
    const started = await startApplicationAction(service!.id);
    const app = await db.application.findUnique({ where: { reference: started.data!.reference } });
    const result = await advanceStepAction(app!.id);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/applications-actions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `actions.ts`**

Create `modules/applications/actions.ts`:

```ts
"use server";

import { fail, toFieldErrors, validationError, withActionResult } from "@/server/errors";
import {
  cancelApplication,
  confirmEligibility,
  confirmPayment,
  advanceStep,
  saveAnswers,
  simulateProvider,
  startApplication,
  removeDocument,
} from "./service";
import {
  applicationIdSchema,
  documentIdSchema,
  saveAnswersSchema,
  serviceIdForApplicationSchema,
  uploadDocumentSchema,
} from "./validators";

export async function startApplicationAction(serviceId: string) {
  const parsed = serviceIdForApplicationSchema.safeParse({ serviceId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => startApplication(serviceId));
}

export async function saveAnswersAction(input: {
  applicationId: string;
  formKey: string;
  values: Record<string, unknown>;
}) {
  const parsed = saveAnswersSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => saveAnswers(parsed.data.applicationId, parsed.data.formKey, parsed.data.values));
}

export async function confirmEligibilityAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => confirmEligibility(applicationId));
}

export async function confirmPaymentAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => confirmPayment(applicationId));
}

export async function uploadDocumentAction(input: {
  applicationId: string;
  formKey: string;
  fieldKey: string;
  label: string;
  file: File;
}) {
  const parsed = uploadDocumentSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  const buffer = Buffer.from(await input.file.arrayBuffer());
  return withActionResult(() =>
    attachDocument(parsed.data.applicationId, parsed.data.formKey, parsed.data.fieldKey, parsed.data.label, {
      name: input.file.name,
      type: input.file.type,
      size: input.file.size,
      buffer,
    }),
  );
}

async function attachDocument(
  applicationId: string,
  formKey: string,
  fieldKey: string,
  label: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
) {
  const { attachDocument: attach } = await import("./service");
  return attach(applicationId, formKey, fieldKey, label, file);
}

export async function removeDocumentAction(input: { applicationId: string; documentId: string }) {
  const id = documentIdSchema.safeParse(input);
  if (!id.success) return fail(validationError(toFieldErrors(id.error)));
  return withActionResult(() => removeDocument(input.applicationId, input.documentId));
}

export async function advanceStepAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => advanceStep(applicationId));
}

export async function simulateProviderAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => simulateProvider(applicationId));
}

export async function cancelApplicationAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => cancelApplication(applicationId));
}
```

Note: the `attachDocument` local wrapper above is awkward. Replace it with a direct import at the top instead:

```ts
import {
  cancelApplication,
  confirmEligibility,
  confirmPayment,
  advanceStep,
  saveAnswers,
  simulateProvider,
  startApplication,
  removeDocument,
  attachDocument,
} from "./service";
```

and delete the local `attachDocument` function, calling `attachDocument(...)` directly in `uploadDocumentAction`.

- [ ] **Step 4: Implement the document download route**

Create `app/(app)/applications/[reference]/documents/[documentId]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getApplicationDocument } from "@/modules/applications/service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reference: string; documentId: string }> },
) {
  const { reference, documentId } = await context.params;
  try {
    const document = await getApplicationDocument(reference, documentId);
    return new NextResponse(new Uint8Array(document.fileData), {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Content-Length": String(document.fileData.length),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
```

- [ ] **Step 5: Run tests + checks + commit**

```bash
npx vitest run tests/applications-actions.test.ts
npm run typecheck
npm run lint
git add modules/applications/actions.ts "app/(app)/applications/[reference]/documents/[documentId]/route.ts" tests/applications-actions.test.ts
git commit -m "feat(applications): add server actions and document download route"
```

---
### Task 7: UI — applications list, detail page, dynamic form, step panels, service CTA

**Files:**
- Modify: `modules/services/components/service-detail.tsx` (accept `workflowAvailable` + `onStartApplication` via prop; render Start button)
- Modify: `app/(app)/services/[slug]/page.tsx` (pass `workflowAvailable`)
- Modify: `app/(app)/applications/page.tsx` (replace placeholder with real list)
- Create: `app/(app)/applications/[reference]/page.tsx`
- Create: `modules/applications/components/application-card.tsx`
- Create: `modules/applications/components/application-status-badge.tsx`
- Create: `modules/applications/components/application-stepper.tsx`
- Create: `modules/applications/components/start-application-button.tsx`
- Create: `modules/applications/components/dynamic-form.tsx`
- Create: `modules/applications/components/document-upload.tsx`
- Create: `modules/applications/components/step-panel.tsx`
- Create: `modules/applications/components/application-timeline.tsx`
- Create: `modules/applications/components/simulate-provider-button.tsx`

**Interfaces:**
- Consumes: `ApplicationCardView`, `ApplicationDetailView`, form config types, `buildFormSchema`, `buildIdentityPrefill`, all actions.
- Produces: the `/applications` list page, `/applications/[reference]` detail page, and a working "Start application" CTA on eligible service pages.

- [ ] **Step 1: Add the status badge component**

Create `modules/applications/components/application-status-badge.tsx`:

```tsx
import type { ApplicationStatus } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/modules/applications/status";

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <StatusBadge status={status} label={APPLICATION_STATUS_LABELS[status]} />;
}
```

- [ ] **Step 2: Add the start-application button (client)**

Create `modules/applications/components/start-application-button.tsx`:

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startApplicationAction } from "@/modules/applications/actions";

export function StartApplicationButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    start(async () => {
      const result = await startApplicationAction(serviceId);
      if (result.ok && result.data) {
        router.push(`/applications/${result.data.reference}`);
      } else {
        setError(result.error?.message ?? "Could not start the application.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
        Start application
      </Button>
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3: Wire the CTA into the service detail page**

In `modules/services/components/service-detail.tsx`:
- Add `workflowAvailable: boolean` to the props.
- In the header action area, when `service.mode === "EXTERNAL" && service.officialUrl` currently renders "Go to official site". Prepend a conditional Start button:

```tsx
          {workflowAvailable ? (
            <StartApplicationButton serviceId={service.id} />
          ) : null}
```

Add the import: `import { StartApplicationButton } from "@/modules/applications/components/start-application-button";`

In `app/(app)/services/[slug]/page.tsx`:
- Import `hasActiveWorkflow` from `@/modules/applications/workflow`.
- After fetching the service, compute `const workflowAvailable = await hasActiveWorkflow(service.id);`
- Pass `workflowAvailable={workflowAvailable}` to `<ServiceDetail>`.

- [ ] **Step 4: Add the application card**

Create `modules/applications/components/application-card.tsx`:

```tsx
import Link from "next/link";
import { ChevronRight, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApplicationCardView } from "@/modules/applications/service";
import { ApplicationStatusBadge } from "./application-status-badge";

export function ApplicationCard({ application }: { application: ApplicationCardView }) {
  return (
    <Card className="transition-colors hover:border-foreground/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {application.reference}
            </p>
            <h3 className="text-base font-semibold text-foreground">
              <Link href={`/applications/${application.reference}`} className="hover:underline">
                {application.serviceName}
              </Link>
            </h3>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Landmark className="size-3" aria-hidden="true" />
            {application.providerAbbreviation ?? application.providerName}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated {application.updatedAt.toLocaleDateString()}
          </span>
        </div>

        <Link
          href={`/applications/${application.reference}`}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {application.nextAction}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Build the applications list page**

Replace `app/(app)/applications/page.tsx`:

```tsx
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getApplicationsForUser } from "@/modules/applications/service";
import { ApplicationCard } from "@/modules/applications/components/application-card";

export const metadata: Metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const applications = await getApplicationsForUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Every application you've started, from draft to outcome."
        breadcrumbs={[{ label: "Applications" }]}
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" aria-hidden="true" />}
          title="No applications yet."
          description="When you start an application, it will appear here with its current status."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Add the stepper**

Create `modules/applications/components/application-stepper.tsx`:

```tsx
import { cn } from "@/lib/utils";
import type { WorkflowStepView } from "@/modules/applications/workflow-config";

export function ApplicationStepper({
  steps,
  currentStepId,
}: {
  steps: WorkflowStepView[];
  currentStepId: string | null;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const state =
          currentIndex === -1 || index < currentIndex
            ? "done"
            : index === currentIndex
              ? "current"
              : "upcoming";
        return (
          <li
            key={step.id}
            className="flex items-center gap-2 text-xs"
            aria-current={state === "current" ? "step" : undefined}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                state === "done" && "border-primary bg-primary/10 text-primary",
                state === "current" && "border-primary bg-primary text-primary-foreground",
                state === "upcoming" && "border-border text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "hidden sm:inline",
                state === "current" ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {step.title}
            </span>
            {index < steps.length - 1 ? (
              <span className="mx-1 h-px w-4 bg-border" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 7: Add the document upload control (client)**

Create `modules/applications/components/document-upload.tsx`:

```tsx
"use client";

import * as React from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocumentAction, removeDocumentAction } from "@/modules/applications/actions";

export interface DocumentItem {
  id: string;
  label: string;
  fileName: string;
  sizeBytes: number;
}

export function DocumentUpload({
  applicationId,
  formKey,
  fieldKey,
  label,
  accept,
  documents,
  attached,
  onChanged,
}: {
  applicationId: string;
  formKey: string;
  fieldKey: string;
  label: string;
  accept?: string;
  documents: DocumentItem[];
  attached: string | null;
  onChanged: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const attachedDoc = documents.find((d) => d.id === attached) ?? null;

  async function handleFile(file: File) {
    setPending(true);
    setError(null);
    try {
      const result = await uploadDocumentAction({
        applicationId,
        formKey,
        fieldKey,
        label,
        file,
      });
      if (!result.ok) {
        setError(result.error?.message ?? "Upload failed.");
        return;
      }
      onChanged();
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (!attachedDoc) return;
    setPending(true);
    try {
      const result = await removeDocumentAction({ applicationId, documentId: attachedDoc.id });
      if (!result.ok) setError(result.error?.message ?? "Could not remove the document.");
      onChanged();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {attachedDoc ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{attachedDoc.fileName}</p>
            <p className="text-xs text-muted-foreground">{Math.max(1, Math.round(attachedDoc.sizeBytes / 1024))} KB</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRemove} disabled={pending} aria-label="Remove document">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}
            Upload
          </Button>
        </div>
      )}
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 8: Build the dynamic form (client)**

Create `modules/applications/components/dynamic-form.tsx`:

```tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormField } from "@/components/ui/form-field";
import {
  buildFormSchema,
  buildIdentityPrefill,
  type FormDefinition,
  type VerifiedIdentity,
} from "@/modules/applications/form-config";
import { saveAnswersAction } from "@/modules/applications/actions";
import { DocumentUpload, type DocumentItem } from "./document-upload";

export function DynamicForm({
  applicationId,
  definition,
  values,
  identity,
  documents,
  onSaved,
}: {
  applicationId: string;
  definition: FormDefinition;
  values: Record<string, unknown>;
  identity: VerifiedIdentity | null;
  documents: DocumentItem[];
  onSaved: () => void;
}) {
  const schema = React.useMemo(() => buildFormSchema(definition), [definition]);
  const prefill = React.useMemo(
    () => buildIdentityPrefill(definition.fields, identity),
    [definition, identity],
  );
  const defaultValues = React.useMemo(
    () => ({ ...values, ...prefill }),
    [values, prefill],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(data: Record<string, unknown>) {
    setError(null);
    const result = await saveAnswersAction({ applicationId, formKey: definition.key, values: data });
    if (!result.ok) {
      setError(result.error?.message ?? "Could not save your answers.");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit((data) => void onSubmit(data as Record<string, unknown>))} className="space-y-5" noValidate>
      {definition.fields.map((field) => {
        const isVerified = Boolean(field.identityField && prefill[field.key]);
        const registered = register(field.key);
        const error = errors[field.key]?.message as string | undefined;

        if (field.type === "file" || field.type === "existing-document") {
          const value = watch(field.key) as string | null | undefined;
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <DocumentUpload
                applicationId={applicationId}
                formKey={definition.key}
                fieldKey={field.key}
                label={field.label}
                accept={field.accept}
                documents={documents}
                attached={value ?? null}
                onChanged={() => setValue(field.key, watch(field.key) as string, { shouldValidate: true })}
              />
            </FormField>
          );
        }

        if (field.type === "textarea" || field.type === "address") {
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <div className={isVerified ? "pointer-events-none opacity-80" : ""}>
                <Textarea id={`field-${field.key}`} rows={3} {...registered} disabled={isVerified} aria-invalid={Boolean(error)} />
              </div>
              {isVerified ? <VerifiedHint /> : null}
            </FormField>
          );
        }

        if (field.type === "select") {
          const current = (watch(field.key) as string) ?? "";
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <div className={isVerified ? "pointer-events-none opacity-80" : ""}>
                <Select value={current} onValueChange={(v) => setValue(field.key, v)} disabled={isVerified}>
                  <SelectTrigger id={`field-${field.key}`} className="w-full" aria-invalid={Boolean(error)}>
                    <SelectValue placeholder={field.placeholder ?? "Select an option"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isVerified ? <VerifiedHint /> : null}
            </FormField>
          );
        }

        if (field.type === "radio") {
          const current = (watch(field.key) as string) ?? "";
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <div className={isVerified ? "pointer-events-none opacity-80" : ""}>
                <RadioGroup value={current} onValueChange={(v) => setValue(field.key, v)} disabled={isVerified}>
                  {(field.options ?? []).map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem id={`field-${field.key}-${option.value}`} value={option.value} />
                      <label htmlFor={`field-${field.key}-${option.value}`} className="text-sm text-foreground">{option.label}</label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {isVerified ? <VerifiedHint /> : null}
            </FormField>
          );
        }

        if (field.type === "checkbox") {
          const current = Boolean(watch(field.key));
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <Checkbox id={`field-${field.key}`} checked={current} onCheckedChange={(v) => setValue(field.key, v === true)} disabled={isVerified} />
            </FormField>
          );
        }

        if (field.type === "multi-select") {
          const current = (watch(field.key) as string[] | undefined) ?? [];
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <div className="space-y-2">
                {(field.options ?? []).map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`field-${field.key}-${option.value}`}
                      checked={current.includes(option.value)}
                      onCheckedChange={(checked) => {
                        const next = checked ? [...current, option.value] : current.filter((v) => v !== option.value);
                        setValue(field.key, next);
                      }}
                    />
                    <label htmlFor={`field-${field.key}-${option.value}`} className="text-sm text-foreground">{option.label}</label>
                  </div>
                ))}
              </div>
            </FormField>
          );
        }

        return (
          <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
            <div className={isVerified ? "pointer-events-none opacity-80" : ""}>
              <Input
                id={`field-${field.key}`}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                placeholder={field.placeholder}
                disabled={isVerified}
                {...registered}
                aria-invalid={Boolean(error)}
              />
            </div>
            {isVerified ? <VerifiedHint /> : null}
          </FormField>
        );
      })}

      {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Save & continue
        </Button>
      </div>
    </form>
  );
}

function VerifiedHint() {
  return (
    <p className="flex items-center gap-1 text-xs font-medium text-secondary">
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      Verified identity information
    </p>
  );
}
```

- [ ] **Step 9: Build the step panel (client)**

Create `modules/applications/components/step-panel.tsx`:

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ExternalLink, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  confirmEligibilityAction,
  confirmPaymentAction,
  advanceStepAction,
} from "@/modules/applications/actions";
import { DynamicForm } from "./dynamic-form";
import { DocumentUpload, type DocumentItem } from "./document-upload";
import type {
  ApplicationDetailView,
  ApplicationDocumentView,
} from "@/modules/applications/service";
import type { WorkflowStepView } from "@/modules/applications/workflow-config";
import { buildIdentityPrefill, type VerifiedIdentity } from "@/modules/applications/form-config";

export function StepPanel({
  application,
  step,
  identity,
  documents,
}: {
  application: ApplicationDetailView;
  step: WorkflowStepView;
  identity: VerifiedIdentity | null;
  documents: ApplicationDocumentView[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  const docItems: DocumentItem[] = documents.map((d) => ({
    id: d.id,
    label: d.label,
    fileName: d.fileName,
    sizeBytes: d.sizeBytes,
  }));

  function refresh() {
    setPending(false);
    router.refresh();
  }

  async function run(action: () => Promise<{ ok: boolean; error?: { message?: string } }>) {
    setPending(true);
    setError(null);
    const result = await action();
    if (!result.ok) {
      setError(result.error?.message ?? "Something went wrong.");
      setPending(false);
      return;
    }
    refresh();
  }

  if (step.type === "ELIGIBILITY") {
    const config = (step.config ?? {}) as { confirmLabel?: string };
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            You must meet the eligibility criteria for {application.serviceName} before applying.
          </p>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
            <span>{config.confirmLabel ?? "I confirm I meet the eligibility requirements."}</span>
          </label>
          <div className="flex justify-end">
            <Button disabled={pending || !confirm} onClick={() => void run(() => confirmEligibilityAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
              Continue
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "FORM") {
    const config = (step.config ?? {}) as { formKey: string };
    const definition = formDefinitions[config.formKey];
    if (!definition) {
      return <p className="text-sm text-destructive">This form is not available.</p>;
    }
    const prefill = buildIdentityPrefill(definition.fields, identity);
    return (
      <DynamicForm
        applicationId={application.id}
        definition={definition}
        values={{ ...(application.answers[config.formKey] ?? {}), ...prefill }}
        identity={identity}
        documents={docItems}
        onSaved={() => void run(() => advanceStepAction(application.id))}
      />
    );
  }

  if (step.type === "DOCUMENTS") {
    const config = (step.config ?? {}) as { documents: Array<{ key: string; label: string; required?: boolean; accept?: string }> };
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>Attach the documents required for this service.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.documents.map((doc) => {
            const attached = (application.answers._documents?.[doc.key] as string | null | undefined) ?? null;
            return (
              <div key={doc.key} className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  {doc.label}
                  {doc.required ? <span className="ml-1 text-destructive">*</span> : null}
                </p>
                <DocumentUpload
                  applicationId={application.id}
                  formKey="_documents"
                  fieldKey={doc.key}
                  label={doc.label}
                  accept={doc.accept}
                  documents={docItems}
                  attached={attached}
                  onChanged={() => router.refresh()}
                />
              </div>
            );
          })}
          <div className="flex justify-end pt-2">
            <Button disabled={pending} onClick={() => void run(() => advanceStepAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              Continue
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "REVIEW") {
    const rows: Array<[string, unknown]> = [];
    for (const [formKey, values] of Object.entries(application.answers)) {
      if (formKey === "_documents") continue;
      for (const [key, value] of Object.entries(values)) {
        rows.push([`${formKey}.${key}`, value]);
      }
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>Check everything looks right before you submit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-2">
            {rows.map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-4 border-b border-border pb-2">
                <dt className="text-sm text-muted-foreground">{key}</dt>
                <dd className="text-sm font-medium text-foreground">
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : Array.isArray(value) ? value.join(", ") : String(value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end">
            <Button disabled={pending} onClick={() => void run(() => advanceStepAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              Continue
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "PAYMENT") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-secondary" aria-hidden="true" />
            {step.title}
          </CardTitle>
          <CardDescription>
            Payment is simulated in this demo. Confirm the current fee with the official provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
            <span>I confirm I have paid the applicable fee to the provider.</span>
          </label>
          <div className="flex justify-end">
            <Button disabled={pending || !confirm} onClick={() => void run(() => confirmPaymentAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Continue
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "SUBMISSION") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>Submit your application to the official provider (simulated).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            When you submit, {application.providerName} will issue a reference and begin processing (demo).
          </p>
          <div className="flex justify-end">
            <Button disabled={pending} onClick={() => void run(() => advanceStepAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              Submit application
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "COMPLETION") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application submitted</CardTitle>
          <CardDescription>Your reference is tracked below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Reference: <span className="font-semibold text-foreground">{application.reference}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Provider reference: <span className="font-semibold text-foreground">{application.providerRef ?? "—"}</span>
          </p>
          {application.officialSource ? (
            <a href={application.officialSource} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Visit the official provider <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return null;
}

const formDefinitions: Record<string, Parameters<typeof DynamicForm>[0]["definition"]> = {};
```

The trailing `formDefinitions` constant is a placeholder for injecting form definitions into this client component. **Replace it** with a real `formDefinitions` prop passed from the page:

Change the component signature to accept `formDefinitions` and remove the placeholder constant:

```tsx
export function StepPanel({
  application,
  step,
  identity,
  documents,
  formDefinitions,
}: {
  application: ApplicationDetailView;
  step: WorkflowStepView;
  identity: VerifiedIdentity | null;
  documents: ApplicationDocumentView[];
  formDefinitions: Record<string, FormDefinition>;
}) {
```

Add `import type { FormDefinition } from "@/modules/applications/form-config";` and in the FORM branch use `formDefinitions[config.formKey]`. Delete the placeholder `const formDefinitions` at the bottom.

- [ ] **Step 10: Add the timeline component**

Create `modules/applications/components/application-timeline.tsx`:

```tsx
import type { ApplicationTimelineEntry } from "@/modules/applications/service";
import { APPLICATION_STATUS_LABELS } from "@/modules/applications/status";

export function ApplicationTimeline({ entries }: { entries: ApplicationTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No status updates yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {entries.map((entry, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {APPLICATION_STATUS_LABELS[entry.toStatus]}
            </p>
            <p className="text-xs text-muted-foreground">{entry.createdAt.toLocaleString()}</p>
            {entry.reason ? <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 11: Add the simulate-provider button (client)**

Create `modules/applications/components/simulate-provider-button.tsx`:

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateProviderAction } from "@/modules/applications/actions";

export function SimulateProviderButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handle() {
    setPending(true);
    setError(null);
    const result = await simulateProviderAction(applicationId);
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Could not advance the application.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={handle} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
        Simulate provider update (demo)
      </Button>
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 12: Build the application detail page**

Create `app/(app)/applications/[reference]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, FileText, History, Landmark, Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getApplicationByReference } from "@/modules/applications/service";
import { ApplicationStatusBadge } from "@/modules/applications/components/application-status-badge";
import { ApplicationStepper } from "@/modules/applications/components/application-stepper";
import { StepPanel } from "@/modules/applications/components/step-panel";
import { ApplicationTimeline } from "@/modules/applications/components/application-timeline";
import { SimulateProviderButton } from "@/modules/applications/components/simulate-provider-button";
import { toVerifiedIdentity } from "@/modules/applications/identity";
import { getFormDefinitionMap } from "@/modules/applications/forms";

export const metadata: Metadata = {
  title: "Application",
};

const TRACKING_STATUSES = new Set([
  "SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED", "APPROVED", "REJECTED", "COMPLETED",
]);

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const application = await getApplicationByReference(reference);

  const formDefinitions = await getFormDefinitionMap();
  const identity = toVerifiedIdentity(application.identity);
  const currentStep = application.steps.find((s) => s.id === application.currentStepId) ?? null;
  const isTracking = TRACKING_STATUSES.has(application.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={application.reference}
        breadcrumbs={[
          { label: "Applications", href: "/applications" },
          { label: application.reference },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/applications">
              <ArrowLeft aria-hidden="true" />
              All applications
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">{application.serviceName}</h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Landmark className="size-4" aria-hidden="true" />
                {application.providerName}
              </p>
            </div>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              Last updated {application.updatedAt.toLocaleString()}
            </span>
            <span>{application.jurisdictionName}</span>
          </div>
          <p className="text-sm text-muted-foreground">{application.serviceSummary}</p>
          {isTracking ? (
            <div className="border-t border-border pt-4">
              <SimulateProviderButton applicationId={application.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationStepper steps={application.steps} currentStepId={application.currentStepId} />
        </CardContent>
      </Card>

      {currentStep && !isTracking ? (
        <StepPanel
          application={application}
          step={currentStep}
          identity={identity}
          documents={application.documents}
          formDefinitions={formDefinitions}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>Your application is with the provider (demo).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Provider reference: <span className="font-semibold text-foreground">{application.providerRef ?? "—"}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-secondary" aria-hidden="true" />
              Documents
            </CardTitle>
            <CardDescription>Files attached to this application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {application.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents attached yet.</p>
            ) : (
              application.documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{document.fileName}</p>
                    <p className="text-xs text-muted-foreground">{document.label}</p>
                  </div>
                  <a
                    href={`/applications/${reference}/documents/${document.id}`}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-4 text-secondary" aria-hidden="true" />
              Payments
            </CardTitle>
            <CardDescription>Payment is simulated in this demo.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Confirm the current fee with the official provider. Payment processing arrives in a later phase.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-secondary" aria-hidden="true" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationTimeline entries={application.timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 13: Add the identity + forms helper modules**

Create `modules/applications/identity.ts`:

```ts
import type { IdentityReuseContext } from "./service";
import type { VerifiedIdentity } from "./form-config";

export function toVerifiedIdentity(ctx: IdentityReuseContext): VerifiedIdentity | null {
  if (!ctx.verified) return null;
  return {
    legalName: ctx.legalName ?? "",
    dateOfBirth: ctx.dateOfBirth ?? "",
    nationality: ctx.nationality ?? "",
    gender: ctx.gender ?? "",
  };
}
```

Create `modules/applications/forms.ts`:

```ts
import "server-only";
import { db } from "@/server/db";
import type { FormDefinition } from "./form-config";

export async function getFormDefinitionMap(): Promise<Record<string, FormDefinition>> {
  const rows = await db.serviceFormDefinition.findMany();
  const map: Record<string, FormDefinition> = {};
  for (const row of rows) {
    map[row.key] = row.config as unknown as FormDefinition;
  }
  return map;
}
```

- [ ] **Step 14: Run checks + commit**

```bash
npm run typecheck
npm run lint
npm run build
git add modules/services/components/service-detail.tsx "app/(app)/services/[slug]/page.tsx" "app/(app)/applications/page.tsx" "app/(app)/applications/[reference]/page.tsx" modules/applications/components modules/applications/identity.ts modules/applications/forms.ts
git commit -m "feat(applications): add application list, detail, dynamic forms and tracking UI"
```

---
### Task 8: README, full checks, smoke test, push

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README**

Update the "This repository contains" line to mention Phase 4. In the data-model section add the Phase 4 models:

```
- `service_form_definitions` — configuration-driven forms (fields stored as JSON).
- `service_workflows` / `service_workflow_steps` — the guided application workflow per service (step types ELIGIBILITY…COMPLETION).
- `applications` — user applications with references `CO-<year>-<6-digit>`; never a NIN.
- `application_answers` / `application_status_history` / `application_documents` — answers, status timeline and uploaded files (bytes stored in DB for the demo).
- `application_counters` — per-year sequence counters for references.
```

Add a "Phase 4" bullet under "Authentication & security" or a short section:

```
**Applications (Phase 4)**: a generic, configuration-driven application engine. Users start applications on services that have an active workflow (demo: Business Registration, Nigerian Passport, Driver's Licence), complete dynamic forms, attach documents, review, submit and receive a `CO-2026-000001`-style reference. Identity-verified fields are pre-filled from the Phase 2 profile and locked. Three mock providers (CAC, Passport, Driver Licence) simulate submission, processing, approval and rejection. Applications are tracked under `/applications`. No permanent government service records are created yet (Phase 5).
```

Update the "Not built yet" line to remove "service catalogue/workflows" and note Phase 5 service records.

- [ ] **Step 2: Run the full checks**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all green (unit + integration suites, including the new Phase 4 suites).

- [ ] **Step 3: Smoke test the dev server**

Start the dev server in a background terminal, confirm `/` returns 200 and `/applications` redirects to login when unauthenticated, then stop it.

- [ ] **Step 4: Commit + push**

```bash
git add README.md
git commit -m "docs: document the Phase 4 application engine"
git push origin 260821-feat-service-catalogue-phase3
```

---
## Self-Review

**Spec coverage:**
- Application model + statuses (DRAFT…CANCELLED) — Task 1.
- Reference `CO-2026-000001`, never a NIN — Task 1.
- Workflow engine + step types (ELIGIBILITY…COMPLETION), config-driven, not hard-coded — Tasks 1, 3, 4.
- Dynamic forms (all 13 field types incl. file + existing-document), react-hook-form + Zod, server validation — Tasks 2, 7.
- Identity reuse (pre-fill verified name/DOB/nationality, "Verified identity information" label, no direct edit) — Tasks 5, 7.
- Application tracking: `/applications` cards (service, provider, reference, status, last updated, next action) — Tasks 5, 7.
- Application detail: overview, form, documents, payments, timeline — Tasks 5, 7.
- Demo providers MockCAC / MockPassport / MockDriverLicence simulating submission, processing, approval, rejection — Tasks 3, 5.
- Definition of done (find service, start application, see pre-filled verified info, complete form, upload/attach, review, submit, receive reference, track status, receive status update) — Tasks 4–7.
- No permanent government service records — explicitly deferred in README.
- Identity status stays visible in the shell — untouched; shell layout unchanged.

**Placeholder scan:** The plan contains two deliberate "replace this" notes (the `attachDocument` wrapper in Task 6 and the `formDefinitions` placeholder in Task 7). Both include exact replacement code inline — no TBDs remain.

**Type consistency:** `IdentityReuseContext` ↔ `toVerifiedIdentity` ↔ `VerifiedIdentity` (Task 5, 7, 13); `WorkflowStepView` used by `ApplicationDetailView.steps`, `ApplicationStepper`, `StepPanel`; `ApplicationCardView`/`ApplicationDetailView` match `getApplicationsForUser`/`getApplicationByReference`; action names match between `actions.ts` and the UI components. `hasActiveWorkflow` matches Task 4's `workflow.ts`.
