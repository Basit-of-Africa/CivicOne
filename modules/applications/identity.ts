import type { IdentityReuseContext } from "./service";
import type { VerifiedIdentity } from "./form-config";

export function toVerifiedIdentity(ctx: IdentityReuseContext): VerifiedIdentity | null {
  if (!ctx.verified) return null;
  return {
    legalName: ctx.legalName ?? "",
    dateOfBirth: ctx.dateOfBirth ?? "",
    nationality: ctx.nationality ?? "",
    gender: ctx.gender ?? "",
  };
}
