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

async function createUser(): Promise<void> {
  const id = generateId("usr");
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
    expect(Buffer.from(bytes.fileData).toString()).toBe("abc");
    await deleteWalletDocument(doc.id);
    const count = await db.walletDocument.count({ where: { id: doc.id } });
    expect(count).toBe(0);
  });
});
