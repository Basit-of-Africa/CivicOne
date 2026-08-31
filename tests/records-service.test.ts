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
