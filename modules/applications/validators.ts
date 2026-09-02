import { z } from "zod";

export const applicationReferenceSchema = z
  .string()
  .regex(/^CO-\d{4}-\d{6}$/, "Invalid application reference");

export const applicationIdSchema = z.object({
  applicationId: z.string().min(1, "Application id is required"),
});

export const serviceIdForApplicationSchema = z.object({
  serviceId: z.string().min(1, "Service id is required"),
});

export const saveAnswersSchema = z.object({
  applicationId: z.string().min(1),
  formKey: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
});

export const uploadDocumentSchema = z.object({
  applicationId: z.string().min(1),
  formKey: z.string().min(1),
  fieldKey: z.string().min(1),
  label: z.string().min(1),
});

export const documentIdSchema = z.object({
  documentId: z.string().min(1),
});

export const reuseWalletDocumentSchema = z.object({
  applicationId: z.string().min(1),
  formKey: z.string().min(1),
  fieldKey: z.string().min(1),
  label: z.string().min(1),
  walletDocumentId: z.string().min(1),
});
