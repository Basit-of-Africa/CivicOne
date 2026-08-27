import type { ApplicationStatus } from "@prisma/client";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready to submit",
  PAYMENT_PENDING: "Payment pending",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ACTION_REQUIRED: "Action required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const APPLICATION_STATUS_TONES: Record<
  ApplicationStatus,
  "neutral" | "info" | "warning" | "success" | "error" | "secondary"
> = {
  DRAFT: "neutral",
  READY: "info",
  PAYMENT_PENDING: "warning",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  ACTION_REQUIRED: "warning",
  APPROVED: "success",
  REJECTED: "error",
  COMPLETED: "success",
  CANCELLED: "neutral",
};
