"use server";

import { fail, toFieldErrors, validationError, withActionResult } from "@/server/errors";
import {
  attachDocument,
  cancelApplication,
  confirmEligibility,
  confirmPayment,
  advanceStep,
  saveAnswers,
  simulateProvider,
  startApplication,
  removeDocument,
  reuseWalletDocument,
} from "./service";
import {
  applicationIdSchema,
  documentIdSchema,
  reuseWalletDocumentSchema,
  saveAnswersSchema,
  serviceIdForApplicationSchema,
  uploadDocumentSchema,
} from "./validators";

export async function startApplicationAction(serviceId: string) {
  const parsed = serviceIdForApplicationSchema.safeParse({ serviceId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => startApplication(serviceId));
}

export async function saveAnswersAction(input: {
  applicationId: string;
  formKey: string;
  values: Record<string, unknown>;
}) {
  const parsed = saveAnswersSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() =>
    saveAnswers(parsed.data.applicationId, parsed.data.formKey, parsed.data.values),
  );
}

export async function confirmEligibilityAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => confirmEligibility(applicationId));
}

export async function confirmPaymentAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => confirmPayment(applicationId));
}

export async function uploadDocumentAction(input: {
  applicationId: string;
  formKey: string;
  fieldKey: string;
  label: string;
  file: File;
}) {
  const parsed = uploadDocumentSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  const buffer = Buffer.from(await input.file.arrayBuffer());
  return withActionResult(() =>
    attachDocument(
      parsed.data.applicationId,
      parsed.data.formKey,
      parsed.data.fieldKey,
      parsed.data.label,
      {
        name: input.file.name,
        type: input.file.type,
        size: input.file.size,
        buffer,
      },
    ),
  );
}

export async function removeDocumentAction(input: {
  applicationId: string;
  documentId: string;
}) {
  const id = documentIdSchema.safeParse(input);
  if (!id.success) return fail(validationError(toFieldErrors(id.error)));
  return withActionResult(() => removeDocument(input.applicationId, input.documentId));
}

export async function advanceStepAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => advanceStep(applicationId));
}

export async function simulateProviderAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => simulateProvider(applicationId));
}

export async function cancelApplicationAction(applicationId: string) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => cancelApplication(applicationId));
}

export async function reuseWalletDocumentAction(input: {
  applicationId: string;
  formKey: string;
  fieldKey: string;
  label: string;
  walletDocumentId: string;
}) {
  const parsed = reuseWalletDocumentSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() =>
    reuseWalletDocument(
      parsed.data.applicationId,
      parsed.data.formKey,
      parsed.data.fieldKey,
      parsed.data.label,
      parsed.data.walletDocumentId,
    ),
  );
}

// ---------------------------------------------------------------------------
// Phase 6B — User-reported progress tracking
// ---------------------------------------------------------------------------

import { reportProgress } from "./service";

export async function reportApplicationProgress(
  applicationId: string,
  status: string,
  note?: string,
) {
  const parsed = applicationIdSchema.safeParse({ applicationId });
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => reportProgress(applicationId, status, note));
}
