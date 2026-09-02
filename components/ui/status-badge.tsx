import { Badge } from "@/components/ui/badge";
import { FORMATTED_STATUS } from "@/lib/constants";

const TONE_BY_STATUS: Record<string, "neutral" | "success" | "warning" | "error" | "info" | "primary" | "secondary" | "accent"> = {
  UNVERIFIED: "neutral",
  VERIFIED: "success",
  SUSPENDED: "error",
  LOCKED: "warning",
  CLOSED: "neutral",
  PENDING: "warning",
  REJECTED: "error",
  VERIFICATION_PENDING: "warning",
  VERIFICATION_FAILED: "error",
  REQUIRES_MANUAL_REVIEW: "warning",
  DRAFT: "neutral",
  READY: "info",
  PAYMENT_PENDING: "warning",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  ACTION_REQUIRED: "warning",
  APPROVED: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
  ACTIVE: "success",
  ARCHIVED: "neutral",
  EXPIRED: "warning",
};

export interface StatusBadgeProps {
  status: string;
  label?: string;
}

/**
 * Badge that renders an application/user/verification status with a
 * consistent tone. Pass a `label` to override the default human label.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const tone = TONE_BY_STATUS[status] ?? "neutral";
  return (
    <Badge variant={tone} dot>
      {label ?? FORMATTED_STATUS[status] ?? status}
    </Badge>
  );
}
