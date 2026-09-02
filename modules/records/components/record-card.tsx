import Link from "next/link";
import { ChevronRight, Landmark, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecordCardView } from "@/modules/records/service";
import { RECORD_STATUS_LABELS } from "@/modules/records/labels";

export function RecordCard({ record }: { record: RecordCardView }) {
  return (
    <Card className="transition-colors hover:border-foreground/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">{record.recordType}</p>
            <h3 className="text-base font-semibold text-foreground">{record.serviceName}</h3>
          </div>
          <StatusBadge status={record.status} label={RECORD_STATUS_LABELS[record.status]} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Landmark className="size-3" aria-hidden="true" />
            {record.providerAbbreviation ?? record.providerName}
          </Badge>
          {record.externalReference ? (
            <span className="text-xs text-muted-foreground">{record.externalReference}</span>
          ) : null}
        </div>
        {record.expiryDate ? (
          <p className="text-xs text-muted-foreground">Expires {record.expiryDate.toLocaleDateString()}</p>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-medium text-secondary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {record.verificationStatus === "GOVERNMENT_VERIFIED" ? "Government verified" : record.verificationStatus}
          </span>
          <Link href={`/records/${record.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View record <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
