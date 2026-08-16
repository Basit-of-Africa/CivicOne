import { z } from "zod";
import { emailSchema, phoneSchema, passwordSchema } from "@/modules/auth/validators";

/**
 * Profile validators — server-side validation with Zod.
 */

export const genderSchema = z
  .enum(["MALE", "FEMALE", "PREFER_NOT_TO_SAY"])
  .nullable()
  .optional();

export const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .nullable()
    .optional();

export const updatePersonalInfoSchema = z.object({
  title: optionalText("Title", 80),
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name must be at most 80 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Last name must be at most 80 characters"),
  middleName: optionalText("Middle name", 80),
  dateOfBirth: z
    .string()
    .optional()
    .nullable()
    .refine((value) => {
      if (!value) return true;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return false;
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 110, now.getMonth(), now.getDate());
      return date <= now && date >= minAge;
    }, "Enter a valid date of birth"),
  gender: genderSchema,
});

export const updateContactSchema = z.object({
  email: emailSchema.nullable().optional(),
  phone: phoneSchema.nullable().optional(),
  address: optionalText("Address", 255),
  city: optionalText("City", 80),
  state: optionalText("State", 80),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type UpdatePersonalInfoInput = z.infer<typeof updatePersonalInfoSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
