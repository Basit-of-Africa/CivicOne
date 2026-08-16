import { describe, expect, it } from "vitest";
import {
  emailSchema,
  identifierSchema,
  isEmail,
  isPhone,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/modules/auth/validators";

describe("auth validators", () => {
  describe("isEmail / isPhone", () => {
    it("recognises valid emails", () => {
      expect(isEmail("ada@example.com")).toBe(true);
      expect(isEmail("ada.obi@example.co.uk")).toBe(true);
    });

    it("recognises valid phone numbers", () => {
      expect(isPhone("+2348000000000")).toBe(true);
      expect(isPhone("0800 000 0000")).toBe(true);
      expect(isPhone("08123456789")).toBe(true);
    });

    it("rejects invalid values", () => {
      expect(isEmail("not-an-email")).toBe(false);
      expect(isPhone("abc")).toBe(false);
    });
  });

  describe("identifierSchema", () => {
    it("accepts an email address", () => {
      const result = identifierSchema.safeParse("ada@example.com");
      expect(result.success).toBe(true);
    });

    it("accepts a phone number", () => {
      const result = identifierSchema.safeParse("+234 800 000 0000");
      expect(result.success).toBe(true);
    });

    it("rejects invalid identifiers", () => {
      for (const value of ["", "ab", "not-an-email", "###"]) {
        expect(identifierSchema.safeParse(value).success).toBe(false);
      }
    });
  });

  describe("passwordSchema", () => {
    it("accepts a strong password", () => {
      expect(passwordSchema.safeParse("CivicOne2024!").success).toBe(true);
    });

    it("rejects short passwords", () => {
      expect(passwordSchema.safeParse("short1").success).toBe(false);
    });

    it("requires a letter and a number", () => {
      expect(passwordSchema.safeParse("onlyletters").success).toBe(false);
      expect(passwordSchema.safeParse("123456789").success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("accepts valid registration input", () => {
      const result = registerSchema.safeParse({
        identifier: "ada@example.com",
        password: "CivicOne2024!",
        confirmPassword: "CivicOne2024!",
        agreeTerms: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const result = registerSchema.safeParse({
        identifier: "ada@example.com",
        password: "CivicOne2024!",
        confirmPassword: "Different2024!",
        agreeTerms: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path[0] === "confirmPassword")).toBe(true);
      }
    });

    it("requires terms acceptance", () => {
      const result = registerSchema.safeParse({
        identifier: "ada@example.com",
        password: "CivicOne2024!",
        confirmPassword: "CivicOne2024!",
        agreeTerms: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts identifier + password", () => {
      expect(
        loginSchema.safeParse({
          identifier: "ada@example.com",
          password: "CivicOne2024!",
        }).success,
      ).toBe(true);
    });

    it("rejects empty password", () => {
      expect(
        loginSchema.safeParse({ identifier: "ada@example.com", password: "" })
          .success,
      ).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts matching passwords", () => {
      expect(
        resetPasswordSchema.safeParse({
          password: "NewPass2024!",
          confirmPassword: "NewPass2024!",
        }).success,
      ).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      expect(
        resetPasswordSchema.safeParse({
          password: "NewPass2024!",
          confirmPassword: "Other2024!",
        }).success,
      ).toBe(false);
    });
  });

  it("emailSchema trims and lowercases", () => {
    expect(emailSchema.parse("  Ada@Example.COM ")).toBe("ada@example.com");
  });
});
