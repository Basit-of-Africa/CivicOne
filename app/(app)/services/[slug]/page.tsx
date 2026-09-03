import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { getServiceBySlug, getSavedServiceIds, getOfficeLocationsByAgency } from "@/modules/services/service";
import { hasActiveWorkflow } from "@/modules/applications/workflow";
import { ServiceDetail } from "@/modules/services/components/service-detail";

export const metadata: Metadata = {
  title: "Service",
};

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const savedIds = await getSavedServiceIds();
  const workflowAvailable = await hasActiveWorkflow(service.id);

  // Phase 6A: Fetch office locations for this service's provider
  const offices = await getOfficeLocationsByAgency(service.providerAbbreviation ?? service.providerName);

  return (
    <div className="space-y-6">
      <PageHeader
        title={service.name}
        breadcrumbs={[
          { label: "Find a Service", href: "/find-a-service" },
          { label: service.categoryName },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/find-a-service">
              <ArrowLeft aria-hidden="true" />
              Back to search
            </Link>
          </Button>
        }
      />
      <ServiceDetail
        service={service}
        saved={savedIds.has(service.id)}
        workflowAvailable={workflowAvailable}
        offices={offices}
      />
    </div>
  );
}
