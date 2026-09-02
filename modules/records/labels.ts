import type { RecordSource, RecordStatus, RecordVerificationStatus } from "@prisma/client";

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export const RECORD_VERIFICATION_LABELS: Record<RecordVerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  USER_ASSERTED: "User asserted",
  PENDING: "Pending verification",
  VERIFIED: "Verified",
  GOVERNMENT_VERIFIED: "Government verified",
  EXPIRED: "Verification expired",
  REJECTED: "Verification rejected",
};

export const RECORD_SOURCE_LABELS: Record<RecordSource, string> = {
  CIVICONE: "Created by CivicOne",
  USER_PROVIDED: "Provided by you",
  GOVERNMENT_API: "Government API",
  EXTERNAL_PROVIDER: "External provider",
  ADMIN_VERIFIED: "Verified by administrator",
};
