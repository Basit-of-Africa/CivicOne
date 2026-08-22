import Link from "next/link";
import { ArrowRight, Clock, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ServiceCardView } from "@/modules/services/service";
import { SaveServiceButton } from "./save-service-button";

export const MODE_LABELS: Record<string, string> = {
  GUIDANCE: "Guidance",
  EXTERNAL: "External",
  INTEGRATED: "Integrated",
};

export function ServiceCard({
  service,
  saved,
}: {
  service: ServiceCardView;
  saved: boolean;
}) {
  return (
    <Card className="transition-colors hover:border-foreground/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {service.categoryName}
            </p>
            <h3 className="text-base font-semibold text-foreground">
              <Link href={`/services/${service.slug}`} className="hover:underline">
                {service.name}
              </Link>
            </h3>
          </div>
          <SaveServiceButton serviceId={service.id} saved={saved} />
        </div>

        <p className="text-sm text-muted-foreground">{service.summary}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Landmark className="size-3" aria-hidden="true" />
            {service.providerAbbreviation ?? service.providerName}
          </Badge>
          <Badge variant="neutral">{MODE_LABELS[service.mode] ?? service.mode}</Badge>
          <Badge variant="neutral">
            <Clock className="size-3" aria-hidden="true" />
            {service.estimatedTime ?? "Varies"}
          </Badge>
          <span className={cn("text-xs font-medium", service.jurisdictionLevel === "FEDERAL" ? "text-foreground" : "text-muted-foreground")}>
            {service.jurisdictionName}
          </span>
        </div>

        <Link
          href={`/services/${service.slug}`}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View service
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
