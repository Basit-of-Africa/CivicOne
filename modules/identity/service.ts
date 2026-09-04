import "server-only";
import { cache } from "react";
import type { IdentityVerificationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, toFieldErrors, validationError } from "@/server/errors";
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { logAudit } from "@/server/audit";
import { getRequestContext } from "@/server/request";
import { rateLimit } from "@/server/rate-limit";
import { generateId } from "@/lib/id";
import { decryptSensitive, encryptSensitive } from "@/server/encryption";
import { identityVerifySchema } from "./validators";
import { maskNin } from "./mask";
import { getProviderAdapter } from "./providers";

export type IdentityStatus = IdentityVerificationStatus;

export interface IdentityView {
  status: IdentityStatus;
  verifiedAt: Date | null;
  providerName: string | null;
  lastAttempt: { result: string; reasonCode: string | null; createdAt: Date } | null;
  identity: {
    legalName: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    nationality: string | null;
    stateOfOrigin: string | null;
    lga: string | null;
  };
  maskedNin: string | null;
}

export interface IdentityStatusView {
  status: IdentityStatus;
  verifiedAt: Date | null;
  maskedNin: string | null;
  legalName: string | null;
}

export interface VerifyIdentityResult {
  status: IdentityStatus;
  maskedNin?: string;
  legalName?: string;
  reason?: string;
}

const REASONS: Record<string, string> = {
  IDENTITY_NOT_FOUND:
    "We could not find an identity matching that NIN. Check the number and try again.",
  MANUAL_REVIEW_REQUIRED:
    "Your verification requires manual review. We will update your status shortly.",
  SERVICE_UNAVAILABLE:
    "Identity verification is temporarily unavailable. Please try again later.",
};

async function findProvider() {
  const record = await db.identityProvider.findUnique({
    where: { code: "MOCK_NIN" },
  });
  if (!record || !record.isActive) return null;
  const adapter = getProviderAdapter(record.code);
  if (!adapter) return null;
  return { record, adapter };
}

export const getIdentityStatus = cache(async function getIdentityStatus(): Promise<IdentityStatusView> {
  const user = await requireUser();
  const profile = await db.identityProfile.findUnique({ where: { userId: user.id } });
  const credential = await db.identityCredential.findUnique({
    where: { userId_kind: { userId: user.id, kind: "NIN" } },
    select: { maskedValue: true },
  });
  return {
    status: profile?.verificationStatus ?? "UNVERIFIED",
    verifiedAt: profile?.verifiedAt ?? null,
    maskedNin: credential?.maskedValue ?? null,
    legalName: profile?.legalName ?? null,
  };
});

export async function getIdentityView(): Promise<IdentityView> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.IDENTITY_READ_MASKED);

  const [profile, credential, verification, lastAttempt] = await Promise.all([
    db.identityProfile.findUnique({ where: { userId: user.id } }),
    db.identityCredential.findUnique({
      where: { userId_kind: { userId: user.id, kind: "NIN" } },
    }),
    db.identityVerification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { provider: true },
    }),
    db.identityVerificationAttempt.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  await logAudit({
    actorId: user.id,
    action: "identity.accessed",
    resourceType: "identity",
    resourceId: user.id,
    metadata: { scope: "masked" },
  });

  return {
    status: profile?.verificationStatus ?? "UNVERIFIED",
    verifiedAt: profile?.verifiedAt ?? null,
    providerName: verification?.provider.name ?? null,
    lastAttempt: lastAttempt
      ? {
          result: lastAttempt.result,
          reasonCode: lastAttempt.reasonCode,
          createdAt: lastAttempt.createdAt,
        }
      : null,
    identity: {
      legalName: profile?.legalName ?? null,
      dateOfBirth: profile?.dateOfBirth ?? null,
      gender: profile?.gender ?? null,
      nationality: profile?.nationality ?? null,
      stateOfOrigin: profile?.stateOfOrigin ?? null,
      lga: profile?.lga ?? null,
    },
    maskedNin: credential?.maskedValue ?? null,
  };
}

export async function verifyIdentity(input: unknown): Promise<VerifyIdentityResult> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.IDENTITY_VERIFY);

  const parsed = identityVerifySchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }
  const { nin } = parsed.data;

  const ctx = await getRequestContext();
  const limit = await rateLimit(`identity:verify:${user.id}`, {
    max: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) {
    throw new AppError("Too many verification attempts. Please try again later.", {
      code: "RATE_LIMITED",
    });
  }

  const profile = await db.identityProfile.findUnique({ where: { userId: user.id } });
  const current = profile?.verificationStatus ?? "UNVERIFIED";
  if (current === "SUSPENDED") {
    throw new AppError("Your identity has been suspended. Please contact support.", {
      code: "FORBIDDEN",
    });
  }
  if (current === "REQUIRES_MANUAL_REVIEW" || current === "VERIFICATION_PENDING") {
    throw new AppError(
      "Your identity verification is already being processed.",
      { code: "FORBIDDEN" },
    );
  }
  if (current === "VERIFIED") {
    const existing = await db.identityCredential.findUnique({
      where: { userId_kind: { userId: user.id, kind: "NIN" } },
      select: { maskedValue: true },
    });
    return { status: "VERIFIED", maskedNin: existing?.maskedValue };
  }

  const provider = await findProvider();
  if (!provider) {
    throw new AppError("Identity verification is temporarily unavailable.", {
      code: "INTERNAL",
    });
  }

  const attemptId = generateId("iva");
  await logAudit({
    actorId: user.id,
    action: "identity.verification_attempted",
    resourceType: "identity",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { provider: provider.record.code, attemptId },
  });

  const result = await provider.adapter.verifyIdentity({ nin });

  await db.identityVerificationAttempt.create({
    data: {
      id: attemptId,
      userId: user.id,
      providerId: provider.record.id,
      result: result.result,
      reasonCode: "reasonCode" in result ? result.reasonCode : null,
      reference: result.reference,
    },
  });

  if (result.result === "SUCCESS") {
    const identity = result.identity;
    const dateOfBirth = new Date(identity.dateOfBirth);
    const maskedNin = maskNin(nin);
    const encryptedNin = encryptSensitive(nin);

    await db.$transaction(async (tx) => {
      const upserted = await tx.identityProfile.upsert({
        where: { userId: user.id },
        create: {
          id: generateId("idp"),
          userId: user.id,
          verificationStatus: "VERIFIED",
          providerId: provider.record.id,
          verifiedAt: new Date(),
          legalName: identity.legalName,
          dateOfBirth,
          gender: identity.gender,
          nationality: identity.nationality,
          stateOfOrigin: identity.stateOfOrigin,
          lga: identity.lga,
        },
        update: {
          verificationStatus: "VERIFIED",
          providerId: provider.record.id,
          verifiedAt: new Date(),
          legalName: identity.legalName,
          dateOfBirth,
          gender: identity.gender,
          nationality: identity.nationality,
          stateOfOrigin: identity.stateOfOrigin,
          lga: identity.lga,
        },
      });

      await tx.identityCredential.upsert({
        where: { userId_kind: { userId: user.id, kind: "NIN" } },
        create: {
          id: generateId("idc"),
          userId: user.id,
          profileId: upserted.id,
          kind: "NIN",
          maskedValue: maskedNin,
          encryptedValue: encryptedNin,
        },
        update: {
          profileId: upserted.id,
          maskedValue: maskedNin,
          encryptedValue: encryptedNin,
        },
      });

      await tx.identityVerification.create({
        data: {
          id: generateId("idv"),
          userId: user.id,
          providerId: provider.record.id,
          reference: result.reference,
          verifiedAt: new Date(),
        },
      });

      await tx.user.update({ where: { id: user.id }, data: { status: "VERIFIED" } });
    });

    await logAudit({
      actorId: user.id,
      action: "identity.verification_success",
      resourceType: "identity",
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { provider: provider.record.code, attemptId, maskedNin },
    });

    await logAudit({
      actorId: user.id,
      action: "identity.updated",
      resourceType: "identity",
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { status: "VERIFIED", attemptId },
    });

    return { status: "VERIFIED", maskedNin, legalName: identity.legalName };
  }

  const target: IdentityStatus =
    result.result === "REQUIRES_REVIEW"
      ? "REQUIRES_MANUAL_REVIEW"
      : result.result === "FAILED"
        ? "VERIFICATION_FAILED"
        : current;

  if (target !== current) {
    await db.identityProfile.updateMany({
      where: {
        userId: user.id,
        verificationStatus: { in: ["UNVERIFIED", "VERIFICATION_FAILED"] },
      },
      data: { verificationStatus: target },
    });

    await logAudit({
      actorId: user.id,
      action: "identity.updated",
      resourceType: "identity",
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { status: target, attemptId },
    });
  }

  await logAudit({
    actorId: user.id,
    action: "identity.verification_failed",
    resourceType: "identity",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { provider: provider.record.code, result: result.result, attemptId },
  });

  return {
    status: target,
    reason:
      result.result === "FAILED"
        ? REASONS.IDENTITY_NOT_FOUND
        : result.result === "REQUIRES_REVIEW"
          ? REASONS.MANUAL_REVIEW_REQUIRED
          : REASONS.SERVICE_UNAVAILABLE,
  };
}

export async function getRawNin(): Promise<string> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.IDENTITY_READ_FULL);
  const credential = await db.identityCredential.findUnique({
    where: { userId_kind: { userId: user.id, kind: "NIN" } },
    select: { encryptedValue: true },
  });
  if (!credential) {
    throw new AppError("No NIN credential found.", { code: "NOT_FOUND" });
  }
  await logAudit({
    actorId: user.id,
    action: "identity.accessed",
    resourceType: "identity",
    resourceId: user.id,
    metadata: { scope: "full" },
  });
  return decryptSensitive(credential.encryptedValue);
}
