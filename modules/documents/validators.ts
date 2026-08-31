import { z } from "zod";

export const walletDocumentUploadSchema = z.object({
  category: z.enum([
    "IDENTITY", "CERTIFICATES", "LICENCES", "BUSINESS", "TAX",
    "EDUCATION", "PROPERTY", "EMPLOYMENT", "OTHER",
  ]),
  name: z.string().min(1, "Document name is required").max(160),
  issuer: z.string().max(160).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
});

export const walletDocumentIdSchema = z.object({
  documentId: z.string().min(1, "Document id is required"),
});
