import { describe, expect, it } from "vitest";
import { identityVerifySchema, ninSchema } from "@/modules/identity/validators";

describe("identity validators", () => {
  it("accepts an 11-digit NIN", () => {
    expect(ninSchema.safeParse("12345678901").success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const parsed = ninSchema.safeParse(" 12345678901 ");
    expect(parsed.success).toBe(true);
    expect(parsed.data).toBe("12345678901");
  });

  it("rejects non-11-digit NINs", () => {
    expect(ninSchema.safeParse("12345").success).toBe(false);
    expect(ninSchema.safeParse("123456789012").success).toBe(false);
    expect(ninSchema.safeParse("1234567890a").success).toBe(false);
    expect(ninSchema.safeParse("").success).toBe(false);
  });

  it("requires consent to verify", () => {
    const base = { nin: "12345678901", consent: true };
    expect(identityVerifySchema.safeParse(base).success).toBe(true);
    const noConsent = identityVerifySchema.safeParse({ ...base, consent: false });
    expect(noConsent.success).toBe(false);
  });
});
