import Link from "next/link";
import { ChevronRight, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApplicationCardView } from "@/modules/applications/service";
import { ApplicationStatusBadge } from "./application-status-badge";

export function ApplicationCard({ application }: { application: ApplicationCardView }) {
  return (
    <Card className="transition-colors hover:border-foreground/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {application.reference}
            </p>
            <h3 className="text-base font-semibold text-foreground">
              <Link href={`/applications/${application.reference}`} className="hover:underline">
                {application.serviceName}
              </Link>
            </h3>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Landmark className="size-3" aria-hidden="true" />
            {application.providerAbbreviation ?? application.providerName}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated {application.updatedAt.toLocaleDateString()}
          </span>
        </div>

        <Link
          href={`/applications/${application.reference}`}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {application.nextAction}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
