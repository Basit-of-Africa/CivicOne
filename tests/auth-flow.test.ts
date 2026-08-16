import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const { cookieJar, emailSink, headerStore } = vi.hoisted(() => {
  const cookieJar = new Map<string, { value: string }>();
  const emailSink: Array<{ to: string; subject: string; text: string }> = [];
  const headerStore = new Headers({ "user-agent": "vitest" });
  return { cookieJar, emailSink, headerStore };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => headerStore,
}));

vi.mock("@/server/email", () => ({
  sendEmail: async (mail: { to: string; subject: string; text: string }) => {
    emailSink.push(mail);
  },
}));

import { db } from "@/server/db";
import * as auth from "@/modules/auth/service";
import { getSessionUser } from "@/server/auth/session";

function extractToken(mail: { text: string }, param: string): string {
  const match = mail.text.match(new RegExp(`${param}=([0-9a-f]+)`));
  if (!match) throw new Error(`no ${param} token in email`);
  return match[1];
}

const testEmail = `ada_${Date.now()}@example.com`;
const password = "CivicOne2024!";
let userId: string;

beforeAll(() => {
  emailSink.length = 0;
  cookieJar.clear();
});

afterAll(async () => {
  if (userId) {
    await db.user.delete({ where: { id: userId } }).catch(() => {});
  }
  await db.$disconnect();
});

describe("full auth flow (real database)", () => {
  it("registers an account, issues a session and sends a verification email", async () => {
    const result = await auth.register({
      identifier: testEmail,
      password,
      confirmPassword: password,
      agreeTerms: true,
    });
    userId = result.userId;

    const sessionUser = await getSessionUser();
    expect(sessionUser).not.toBeNull();
    expect(sessionUser?.email).toBe(testEmail);
    expect(sessionUser?.status).toBe("UNVERIFIED");
    expect(sessionUser?.emailVerifiedAt).toBeNull();

    const verificationMail = emailSink.find((m) =>
      m.text.includes("/auth/verify-email"),
    );
    expect(verificationMail).toBeTruthy();
  });

  it("rejects duplicate registration", async () => {
    await expect(
      auth.register({
        identifier: testEmail,
        password,
        confirmPassword: password,
        agreeTerms: true,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("verifies the email via the token from the email", async () => {
    const mail = emailSink.find((m) => m.text.includes("/auth/verify-email"));
    expect(mail).toBeTruthy();
    const token = extractToken(mail!, "token");
    const result = await auth.verifyEmail(token);
    expect(result.userId).toBe(userId);
    await expect(auth.verifyEmail(token)).rejects.toMatchObject({
      code: "TOKEN_INVALID",
    });
  });

  it("logs out and destroys the session", async () => {
    await auth.logout();
    expect(await getSessionUser()).toBeNull();
  });

  it("logs in with the correct password", async () => {
    const result = await auth.login({ identifier: testEmail, password });
    expect(result.userId).toBe(userId);
    expect((await getSessionUser())?.email).toBe(testEmail);
  });

  it("rejects a wrong password", async () => {
    await expect(
      auth.login({ identifier: testEmail, password: "Wrong2024!" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("does not reveal whether an unknown identifier exists", async () => {
    await expect(
      auth.login({
        identifier: `ghost_${Date.now()}@example.com`,
        password: "Wrong2024!",
      }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("resets the password and revokes sessions", async () => {
    const requested = await auth.requestPasswordReset({
      identifier: testEmail,
    });
    expect(requested.sent).toBe(true);

    const resetMail = emailSink.find((m) =>
      m.text.includes("/auth/reset-password"),
    );
    expect(resetMail).toBeTruthy();
    const token = extractToken(resetMail!, "token");

    await expect(
      auth.resetPassword(token, {
        password: "Mismatch2024!",
        confirmPassword: "Other2024!",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await auth.resetPassword(token, {
      password: "FreshPass2024!",
      confirmPassword: "FreshPass2024!",
    });

    await expect(
      auth.login({ identifier: testEmail, password }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });

    const login = await auth.login({
      identifier: testEmail,
      password: "FreshPass2024!",
    });
    expect(login.userId).toBe(userId);
  });

  it("rate-limits repeated login attempts", async () => {
    cookieJar.clear();
    for (let i = 0; i < 5; i++) {
      await auth
        .login({ identifier: testEmail, password: "Wrong2024!" })
        .catch(() => {});
    }
    await expect(
      auth.login({ identifier: testEmail, password: "Wrong2024!" }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});
