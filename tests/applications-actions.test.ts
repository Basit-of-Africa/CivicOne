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
  startApplicationAction,
  advanceStepAction,
  saveAnswersAction,
} from "@/modules/applications/actions";

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
    data: {
      id,
      email: `act-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`,
      status: "UNVERIFIED",
    },
  });
  const role = await db.role.findUnique({ where: { name: "USER" } });
  if (!role) throw new Error("USER role missing; run npm run db:seed");
  await db.userRole.create({
    data: { id: generateId("uro"), userId: id, roleId: role.id },
  });
  await createSession(id, { ipAddress: "127.0.0.1", userAgent: "vitest" });
}

describe("application server actions", () => {
  it("starts an application and returns its reference", async () => {
    const service = await db.service.findUnique({ where: { slug: "business-registration" } });
    const result = await startApplicationAction(service!.id);
    expect(result.ok).toBe(true);
    expect(result.data?.reference).toMatch(/^CO-\d{4}-\d{6}$/);
  });

  it("returns a typed error when the service cannot be applied for", async () => {
    const service = await db.service.findUnique({ where: { slug: "tin-registration" } });
    const result = await startApplicationAction(service!.id);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("CONFLICT");
  });

  it("rejects invalid answers through the action boundary", async () => {
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
    const service = await db.service.findUnique({ where: { slug: "business-registration" } });
    const started = await startApplicationAction(service!.id);
    const app = await db.application.findUnique({ where: { reference: started.data!.reference } });
    const result = await advanceStepAction(app!.id);
    expect(result.ok).toBe(false);
  });
});
