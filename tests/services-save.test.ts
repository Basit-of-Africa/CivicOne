import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));
vi.mock("@/server/email", () => ({ sendEmail: async () => {} }));

import { db } from "@/server/db";
import * as auth from "@/modules/auth/service";
import { saveService, unsaveService, getSavedServiceIds, getSavedServices } from "@/modules/services/service";

const email = `svc_${Date.now()}@example.com`;
let userId: string;

beforeAll(async () => {
  cookieJar.clear();
  await db.$connect();
  const reg = await auth.register({ identifier: email, password: "CivicOne2024!", confirmPassword: "CivicOne2024!", agreeTerms: true });
  userId = reg.userId;
});
afterAll(async () => {
  await db.user.delete({ where: { id: userId } }).catch(() => {});
  await db.$disconnect();
});

describe("save/unsave service (real database)", () => {
  it("saves a service and lists it", async () => {
    const svc = await db.service.findUnique({ where: { slug: "business-registration" } });
    expect(svc).toBeTruthy();
    await saveService(svc!.id);
    expect(await getSavedServiceIds()).toEqual(new Set([svc!.id]));
    const saved = await getSavedServices();
    expect(saved.some((s) => s.slug === "business-registration")).toBe(true);
  });

  it("unsaves a service", async () => {
    const svc = await db.service.findUnique({ where: { slug: "business-registration" } });
    await unsaveService(svc!.id);
    expect(await getSavedServiceIds()).toEqual(new Set());
  });

  it("rejects saving an unknown service", async () => {
    await expect(saveService("srv_00000000000000000000")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
