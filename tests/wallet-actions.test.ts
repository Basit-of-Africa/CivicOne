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
import { startApplication, getApplicationByReference, reuseWalletDocument } from "@/modules/applications/service";

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
