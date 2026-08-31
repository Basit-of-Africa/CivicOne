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
        if (field.type === "text") values[field.key] = "demo value";
        else if (field.type === "email") values[field.key] = "demo@example.com";
        else if (field.type === "phone") values[field.key] = "+2348012345678";
        else if (field.type === "select" || field.type === "radio") values[field.key] = "value";
        else if (field.type === "address" || field.type === "textarea") values[field.key] = "12 Broad Street, Lagos";
        else if (field.type === "date") values[field.key] = "1990-01-01";
        else if (field.type === "checkbox") values[field.key] = true;
        else if (field.type === "multi-select") values[field.key] = ["value"];
        else if (field.type === "number") values[field.key] = 1;
        else if (field.type === "file") values[field.key] = `${field.key}.pdf`;
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
    if (app.status === "SUBMITTED") break;
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
