import "server-only";
import { cookies } from "next/headers";
import type { RoleName, UserStatus } from "@prisma/client";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { generateId, randomToken } from "@/lib/id";
import { sha256 } from "@/server/crypto";
import { AppError } from "@/server/errors";

/**
 * Server-side, database-backed sessions.
 *
 * The browser only ever holds an opaque random token in an HTTP-only,
 * SameSite cookie. The token itself is hashed (SHA-256) at rest in the
 * `sessions` table, so a database leak cannot be used to hijack sessions.
 */

export interface SessionUser {
  id: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  roleNames: RoleName[];
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt: Date | null;
}

interface SessionContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.SESSION_COOKIE_SECURE,
  sameSite: "lax" as const,
  path: "/",
};

function toSessionUser(user: {
  id: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  profile: { firstName: string | null; lastName: string | null } | null;
  userRoles: { role: { name: RoleName } }[];
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    status: user.status,
    roleNames: user.userRoles.map((ur) => ur.role.name),
    firstName: user.profile?.firstName ?? null,
    lastName: user.profile?.lastName ?? null,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(env.SESSION_COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: env.SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(env.SESSION_COOKIE_NAME, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

export async function createSession(
  userId: string,
  context: SessionContext = {},
): Promise<string> {
  const token = randomToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + env.SESSION_MAX_AGE_SECONDS * 1000);

  await db.session.create({
    data: {
      id: generateId("ses"),
      userId,
      tokenHash,
      expiresAt,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    },
  });

  await setSessionCookie(token);
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.session
      .deleteMany({ where: { tokenHash: sha256(token) } })
      .catch(() => {
        // Best-effort; cookie clearing below guarantees logout from the client.
      });
  }
  await clearSessionCookie();
}

/**
 * Resolve the current session user from the request cookie, or null.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = sha256(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          profile: true,
          userRoles: { include: { role: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  // Sliding session: renew the window when it is more than half elapsed.
  const now = new Date();
  const halfLife = env.SESSION_MAX_AGE_SECONDS * 1000 / 2;
  if (session.expiresAt.getTime() - now.getTime() < halfLife) {
    await db.session
      .update({
        where: { id: session.id },
        data: {
          expiresAt: new Date(now.getTime() + env.SESSION_MAX_AGE_SECONDS * 1000),
          lastActiveAt: now,
        },
      })
      .catch(() => {});
  }

  return toSessionUser(session.user);
}

/**
 * Resolve the current session user or throw UNAUTHENTICATED.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("You need to be signed in to continue.", {
      code: "UNAUTHENTICATED",
    });
  }
  return user;
}

/**
 * SHA-256 hash of the current session token (used to exclude the active
 * session when revoking others, e.g. after a password change).
 */
export async function getCurrentSessionTokenHash(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  return token ? sha256(token) : null;
}
