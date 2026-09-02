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
    const service = await db.service.findUnique({
      where: { slug: "business-registration" },
      include: { provider: true, workflow: true },
    });
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
