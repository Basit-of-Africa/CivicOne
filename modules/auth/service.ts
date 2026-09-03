import "server-only";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { generateId, randomUrlToken } from "@/lib/id";
import { hashPassword, verifyPassword } from "@/server/password";
import { sha256 } from "@/server/crypto";
import {
  AppError,
  toFieldErrors,
  validationError,
} from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { getRequestContext } from "@/server/request";
import { logAudit } from "@/server/audit";
import { sendEmail } from "@/server/email";
import {
  forgotPasswordSchema,
  isEmail,
  isPhone,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./validators";

/**
 * Auth domain logic. Pure of transport concerns — server actions and route
 * handlers call into these functions.
 */

// Pre-computed bcrypt hash used to equalise response timing when an account
// does not exist (prevents user enumeration through timing side-channels).
const DUMMY_PASSWORD_HASH =
  "$2b$12$y8T8JgkwQw.nST.OVX2u/OIQaa3ZHNDlEndAN1qMQkRdAUC9RWnCi";

export interface RegisterResult {
  userId: string;
}

export interface LoginResult {
  userId: string;
}

interface NormalizedIdentifier {
  email?: string;
  phone?: string;
}

function normalizeIdentifier(raw: string): NormalizedIdentifier | null {
  const value = raw.trim().toLowerCase();
  if (isEmail(value)) return { email: value };
  if (isPhone(value)) {
    return { phone: value.replace(/[\s-]/g, "") };
  }
  return null;
}

async function findUserByIdentifier(identifier: NormalizedIdentifier) {
  if (identifier.email) {
    return db.user.findUnique({
      where: { email: identifier.email },
      select: { id: true, email: true, phone: true, passwordHash: true, status: true },
    });
  }
  return db.user.findFirst({
    where: { phone: identifier.phone },
    select: { id: true, email: true, phone: true, passwordHash: true, status: true },
  });
}

async function issueEmailVerification(userId: string, email: string) {
  const token = randomUrlToken();
  const expiresAt = new Date(
    Date.now() + env.EMAIL_VERIFICATION_TTL_SECONDS * 1000,
  );
  await db.emailVerification.create({
    data: {
      id: generateId("evf"),
      userId,
      tokenHash: sha256(token),
      expiresAt,
    },
  });
  const url = `${env.APP_URL || "http://localhost:3000"}/auth/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your email address",
    text: `Welcome to CivicOne Nigeria.

Please verify your email address to secure your account:

${url}

If you did not create a CivicOne account, you can safely ignore this email.`,
  });
}

export async function register(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }

  const ctx = await getRequestContext();
  const limit = await rateLimit(`register:${ctx.ipAddress ?? "unknown"}`, {
    max: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.ok) {
    throw new AppError(
      "Too many registration attempts. Please try again later.",
      { code: "RATE_LIMITED" },
    );
  }

  const normalized = normalizeIdentifier(parsed.data.identifier);
  if (!normalized) {
    throw validationError({
      identifier: "Enter a valid email address or phone number",
    });
  }

  const existing = await db.user.findFirst({
    where: {
      OR: [
        ...(normalized.email ? [{ email: normalized.email }] : []),
        ...(normalized.phone ? [{ phone: normalized.phone }] : []),
      ],
    },
  });
  if (existing) {
    throw new AppError(
      "An account with that email address or phone number already exists. Try signing in instead.",
      { code: "CONFLICT" },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const userId = generateId("usr");

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: userId,
        email: normalized.email ?? null,
        phone: normalized.phone ?? null,
        passwordHash,
        status: "UNVERIFIED",
      },
    });

    await tx.profile.create({
      data: { id: generateId("prf"), userId: user.id },
    });

    await tx.identityProfile.create({
      data: {
        id: generateId("idp"),
        userId: user.id,
        verificationStatus: "UNVERIFIED",
      },
    });

    const role = await tx.role.findUnique({ where: { name: "USER" } });
    if (!role) {
      throw new AppError(
        "Role configuration is missing. Run the database seed (npm run db:seed).",
        { code: "INTERNAL" },
      );
    }
    await tx.userRole.create({
      data: { id: generateId("uro"), userId: user.id, roleId: role.id },
    });
  });

  if (normalized.email) {
    await issueEmailVerification(userId, normalized.email);
  }

  await logAudit({
    actorId: userId,
    action: "user.register",
    resourceType: "user",
    resourceId: userId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { identifierType: normalized.email ? "email" : "phone" },
  });

  await createUserSession(userId, ctx);
  return { userId };
}

export async function login(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }

  const ctx = await getRequestContext();
  const normalized = normalizeIdentifier(parsed.data.identifier);
  if (!normalized) {
    throw validationError({
      identifier: "Enter a valid email address or phone number",
    });
  }

  const key = `${normalized.email ?? normalized.phone}`;
  const limit = await rateLimit(
    `login:${key}:${ctx.ipAddress ?? "unknown"}`,
    { max: env.RATE_LIMIT_MAX_ATTEMPTS, windowMs: env.RATE_LIMIT_WINDOW_MS },
  );
  if (!limit.ok) {
    throw new AppError(
      "Too many sign-in attempts. Please try again later.",
      { code: "RATE_LIMITED" },
    );
  }

  const user = await findUserByIdentifier(normalized);
  if (!user) {
    await verifyPassword(parsed.data.password, DUMMY_PASSWORD_HASH);
    throw new AppError("Incorrect email, phone number or password.", {
      code: "INVALID_CREDENTIALS",
    });
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    throw new AppError("Incorrect email, phone number or password.", {
      code: "INVALID_CREDENTIALS",
    });
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(
      "This account has been suspended. Please contact support.",
      { code: "ACCOUNT_SUSPENDED" },
    );
  }
  if (user.status === "LOCKED") {
    throw new AppError(
      "This account is temporarily locked. Please contact support.",
      { code: "ACCOUNT_LOCKED" },
    );
  }
  if (user.status === "CLOSED") {
    throw new AppError("Incorrect email, phone number or password.", {
      code: "INVALID_CREDENTIALS",
    });
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createUserSession(user.id, ctx);

  await logAudit({
    actorId: user.id,
    action: "auth.login",
    resourceType: "user",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { identifierType: normalized.email ? "email" : "phone" },
  });

  return { userId: user.id };
}

export async function logout(): Promise<void> {
  const ctx = await getRequestContext();
  const { getSessionUser } = await import("@/server/auth/session");
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    await logAudit({
      actorId: sessionUser.id,
      action: "auth.logout",
      resourceType: "user",
      resourceId: sessionUser.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
  const { destroySession } = await import("@/server/auth/session");
  await destroySession();
}

export async function verifyEmail(
  token: string,
): Promise<{ userId: string }> {
  if (!token) {
    throw new AppError("Invalid verification link.", { code: "TOKEN_INVALID" });
  }
  const record = await db.emailVerification.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!record || record.usedAt) {
    throw new AppError(
      "This verification link is invalid or has already been used.",
      { code: "TOKEN_INVALID" },
    );
  }
  if (record.expiresAt <= new Date()) {
    throw new AppError(
      "This verification link has expired. Request a new one.",
      { code: "TOKEN_EXPIRED" },
    );
  }

  await db.$transaction([
    db.emailVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  await logAudit({
    actorId: record.userId,
    action: "auth.email_verified",
    resourceType: "user",
    resourceId: record.userId,
  });

  return { userId: record.userId };
}

export async function requestPasswordReset(
  input: unknown,
): Promise<{ sent: boolean }> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }

  const ctx = await getRequestContext();
  await rateLimit(`reset:${ctx.ipAddress ?? "unknown"}`, {
    max: 5,
    windowMs: 15 * 60 * 1000,
  });

  const normalized = normalizeIdentifier(parsed.data.identifier);
  const user =
    normalized?.email
      ? await db.user.findUnique({ where: { email: normalized.email } })
      : null;

  // Always report success — never reveal whether an account exists.
  if (user?.email) {
    const token = randomUrlToken();
    const expiresAt = new Date(
      Date.now() + env.PASSWORD_RESET_TTL_SECONDS * 1000,
    );
    await db.passwordReset.create({
      data: {
        id: generateId("prt"),
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt,
      },
    });
    const url = `${env.APP_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your CivicOne password",
      text: `We received a request to reset your CivicOne Nigeria password.

Reset your password here:
${url}

This link expires in ${Math.round(env.PASSWORD_RESET_TTL_SECONDS / 3600)} hour(s).

If you did not request this, you can safely ignore this email.`,
    });
    await logAudit({
      actorId: user.id,
      action: "auth.password_reset_requested",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  return { sent: true };
}

export async function resetPassword(
  token: string,
  input: unknown,
): Promise<{ userId: string }> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }
  if (!token) {
    throw new AppError("Invalid reset link.", { code: "TOKEN_INVALID" });
  }

  const record = await db.passwordReset.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!record || record.usedAt) {
    throw new AppError(
      "This reset link is invalid or has already been used.",
      { code: "TOKEN_INVALID" },
    );
  }
  if (record.expiresAt <= new Date()) {
    throw new AppError(
      "This reset link has expired. Request a new one.",
      { code: "TOKEN_EXPIRED" },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.$transaction([
    db.passwordReset.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    db.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await logAudit({
    actorId: record.userId,
    action: "auth.password_reset",
    resourceType: "user",
    resourceId: record.userId,
  });

  return { userId: record.userId };
}

export async function resendEmailVerification(): Promise<{ sent: boolean }> {
  const { requireUser } = await import("@/server/auth/session");
  const user = await requireUser();
  if (!user.email) {
    throw new AppError(
      "Your account has no email address to verify.",
      { code: "CONFLICT" },
    );
  }

  const ctx = await getRequestContext();
  await rateLimit(`verify:resend:${user.id}`, {
    max: 5,
    windowMs: 15 * 60 * 1000,
  });

  await issueEmailVerification(user.id, user.email);

  await logAudit({
    actorId: user.id,
    action: "auth.email_verification_resent",
    resourceType: "user",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { sent: true };
}

async function createUserSession(
  userId: string,
  ctx: Awaited<ReturnType<typeof getRequestContext>>,
) {
  const { createSession } = await import("@/server/auth/session");
  await createSession(userId, ctx);
}
