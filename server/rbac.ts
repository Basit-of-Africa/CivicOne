import type { RoleName } from "@prisma/client";
import { AppError } from "@/server/errors";

/**
 * Role-based authorisation.
 *
 * Admin roles are scoped — they do NOT grant unrestricted access. Each role
 * maps to an explicit set of permissions; `SUPER_ADMIN` is the only role that
 * spans the platform. Phase 1 establishes the architecture; the permission
 * set grows as modules land in later phases.
 */

export const PERMISSIONS = {
  PROFILE_READ: "profile:read",
  PROFILE_UPDATE: "profile:update",
  IDENTITY_SELF: "identity:self",
  IDENTITY_VERIFY: "identity:verify",
  IDENTITY_REVIEW: "identity:review",
  SERVICES_VIEW: "services:view",
  SERVICES_MANAGE: "services:manage",
  SERVICES_PUBLISH: "services:publish",
  APPLICATIONS_SELF: "applications:self",
  CONTENT_MANAGE: "content:manage",
  CONTENT_PUBLISH: "content:publish",
  USERS_READ: "users:read",
  AUDIT_READ: "audit:read",
  ADMIN_ALL: "admin:all",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  USER: [
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.IDENTITY_SELF,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.APPLICATIONS_SELF,
  ],
  PROFESSIONAL: [
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.IDENTITY_SELF,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.APPLICATIONS_SELF,
  ],
  SERVICE_ADMIN: [
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.SERVICES_MANAGE,
    PERMISSIONS.SERVICES_PUBLISH,
    PERMISSIONS.CONTENT_MANAGE,
  ],
  CONTENT_ADMIN: [
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.CONTENT_MANAGE,
    PERMISSIONS.CONTENT_PUBLISH,
  ],
  IDENTITY_ADMIN: [
    PERMISSIONS.IDENTITY_VERIFY,
    PERMISSIONS.IDENTITY_REVIEW,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.AUDIT_READ,
  ],
  SUPER_ADMIN: [PERMISSIONS.ADMIN_ALL],
};

const SUPER_ADMIN_OVERRIDES: Permission[] = [
  PERMISSIONS.PROFILE_READ,
  PERMISSIONS.PROFILE_UPDATE,
  PERMISSIONS.IDENTITY_SELF,
  PERMISSIONS.IDENTITY_VERIFY,
  PERMISSIONS.IDENTITY_REVIEW,
  PERMISSIONS.SERVICES_VIEW,
  PERMISSIONS.SERVICES_MANAGE,
  PERMISSIONS.SERVICES_PUBLISH,
  PERMISSIONS.APPLICATIONS_SELF,
  PERMISSIONS.CONTENT_MANAGE,
  PERMISSIONS.CONTENT_PUBLISH,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.ADMIN_ALL,
];

export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") {
    return SUPER_ADMIN_OVERRIDES.includes(permission);
  }
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasPermission(
  roleNames: RoleName[],
  permission: Permission,
): boolean {
  return roleNames.some((role) => roleHasPermission(role, permission));
}

export function hasAnyRole(roleNames: RoleName[], roles: RoleName[]): boolean {
  return roles.some((role) => roleNames.includes(role));
}

export function assertPermission(
  roleNames: RoleName[],
  permission: Permission,
  message = "You do not have permission to perform this action.",
): void {
  if (!hasPermission(roleNames, permission)) {
    throw new AppError(message, { code: "FORBIDDEN" });
  }
}
