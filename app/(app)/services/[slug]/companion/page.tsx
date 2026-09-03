import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServiceBySlug } from "@/modules/services/service";
import { getOfficeLocationsByAgency } from "@/modules/services/service";
import { getTemplateBySlug } from "@/modules/applications/templates";
import { ServiceChecklist } from "@/modules/services/components/service-checklist";
import { ServiceGuide } from "@/modules/services/components/service-guide";
import { OfficeLocator } from "@/modules/services/components/office-locator";
import { StartApplicationButton } from "@/modules/applications/components/start-application-button";

export const metadata: Metadata = {
  title: "Application Companion",
};

export default async function CompanionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const template = getTemplateBySlug(slug);
  const offices = await getOfficeLocationsByAgency(
    service.providerAbbreviation ?? service.providerName,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${service.name} Companion`}
        breadcrumbs={[
          { label: "Services", href: "/find-a-service" },
          { label: service.name, href: `/services/${service.slug}` },
          { label: "Companion" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/services/${service.slug}`}>
              <ArrowLeft aria-hidden="true" />
              Back to service
            </Link>
          </Button>
        }
      />

      {/* Companion header */}
      <Card>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">
              Application Companion
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this guide as you complete your {service.name} application.
              Follow the checklist, review the steps, and submit when ready.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{service.providerName}</Badge>
              <Badge variant="neutral">{service.estimatedTime ?? "Varies"}</Badge>
              {template ? (
                <Badge variant="neutral">{template.estimatedCost}</Badge>
              ) : null}
            </div>
          </div>
          <StartApplicationButton serviceId={service.id} />
        </CardContent>
      </Card>

      {/* Two-column layout: Guide + Actions */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column: Guide content (3/5 width) */}
        <div className="space-y-6 lg:col-span-3">
          {/* Checklist */}
          {template ? (
            <ServiceChecklist
              serviceId={service.id}
              serviceName={service.name}
              requirements={template.checklist.map((item, index) => ({
                id: `tpl-${index}`,
                title: item.title,
                description: item.description,
                isDocument: true,
                isVerified: false,
                howToObtain: item.howToObtain,
              }))}
            />
          ) : service.requirements.length > 0 ? (
            <ServiceChecklist
              serviceId={service.id}
              serviceName={service.name}
              requirements={service.requirements.map((req, index) => ({
                id: `req-${index}`,
                title: req.title,
                description: req.description,
                isDocument: req.isDocument,
                isVerified: req.isVerified,
              }))}
            />
          ) : null}

          {/* Step-by-step guide */}
          {template ? (
            <ServiceGuide
              serviceName={service.name}
              providerName={service.providerName}
              steps={template.steps}
            />
          ) : service.steps.length > 0 ? (
            <ServiceGuide
              serviceName={service.name}
              providerName={service.providerName}
              steps={service.steps}
            />
          ) : null}
        </div>

        {/* Right column: Quick actions + Tips (2/5 width) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick tips */}
          {template && template.tips.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {template.tips.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Common mistakes */}
          {template && template.commonMistakes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Common Mistakes to Avoid</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {template.commonMistakes.map((mistake, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                      {mistake}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Official source */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-secondary" aria-hidden="true" />
                Official Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              {service.officialUrl ? (
                <a
                  href={service.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {service.providerName} Portal →
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Visit the {service.providerName} website for the official application portal.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Office locator */}
          {offices.length > 0 ? (
            <OfficeLocator
              providerName={service.providerName}
              offices={offices}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
