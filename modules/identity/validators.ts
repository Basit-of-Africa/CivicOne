import { z } from "zod";

export const ninSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "Enter the 11-digit NIN printed on your NIN slip");

export const identityVerifySchema = z
  .object({
    nin: ninSchema,
    consent: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.consent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consent"],
        message: "You must consent to identity verification to continue",
      });
    }
  });

export type IdentityVerifyInput = z.infer<typeof identityVerifySchema>;
