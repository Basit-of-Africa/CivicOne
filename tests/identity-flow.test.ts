import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const { cookieJar, headerStore } = vi.hoisted(() => {
  const cookieJar = new Map<string, { value: string }>();
  const headerStore = new Headers({ "user-agent": "vitest" });
  return { cookieJar, headerStore };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => headerStore,
}));

vi.mock("@/server/email", () => ({
  sendEmail: async () => {},
}));

import { db } from "@/server/db";
import * as auth from "@/modules/auth/service";
import * as identity from "@/modules/identity/service";
import { decryptSensitive } from "@/server/encryption";
import { maskNin } from "@/modules/identity/mask";
import { DEMO_IDENTITIES } from "@/modules/identity/providers";

const demo = DEMO_IDENTITIES[0];
const testEmail = `id_${Date.now()}@example.com`;
const password = "CivicOne2024!";
let userId: string;
const auditActions: string[] = [];

beforeAll(async () => {
  cookieJar.clear();
  headerStore.set("user-agent", "vitest");
  await db.identityProvider.upsert({
    where: { code: "MOCK_NIN" },
    update: { name: "Demo NIN provider (mock)", isMock: true, isActive: true },
    create: {
      id: `ipr_${Date.now()}`,
      code: "MOCK_NIN",
      name: "Demo NIN provider (mock)",
      isMock: true,
      isActive: true,
    },
  });
});

afterAll(async () => {
  if (userId) {
    await db.auditLog.deleteMany({ where: { actorId: userId } }).catch(() => {});
    await db.user.delete({ where: { id: userId } }).catch(() => {});
  }
  await db.$disconnect();
});

describe("identity verification flow (real database)", () => {
  it("registers an account with UNVERIFIED identity", async () => {
    const result = await auth.register({
      identifier: testEmail,
      password,
      confirmPassword: password,
      agreeTerms: true,
    });
    userId = result.userId;

    const status = await identity.getIdentityStatus();
    expect(status.status).toBe("UNVERIFIED");
    expect(status.maskedNin).toBeNull();
  });

  it("requires explicit consent", async () => {
    await expect(
      identity.verifyIdentity({ nin: demo.nin, consent: false }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects an unknown NIN and records a failed attempt", async () => {
    const result = await identity.verifyIdentity({
      nin: "99999999999",
      consent: true,
    });
    expect(result.status).toBe("VERIFICATION_FAILED");
    expect(result.reason).toBeTruthy();

    const attempt = await db.identityVerificationAttempt.findFirst({
      where: { userId, result: "FAILED" },
    });
    expect(attempt).toBeTruthy();
    expect(attempt?.reasonCode).toBe("IDENTITY_NOT_FOUND");
    auditActions.push("identity.verification_failed");

    const view = await identity.getIdentityView();
    expect(view.status).toBe("VERIFICATION_FAILED");
    expect(view.maskedNin).toBeNull();
  });

  it("passes mock verification with a demo NIN", async () => {
    const result = await identity.verifyIdentity({ nin: demo.nin, consent: true });
    expect(result.status).toBe("VERIFIED");
    expect(result.maskedNin).toBe(maskNin(demo.nin));
    expect(result.legalName).toBe(demo.legalName);

    const view = await identity.getIdentityView();
    expect(view.status).toBe("VERIFIED");
    expect(view.maskedNin).toBe(maskNin(demo.nin));
    expect(view.identity.legalName).toBe(demo.legalName);
    expect(view.identity.stateOfOrigin).toBe(demo.stateOfOrigin);
    expect(view.identity.lga).toBe(demo.lga);
    expect(view.providerName).toBeTruthy();
    expect(view.lastAttempt?.result).toBe("SUCCESS");
    auditActions.push("identity.verification_success");
  });

  it("stores the NIN encrypted, never in plaintext", async () => {
    const credential = await db.identityCredential.findUnique({
      where: { userId_kind: { userId, kind: "NIN" } },
    });
    expect(credential).toBeTruthy();
    expect(credential?.encryptedValue).not.toContain(demo.nin);
    expect(credential?.maskedValue).toBe(maskNin(demo.nin));
    expect(decryptSensitive(credential!.encryptedValue)).toBe(demo.nin);
  });

  it("creates a verification record", async () => {
    const verification = await db.identityVerification.findFirst({
      where: { userId },
      include: { provider: true },
    });
    expect(verification).toBeTruthy();
    expect(verification?.provider.code).toBe("MOCK_NIN");
    expect(verification?.reference).toBeTruthy();
  });

  it("records audit events without leaking the raw NIN", async () => {
    const logs = await db.auditLog.findMany({
      where: { actorId: userId, action: { in: auditActions } },
    });
    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
      const serialized = JSON.stringify(log.metadata ?? {});
      expect(serialized).not.toContain(demo.nin);
    }
  });

  it("blocks raw NIN access for a plain user", async () => {
    await expect(identity.getRawNin()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("requires authentication for verification", async () => {
    await auth.logout();
    await expect(
      identity.verifyIdentity({ nin: demo.nin, consent: true }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
