import { z } from "zod";

/**
 * Auth validators — server-side validation with Zod.
 * Mirrored on the client via the same schemas (no duplication).
 */

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPhone(value: string): boolean {
  return /^\+?[0-9\s-]{7,20}$/.test(value) && /\d{7,}/.test(value.replace(/[\s-]/g, ""));
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(320, "Email address is too long")
  .email("Enter a valid email address");

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => isPhone(value), {
    message: "Enter a valid phone number",
  });

/**
 * Email address OR phone number, supplied through a single field.
 */
export const identifierSchema = z
  .string()
  .trim()
  .min(3, "Enter your email address or phone number")
  .max(320, "That looks too long for an email or phone number")
  .superRefine((value, ctx) => {
    if (isEmail(value)) return;
    if (!isPhone(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address or phone number",
      });
    }
  });

/**
 * Password policy: 8-128 characters, at least one letter and one number.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z
  .object({
    identifier: identifierSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    agreeTerms: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
    if (!data.agreeTerms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agreeTerms"],
        message: "You must accept the terms of use to continue",
      });
    }
  });

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
