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
import { createSession, getSessionUser } from "@/server/auth/session";
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

async function createUser(): Promise<SessionUser> {
  const id = generateId("usr");
  await db.user.create({
    data: {
      id,
      email: `app-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`,
      status: "UNVERIFIED",
    },
  });
  const role = await db.role.findUnique({ where: { name: "USER" } });
  if (!role) throw new Error("USER role missing; run npm run db:seed");
  await db.userRole.create({
    data: { id: generateId("uro"), userId: id, roleId: role.id },
  });
  await createSession(id, { ipAddress: "127.0.0.1", userAgent: "vitest" });
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new Error("session not established for test user");
  return sessionUser;
}

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
    const steps = current.steps;
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
