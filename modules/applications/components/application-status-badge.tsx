import type { ApplicationStatus } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/modules/applications/status";

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <StatusBadge status={status} label={APPLICATION_STATUS_LABELS[status]} />;
}
