import "server-only";
import { db } from "@/server/db";
import { AppError, toFieldErrors, validationError } from "@/server/errors";
import { requireUser, getCurrentSessionTokenHash } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/password";
import { logAudit } from "@/server/audit";
import { getRequestContext } from "@/server/request";
import { generateId } from "@/lib/id";
import {
  changePasswordSchema,
  updateContactSchema,
  updatePersonalInfoSchema,
  type ChangePasswordInput,
  type UpdateContactInput,
  type UpdatePersonalInfoInput,
} from "./validators";

export interface ProfileView {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    emailVerifiedAt: Date | null;
    status: string;
  };
  profile: {
    title: string | null;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
}

export async function getProfile(): Promise<ProfileView> {
  const user = await requireUser();
  const record = await db.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });
  if (!record) {
    throw new AppError("Profile not found.", { code: "NOT_FOUND" });
  }
  const profile = record.profile;
  return {
    user: {
      id: record.id,
      email: record.email,
      phone: record.phone,
      emailVerifiedAt: record.emailVerifiedAt,
      status: record.status,
    },
    profile: {
      title: profile?.title ?? null,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      middleName: profile?.middleName ?? null,
      dateOfBirth: profile?.dateOfBirth ?? null,
      gender: profile?.gender ?? null,
      address: profile?.address ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      country: profile?.country ?? null,
    },
  };
}

export async function updatePersonalInfo(
  input: unknown,
): Promise<{ success: true }> {
  const user = await requireUser();
  const parsed = updatePersonalInfoSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }
  const data = parsed.data as UpdatePersonalInfoInput;

  const ctx = await getRequestContext();
  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      id: generateId("prf"),
      userId: user.id,
      title: data.title ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName ?? null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender ?? null,
    },
    update: {
      title: data.title ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName ?? null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender ?? null,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "profile.personal_info_updated",
    resourceType: "profile",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { success: true };
}

export async function updateContact(input: unknown): Promise<{ success: true }> {
  const user = await requireUser();
  const parsed = updateContactSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }
  const data = parsed.data as UpdateContactInput;

  const ctx = await getRequestContext();

  // If the email changes, it needs re-verification.
  let emailVerifiedAt: Date | null | undefined = undefined;
  if (data.email && data.email !== user.email) {
    emailVerifiedAt = null;
  }

  await db.$transaction([
    db.profile.update({
      where: { userId: user.id },
      data: {
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(emailVerifiedAt !== undefined ? { emailVerifiedAt } : {}),
      },
    }),
  ]);

  await logAudit({
    actorId: user.id,
    action: "profile.contact_info_updated",
    resourceType: "profile",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: {
      emailChanged: data.email !== undefined && data.email !== user.email,
      phoneChanged: data.phone !== undefined && data.phone !== user.phone,
    },
  });

  return { success: true };
}

export async function changePassword(input: unknown): Promise<{ success: true }> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }
  const data = parsed.data as ChangePasswordInput;

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const valid = await verifyPassword(data.currentPassword, record?.passwordHash);
  if (!valid) {
    throw validationError({ currentPassword: "Your current password is incorrect" });
  }

  const passwordHash = await hashPassword(data.newPassword);

  const currentTokenHash = await getCurrentSessionTokenHash();
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {}),
      },
      data: { revokedAt: new Date() },
    }),
  ]);

  const ctx = await getRequestContext();
  await logAudit({
    actorId: user.id,
    action: "security.password_changed",
    resourceType: "user",
    resourceId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { success: true };
}
