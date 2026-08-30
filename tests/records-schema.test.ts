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
    expect(found).not.toBeNull();
    expect(Buffer.from(found!.fileData).toString()).toBe("demo");
    await db.walletDocument.delete({ where: { id: doc.id } });
    await db.user.delete({ where: { id: user.id } });
  });
});
