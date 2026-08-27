import { z } from "zod";
import type { WorkflowStepType } from "@prisma/client";

export const eligibilityConfigSchema = z.object({
  confirmLabel: z.string().optional(),
  eligibilityText: z.string().optional(),
});
export type EligibilityConfig = z.infer<typeof eligibilityConfigSchema>;

export const formConfigSchema = z.object({ formKey: z.string() });
export type FormConfig = z.infer<typeof formConfigSchema>;

export const documentsConfigSchema = z.object({
  documents: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      required: z.boolean().optional().default(true),
      accept: z.string().optional(),
    }),
  ),
});
export type DocumentsConfig = z.infer<typeof documentsConfigSchema>;

export const paymentConfigSchema = z.object({
  demo: z.boolean().optional().default(true),
});
export type PaymentConfig = z.infer<typeof paymentConfigSchema>;

export const submissionConfigSchema = z.object({
  provider: z.enum(["MOCK_CAC", "MOCK_PASSPORT", "MOCK_DRIVER_LICENCE"]),
});
export type SubmissionConfig = z.infer<typeof submissionConfigSchema>;

export interface WorkflowStepView {
  id: string;
  type: WorkflowStepType;
  title: string;
  description: string | null;
  sortOrder: number;
  config: Record<string, unknown> | null;
}

export function parseWorkflowStepConfig(
  type: WorkflowStepType,
  config: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!config) return null;
  switch (type) {
    case "ELIGIBILITY":
      return eligibilityConfigSchema.parse(config);
    case "FORM":
      return formConfigSchema.parse(config);
    case "DOCUMENTS":
      return documentsConfigSchema.parse(config);
    case "PAYMENT":
      return paymentConfigSchema.parse(config);
    case "SUBMISSION":
      return submissionConfigSchema.parse(config);
    default:
      return null;
  }
}
