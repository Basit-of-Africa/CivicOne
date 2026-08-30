import { describe, expect, it } from "vitest";
import {
  assertPermission,
  hasPermission,
  hasAnyRole,
  PERMISSIONS,
  roleHasPermission,
} from "@/server/rbac";

describe("role-based authorisation", () => {
  it("grants base permissions to a plain user", () => {
    expect(roleHasPermission("USER", PERMISSIONS.PROFILE_READ)).toBe(true);
    expect(roleHasPermission("USER", PERMISSIONS.IDENTITY_SELF)).toBe(true);
  });

  it("keeps admin roles scoped", () => {
    // Service admins manage services, not identity.
    expect(roleHasPermission("SERVICE_ADMIN", PERMISSIONS.SERVICES_MANAGE)).toBe(true);
    expect(roleHasPermission("SERVICE_ADMIN", PERMISSIONS.IDENTITY_VERIFY)).toBe(false);
    // Content admins manage content, not services.
    expect(roleHasPermission("CONTENT_ADMIN", PERMISSIONS.CONTENT_PUBLISH)).toBe(true);
    expect(roleHasPermission("CONTENT_ADMIN", PERMISSIONS.SERVICES_MANAGE)).toBe(false);
    // Identity admins review identity, not content.
    expect(roleHasPermission("IDENTITY_ADMIN", PERMISSIONS.IDENTITY_REVIEW)).toBe(true);
    expect(roleHasPermission("IDENTITY_ADMIN", PERMISSIONS.CONTENT_MANAGE)).toBe(false);
  });

  it("gives no admin unrestricted access by default", () => {
    expect(roleHasPermission("SERVICE_ADMIN", PERMISSIONS.ADMIN_ALL)).toBe(false);
    expect(roleHasPermission("IDENTITY_ADMIN", PERMISSIONS.ADMIN_ALL)).toBe(false);
    expect(roleHasPermission("SUPER_ADMIN", PERMISSIONS.ADMIN_ALL)).toBe(true);
  });

  it("supports role lists", () => {
    expect(hasPermission(["USER"], PERMISSIONS.PROFILE_READ)).toBe(true);
    expect(hasPermission(["USER"], PERMISSIONS.SERVICES_MANAGE)).toBe(false);
    expect(hasAnyRole(["USER", "PROFESSIONAL"], ["PROFESSIONAL"])).toBe(true);
  });

  it("throws FORBIDDEN via assertPermission", () => {
    expect(() => assertPermission(["USER"], PERMISSIONS.SERVICES_MANAGE)).toThrow();
    expect(() => assertPermission(["SERVICE_ADMIN"], PERMISSIONS.SERVICES_MANAGE)).not.toThrow();
  });

  it("gates identity reads by scope", () => {
    expect(roleHasPermission("USER", PERMISSIONS.IDENTITY_VERIFY)).toBe(true);
    expect(roleHasPermission("USER", PERMISSIONS.IDENTITY_READ_MASKED)).toBe(true);
    expect(roleHasPermission("USER", PERMISSIONS.IDENTITY_READ_FULL)).toBe(false);
    expect(roleHasPermission("PROFESSIONAL", PERMISSIONS.IDENTITY_READ_MASKED)).toBe(true);
    expect(roleHasPermission("IDENTITY_ADMIN", PERMISSIONS.IDENTITY_READ_MASKED)).toBe(true);
    expect(roleHasPermission("IDENTITY_ADMIN", PERMISSIONS.IDENTITY_READ_FULL)).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", PERMISSIONS.IDENTITY_READ_FULL)).toBe(true);
    expect(roleHasPermission("SERVICE_ADMIN", PERMISSIONS.IDENTITY_READ_FULL)).toBe(false);
  });

  it("grants services:save to USER, PROFESSIONAL, SERVICE_ADMIN and CONTENT_ADMIN", () => {
    expect(hasPermission(["USER"], PERMISSIONS.SERVICES_SAVE)).toBe(true);
    expect(hasPermission(["PROFESSIONAL"], PERMISSIONS.SERVICES_SAVE)).toBe(true);
    expect(hasPermission(["SERVICE_ADMIN"], PERMISSIONS.SERVICES_SAVE)).toBe(true);
    expect(hasPermission(["CONTENT_ADMIN"], PERMISSIONS.SERVICES_SAVE)).toBe(true);
    expect(hasPermission(["IDENTITY_ADMIN"], PERMISSIONS.SERVICES_SAVE)).toBe(false);
  });

  it("grants records:self and documents:self to USER and PROFESSIONAL", () => {
    expect(roleHasPermission("USER", PERMISSIONS.RECORDS_SELF)).toBe(true);
    expect(roleHasPermission("USER", PERMISSIONS.DOCUMENTS_SELF)).toBe(true);
    expect(roleHasPermission("PROFESSIONAL", PERMISSIONS.RECORDS_SELF)).toBe(true);
    expect(roleHasPermission("PROFESSIONAL", PERMISSIONS.DOCUMENTS_SELF)).toBe(true);
    expect(roleHasPermission("SERVICE_ADMIN", PERMISSIONS.RECORDS_SELF)).toBe(false);
    expect(roleHasPermission("SERVICE_ADMIN", PERMISSIONS.DOCUMENTS_SELF)).toBe(false);
  });
});
