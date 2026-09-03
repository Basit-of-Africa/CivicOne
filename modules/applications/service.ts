import "server-only";
import type {
  Application,
  ApplicationStatus,
  Prisma,
  ServiceMode,
} from "@prisma/client";
import { db } from "@/server/db";
import { AppError, toFieldErrors, validationError } from "@/server/errors";
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { logAudit } from "@/server/audit";
import { getRequestContext } from "@/server/request";
import { generateId } from "@/lib/id";
import { nextApplicationReference } from "./reference";
import {
  applyIdentityAnswers,
  buildFormSchema,
  type VerifiedIdentity,
} from "./form-config";
import {
  documentsConfigSchema,
  formConfigSchema,
  parseWorkflowStepConfig,
  type WorkflowStepView,
} from "./workflow-config";
import { getMockProvider, type MockProviderId } from "./providers";
import { applicationReferenceSchema } from "./validators";
import { createRecordForApprovedApplication } from "@/modules/records/service";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export interface IdentityReuseContext {
  verified: boolean;
  legalName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  gender: string | null;
}

export async function getIdentityReuseContext(userId: string): Promise<IdentityReuseContext> {
  const profile = await db.identityProfile.findUnique({ where: { userId } });
  const verified = profile?.verificationStatus === "VERIFIED";
  return {
    verified,
    legalName: verified ? profile?.legalName ?? null : null,
    dateOfBirth:
      verified && profile?.dateOfBirth
        ? profile.dateOfBirth.toISOString().slice(0, 10)
        : null,
    nationality: verified ? profile?.nationality ?? null : null,
    gender: verified ? profile?.gender ?? null : null,
  };
}

function toVerifiedIdentity(ctx: IdentityReuseContext): VerifiedIdentity | null {
  if (!ctx.verified) return null;
  return {
    legalName: ctx.legalName ?? "",
    dateOfBirth: ctx.dateOfBirth ?? "",
    nationality: ctx.nationality ?? "",
    gender: ctx.gender ?? "",
  };
}

const stepSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  sortOrder: true,
  config: true,
} as const;

const cardSelect = {
  id: true,
  reference: true,
  status: true,
  updatedAt: true,
  service: {
    select: {
      slug: true,
      name: true,
      provider: { select: { name: true, abbreviation: true } },
    },
  },
  currentStepId: true,
  workflow: {
    select: { steps: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, type: true } } },
  },
} as const;

export interface ApplicationCardView {
  id: string;
  reference: string;
  status: ApplicationStatus;
  serviceSlug: string;
  serviceName: string;
  providerName: string;
  providerAbbreviation: string | null;
  updatedAt: Date;
  nextAction: string;
}

export interface ApplicationDocumentView {
  id: string;
  formKey: string;
  fieldKey: string;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface ApplicationTimelineEntry {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  reason: string | null;
  createdAt: Date;
}

export interface ApplicationDetailView {
  id: string;
  reference: string;
  status: ApplicationStatus;
  serviceSlug: string;
  serviceName: string;
  serviceSummary: string;
  providerName: string;
  providerAbbreviation: string | null;
  jurisdictionName: string;
  mode: ServiceMode;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  providerRef: string | null;
  currentStepId: string | null;
  steps: WorkflowStepView[];
  answers: Record<string, Record<string, unknown>>;
  verifiedFields: Record<string, boolean>;
  documents: ApplicationDocumentView[];
  timeline: ApplicationTimelineEntry[];
  identity: IdentityReuseContext;
  nextAction: string;
}

export async function startApplication(
  serviceId: string,
): Promise<{ reference: string }> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: {
      workflow: { include: { steps: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!service || !service.isActive) {
    throw new AppError("Service not found.", { code: "NOT_FOUND" });
  }
  const workflow = service.workflow;
  if (!workflow || !workflow.isActive || workflow.steps.length === 0) {
    throw new AppError("This service cannot be applied for online yet.", {
      code: "CONFLICT",
    });
  }

  const reference = await nextApplicationReference();
  const firstStep = workflow.steps[0];

  const application = await db.application.create({
    data: {
      id: generateId("app"),
      reference,
      userId: user.id,
      serviceId: service.id,
      workflowId: workflow.id,
      status: "DRAFT",
      currentStepId: firstStep.id,
    },
  });

  const ctx = await getRequestContext();
  await logAudit({
    actorId: user.id,
    action: "application.created",
    resourceType: "application",
    resourceId: application.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { reference },
  });

  return { reference };
}

export async function getApplicationsForUser(): Promise<ApplicationCardView[]> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  const rows = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: cardSelect,
  });

  return rows.map((row) => {
    const steps = row.workflow.steps;
    const current = steps.find((s) => s.id === row.currentStepId);
    const nextAction =
      row.status === "DRAFT" || row.status === "READY" || row.status === "PAYMENT_PENDING"
        ? `Continue: ${current?.title ?? "application"}`
        : row.status === "SUBMITTED" || row.status === "UNDER_REVIEW" || row.status === "ACTION_REQUIRED"
          ? "Awaiting provider update"
          : row.status === "APPROVED"
            ? "Ready to complete"
            : row.status;
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      serviceSlug: row.service.slug,
      serviceName: row.service.name,
      providerName: row.service.provider.name,
      providerAbbreviation: row.service.provider.abbreviation,
      updatedAt: row.updatedAt,
      nextAction,
    };
  });
}

export async function getApplicationByReference(
  reference: string,
): Promise<ApplicationDetailView> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  const parsed = applicationReferenceSchema.safeParse(reference);
  if (!parsed.success) {
    throw new AppError("Invalid application reference.", { code: "NOT_FOUND" });
  }

  const row = await db.application.findUnique({
    where: { reference },
    include: {
      service: {
        select: {
          slug: true,
          name: true,
          summary: true,
          mode: true,
          provider: { select: { name: true, abbreviation: true } },
          jurisdiction: { select: { name: true } },
        },
      },
      workflow: {
        include: { steps: { orderBy: { sortOrder: "asc" }, select: stepSelect } },
      },
      answers: true,
      documents: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!row || row.userId !== user.id) {
    throw new AppError("Application not found.", { code: "NOT_FOUND" });
  }

  const steps = row.workflow.steps.map((step) => ({
    id: step.id,
    type: step.type,
    title: step.title,
    description: step.description,
    sortOrder: step.sortOrder,
    config: parseWorkflowStepConfig(
      step.type,
      step.config as Record<string, unknown> | null,
    ),
  }));

  const answers: Record<string, Record<string, unknown>> = {};
  const verifiedFields: Record<string, boolean> = {};
  for (const answer of row.answers) {
    if (!answers[answer.formKey]) answers[answer.formKey] = {};
    answers[answer.formKey][answer.fieldKey] = answer.value;
    if (answer.verified) verifiedFields[answer.fieldKey] = true;
  }

  const identity = await getIdentityReuseContext(user.id);

  const current = steps.find((s) => s.id === row.currentStepId);
  const nextAction =
    row.status === "DRAFT" || row.status === "READY" || row.status === "PAYMENT_PENDING"
      ? `Continue: ${current?.title ?? "application"}`
      : row.status === "SUBMITTED" || row.status === "UNDER_REVIEW" || row.status === "ACTION_REQUIRED"
        ? "Awaiting provider update"
        : row.status;

  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    serviceSlug: row.service.slug,
    serviceName: row.service.name,
    serviceSummary: row.service.summary,
    providerName: row.service.provider.name,
    providerAbbreviation: row.service.provider.abbreviation,
    jurisdictionName: row.service.jurisdiction.name,
    mode: row.service.mode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    providerRef: row.providerRef,
    currentStepId: row.currentStepId,
    steps,
    answers,
    verifiedFields,
    documents: row.documents.map((d) => ({
      id: d.id,
      formKey: d.formKey,
      fieldKey: d.fieldKey,
      label: d.label,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      createdAt: d.createdAt,
    })),
    timeline: row.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
    identity,
    nextAction,
  };
}

async function getOwnedApplication(applicationId: string, user: { id: string }) {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: { workflow: { include: { steps: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!application || application.userId !== user.id) {
    throw new AppError("Application not found.", { code: "NOT_FOUND" });
  }
  return application;
}

function assertEditable(status: ApplicationStatus): void {
  if (status !== "DRAFT" && status !== "READY" && status !== "PAYMENT_PENDING") {
    throw new AppError("This application can no longer be edited.", {
      code: "CONFLICT",
    });
  }
}

async function transitionStatus(
  applicationId: string,
  toStatus: ApplicationStatus,
  reason?: string,
  actorUserId?: string,
): Promise<void> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true },
  });
  if (!application) throw new AppError("Application not found.", { code: "NOT_FOUND" });
  if (application.status === toStatus) return;
  await db.$transaction([
    db.application.update({
      where: { id: applicationId },
      data: { status: toStatus },
    }),
    db.applicationStatusHistory.create({
      data: {
        id: generateId("ash"),
        applicationId,
        fromStatus: application.status,
        toStatus,
        reason: reason ?? null,
        actorUserId: actorUserId ?? null,
      },
    }),
  ]);
}

export async function saveAnswers(
  applicationId: string,
  formKey: string,
  values: Record<string, unknown>,
): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);

  const form = await db.serviceFormDefinition.findUnique({ where: { key: formKey } });
  if (!form) throw new AppError("Form definition not found.", { code: "NOT_FOUND" });

  const definition = form.config as unknown as {
    key: string;
    name: string;
    fields: Parameters<typeof buildFormSchema>[0]["fields"];
  };

  const schema = buildFormSchema(definition);
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }

  const identity = toVerifiedIdentity(await getIdentityReuseContext(user.id));
  const finalValues = applyIdentityAnswers(definition.fields, parsed.data as Record<string, unknown>, identity);

  const data = (application.data as Record<string, Record<string, unknown>> | null) ?? {};
  data[formKey] = finalValues;

  await db.$transaction([
    db.application.update({ where: { id: applicationId }, data: { data: data as never } }),
    ...definition.fields.map((field) =>
      db.applicationAnswer.upsert({
        where: {
          applicationId_formKey_fieldKey: {
            applicationId,
            formKey,
            fieldKey: field.key,
          },
        },
        update: {
          value: (finalValues[field.key] ?? null) as Prisma.InputJsonValue,
          verified: Boolean(field.identityField && identity?.[field.identityField]),
        },
        create: {
          id: generateId("ans"),
          applicationId,
          formKey,
          fieldKey: field.key,
          value: (finalValues[field.key] ?? null) as Prisma.InputJsonValue,
          verified: Boolean(field.identityField && identity?.[field.identityField]),
        },
      }),
    ),
  ]);
}

export async function confirmEligibility(applicationId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);
  const data = (application.data as Record<string, unknown> | null) ?? {};
  data.eligibilityConfirmed = true;
  await db.application.update({
    where: { id: applicationId },
    data: { data: data as never },
  });
}

export async function confirmPayment(applicationId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);
  const data = (application.data as Record<string, unknown> | null) ?? {};
  data.paymentConfirmed = true;
  await db.application.update({
    where: { id: applicationId },
    data: { data: data as never },
  });
}

export async function attachDocument(
  applicationId: string,
  formKey: string,
  fieldKey: string,
  label: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);

  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    throw new AppError("File must be between 1 byte and 5 MB.", { code: "VALIDATION_ERROR" });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new AppError("File type not supported.", { code: "VALIDATION_ERROR" });
  }

  const document = await db.applicationDocument.create({
    data: {
      id: generateId("adoc"),
      applicationId,
      formKey,
      fieldKey,
      label,
      fileName: file.name.slice(0, 255),
      mimeType: file.type,
      sizeBytes: file.size,
      fileData: file.buffer as unknown as Uint8Array<ArrayBuffer>,
    },
  });

  const data = (application.data as Record<string, Record<string, unknown>> | null) ?? {};
  if (!data[formKey]) data[formKey] = {};
  data[formKey][fieldKey] = document.id;

  await db.applicationAnswer.upsert({
    where: { applicationId_formKey_fieldKey: { applicationId, formKey, fieldKey } },
    update: { value: document.id },
    create: {
      id: generateId("ans"),
      applicationId,
      formKey,
      fieldKey,
      value: document.id,
    },
  });

  await db.application.update({
    where: { id: applicationId },
    data: { data: data as never },
  });
}

export async function removeDocument(applicationId: string, documentId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);
  const document = await db.applicationDocument.findFirst({
    where: { id: documentId, applicationId },
  });
  if (!document) throw new AppError("Document not found.", { code: "NOT_FOUND" });
  await db.applicationDocument.delete({ where: { id: documentId } });
}

export async function reuseWalletDocument(
  applicationId: string,
  formKey: string,
  fieldKey: string,
  label: string,
  walletDocumentId: string,
): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);

  const walletDoc = await db.walletDocument.findFirst({
    where: { id: walletDocumentId, userId: user.id },
  });
  if (!walletDoc) throw new AppError("Wallet document not found.", { code: "NOT_FOUND" });

  const document = await db.applicationDocument.create({
    data: {
      id: generateId("adoc"),
      applicationId,
      formKey,
      fieldKey,
      label,
      fileName: walletDoc.fileName,
      mimeType: walletDoc.mimeType,
      sizeBytes: walletDoc.sizeBytes,
      fileData: walletDoc.fileData,
    },
  });

  const data = (application.data as Record<string, Record<string, unknown>> | null) ?? {};
  if (!data[formKey]) data[formKey] = {};
  data[formKey][fieldKey] = document.id;

  await db.applicationAnswer.upsert({
    where: { applicationId_formKey_fieldKey: { applicationId, formKey, fieldKey } },
    update: { value: document.id },
    create: {
      id: generateId("ans"),
      applicationId,
      formKey,
      fieldKey,
      value: document.id,
    },
  });

  await db.application.update({
    where: { id: applicationId },
    data: { data: data as never },
  });
}

export async function advanceStep(applicationId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  assertEditable(application.status);

  const steps = application.workflow.steps;
  const index = steps.findIndex((s) => s.id === application.currentStepId);
  if (index < 0) throw new AppError("Application is not at an editable step.", { code: "CONFLICT" });
  const current = steps[index];

  await validateStep(application, current);

  const next = steps[index + 1];

  if (current.type === "SUBMISSION") {
    const config = (current.config ?? {}) as { provider?: MockProviderId };
    const provider = getMockProvider(config.provider ?? "MOCK_CAC");
    const submitted = await provider.submit({
      reference: application.reference,
      providerRef: application.providerRef,
      status: application.status,
    });
    await db.application.update({
      where: { id: applicationId },
      data: {
        providerRef: submitted.providerRef,
        providerName: provider.id,
        submittedAt: new Date(),
      },
    });
    await transitionStatus(applicationId, "SUBMITTED", submitted.note, user.id);
  }

  if (next) {
    await db.application.update({
      where: { id: applicationId },
      data: { currentStepId: next.id },
    });
    const statusForStep: Partial<Record<string, ApplicationStatus>> = {
      REVIEW: "READY",
      PAYMENT: "PAYMENT_PENDING",
    };
    const target = statusForStep[next.type];
    if (target) await transitionStatus(applicationId, target, `Moved to ${next.title}`, user.id);
  }
}

async function validateStep(
  application: Application & { workflow: { steps: Array<{ id: string; type: string; config: unknown }> } },
  step: { id: string; type: string; config: unknown },
): Promise<void> {
  const data = (application.data as Record<string, unknown> | null) ?? {};

  if (step.type === "ELIGIBILITY") {
    if (data.eligibilityConfirmed !== true) {
      throw new AppError("Please confirm the eligibility statement first.", { code: "VALIDATION_ERROR" });
    }
    return;
  }

  if (step.type === "FORM") {
    const config = formConfigSchema.safeParse(step.config);
    if (!config.success) throw new AppError("Form step is misconfigured.", { code: "INTERNAL" });
    const form = await db.serviceFormDefinition.findUnique({
      where: { key: config.data.formKey },
    });
    if (!form) throw new AppError("Form definition not found.", { code: "INTERNAL" });
    const definition = form.config as unknown as Parameters<typeof buildFormSchema>[0];
    const formData = (data[config.data.formKey] as Record<string, unknown> | null) ?? {};
    const parsed = buildFormSchema(definition).safeParse(formData);
    if (!parsed.success) {
      throw new AppError("Please complete this form before continuing.", { code: "VALIDATION_ERROR" });
    }
    return;
  }

  if (step.type === "DOCUMENTS") {
    const config = documentsConfigSchema.safeParse(step.config);
    if (!config.success) throw new AppError("Documents step is misconfigured.", { code: "INTERNAL" });
    for (const doc of config.data.documents) {
      if (!doc.required) continue;
      const attached = await db.applicationDocument.findFirst({
        where: { applicationId: application.id, fieldKey: doc.key },
      });
      if (!attached) {
        throw new AppError(`Please attach: ${doc.label}`, { code: "VALIDATION_ERROR" });
      }
    }
    return;
  }

  if (step.type === "PAYMENT") {
    if (data.paymentConfirmed !== true) {
      throw new AppError("Please confirm your payment before continuing.", { code: "VALIDATION_ERROR" });
    }
    return;
  }
}

export async function simulateProvider(
  applicationId: string,
): Promise<{ status: string }> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);

  const providerId = application.providerName as MockProviderId | null;
  if (!providerId) {
    throw new AppError("This application has not been submitted.", { code: "CONFLICT" });
  }
  if (!["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED"].includes(application.status)) {
    throw new AppError("There is nothing to simulate right now.", { code: "CONFLICT" });
  }

  const provider = getMockProvider(providerId);
  const outcome = await provider.advance({
    reference: application.reference,
    providerRef: application.providerRef,
    status: application.status,
  });

  await transitionStatus(application.id, outcome.status, outcome.note, user.id);
  if (outcome.status === "APPROVED" || outcome.status === "REJECTED") {
    await db.application.update({
      where: { id: application.id },
      data: { completedAt: new Date() },
    });
    if (outcome.status === "APPROVED") {
      try {
        await createRecordForApprovedApplication(application.id);
      } catch (error) {
        console.error("[records] failed to create record on approval", error);
      }
    }
  }

  const ctx = await getRequestContext();
  await logAudit({
    actorId: user.id,
    action: "application.status_simulated",
    resourceType: "application",
    resourceId: application.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { to: outcome.status },
  });

  return { status: outcome.status };
}

export async function cancelApplication(applicationId: string): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);
  if (["APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(application.status)) {
    throw new AppError("This application can no longer be cancelled.", { code: "CONFLICT" });
  }
  await transitionStatus(applicationId, "CANCELLED", "Cancelled by applicant", user.id);
}

export async function getApplicationDocument(
  reference: string,
  documentId: string,
): Promise<{ applicationReference: string; fileName: string; mimeType: string; fileData: Uint8Array }> {
  const user = await requireUser();
  const application = await db.application.findUnique({
    where: { reference },
    select: { id: true, userId: true, reference: true },
  });
  if (!application || application.userId !== user.id) {
    throw new AppError("Application not found.", { code: "NOT_FOUND" });
  }
  const document = await db.applicationDocument.findFirst({
    where: { id: documentId, applicationId: application.id },
  });
  if (!document) throw new AppError("Document not found.", { code: "NOT_FOUND" });
  return {
    applicationReference: application.reference,
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileData: document.fileData,
  };
}

// ---------------------------------------------------------------------------
// Phase 6B — User-reported progress tracking
// ---------------------------------------------------------------------------

export async function reportProgress(
  applicationId: string,
  status: string,
  note?: string,
): Promise<void> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);
  const application = await getOwnedApplication(applicationId, user);

  // Only allow progress reports for applications that are submitted or beyond
  if (["DRAFT", "READY", "PAYMENT_PENDING"].includes(application.status)) {
    throw new AppError(
      "You can only report progress for submitted applications.",
      { code: "CONFLICT" },
    );
  }

  // Don't allow progress reports on terminal states
  if (["APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(application.status)) {
    throw new AppError(
      "This application has already reached a final status.",
      { code: "CONFLICT" },
    );
  }

  const ctx = await getRequestContext();

  // Create a status history entry
  await db.applicationStatusHistory.create({
    data: {
      id: generateId("ash"),
      applicationId: application.id,
      fromStatus: application.status as ApplicationStatus,
      toStatus: status as ApplicationStatus,
      reason: note ?? `User reported: ${status}`,
      actorUserId: user.id,
    },
  });

  // Update the application status
  await db.application.update({
    where: { id: applicationId },
    data: { status: status as ApplicationStatus },
  });

  await logAudit({
    actorId: user.id,
    action: "application.progress_reported",
    resourceType: "application",
    resourceId: applicationId,
    metadata: { status, note },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

export interface ProgressUpdateView {
  id: string;
  status: string;
  note: string | null;
  documentName: string | null;
  createdAt: Date;
}

export async function getApplicationProgressUpdates(
  applicationId: string,
): Promise<ProgressUpdateView[]> {
  const user = await requireUser();
  const application = await getOwnedApplication(applicationId, user);

  const updates = await db.applicationStatusHistory.findMany({
    where: {
      applicationId: application.id,
      actorUserId: user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  return updates.map((u) => ({
    id: u.id,
    status: u.toStatus,
    note: u.reason,
    documentName: null,
    createdAt: u.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Phase 6B — Application analytics
// ---------------------------------------------------------------------------

export interface ApplicationAnalyticsView {
  totalApplications: number;
  activeApplications: number;
  completedApplications: number;
  rejectedApplications: number;
  totalDocuments: number;
  recentActivity: Array<{
    id: string;
    reference: string;
    serviceName: string;
    status: string;
    updatedAt: Date;
  }>;
}

export async function getApplicationAnalytics(): Promise<ApplicationAnalyticsView> {
  const user = await requireUser();

  const [total, active, completed, rejected, documents, recent] = await Promise.all([
    db.application.count({ where: { userId: user.id } }),
    db.application.count({
      where: {
        userId: user.id,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED"] },
      },
    }),
    db.application.count({
      where: {
        userId: user.id,
        status: { in: ["APPROVED", "COMPLETED"] },
      },
    }),
    db.application.count({
      where: { userId: user.id, status: "REJECTED" },
    }),
    db.applicationDocument.count({
      where: { application: { userId: user.id } },
    }),
    db.application.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        reference: true,
        status: true,
        updatedAt: true,
        service: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalApplications: total,
    activeApplications: active,
    completedApplications: completed,
    rejectedApplications: rejected,
    totalDocuments: documents,
    recentActivity: recent.map((r) => ({
      id: r.id,
      reference: r.reference,
      serviceName: r.service.name,
      status: r.status,
      updatedAt: r.updatedAt,
    })),
  };
}
