import Link from "next/link";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  FileText,
  Fingerprint,
  Landmark,
  ListChecks,
  ListOrdered,
  ScrollText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceDetailView } from "@/modules/services/service";
import type { OfficeLocationView } from "@/modules/services/service";
import { SaveServiceButton } from "./save-service-button";
import { ServiceFaq } from "./service-faq";
import { MODE_LABELS } from "./service-card";
import { StartApplicationButton } from "@/modules/applications/components/start-application-button";
import { TRUST_DISCLAIMER } from "@/lib/constants";
// Phase 6A — New components
import { ServiceChecklist } from "./service-checklist";
import { ServiceGuide } from "./service-guide";
import { OfficeLocator } from "./office-locator";
import { AgencyLinkButton } from "./agency-link-button";
import { FeeCalculator } from "./fee-calculator";

const DEMO_NOTE = "Demo information. Confirm current requirements with the official provider.";
const FEE_NOTE = "Verify current fee with official provider.";

export function ServiceDetail({
  service,
  saved,
  workflowAvailable,
  offices,
}: {
  service: ServiceDetailView;
  saved: boolean;
  workflowAvailable: boolean;
  offices?: OfficeLocationView[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{service.categoryName}</Badge>
            <Badge variant="neutral">{MODE_LABELS[service.mode] ?? service.mode}</Badge>
            <Badge variant="neutral">{service.jurisdictionName}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{service.name}</h1>
          <p className="max-w-2xl text-muted-foreground">{service.summary}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {workflowAvailable ? (
            <StartApplicationButton serviceId={service.id} />
          ) : null}
          <SaveServiceButton serviceId={service.id} saved={saved} />
          {/* Phase 6A: Agency link button (replaces plain "Go to official site") */}
          {service.mode === "EXTERNAL" && (service.agencyUrl || service.officialUrl) ? (
            <AgencyLinkButton
              serviceId={service.id}
              agencyUrl={service.agencyUrl || service.officialUrl!}
              agencyLabel={service.agencyLabel}
            />
          ) : null}
          {service.mode === "INTEGRATED" ? (
            <Button disabled>
              Start application
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      {service.mode === "GUIDANCE" ? (
        <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/40 px-4 py-3">
          <ScrollText className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            CivicOne explains this process for you. Use the steps below as a guide and confirm
            details with the official provider before acting.
          </p>
        </div>
      ) : null}

      {service.isDemo ? (
        <p className="rounded-md border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-muted-foreground">
          Demo information. This service is a demo entry — confirm current requirements with
          the official provider.
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary">
              <Landmark className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{service.providerName}</h2>
              {service.providerAbbreviation ? (
                <p className="text-sm text-muted-foreground">{service.providerAbbreviation}</p>
              ) : null}
            </div>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{service.description}</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated time</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                {service.estimatedTime ?? "Varies"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jurisdiction</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{service.jurisdictionName}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {service.eligibility ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who can apply</CardTitle>
            <CardDescription>Eligibility and basic requirements.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{service.eligibility}</p>
          </CardContent>
        </Card>
      ) : null}

      {service.requirements.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-secondary" aria-hidden="true" />
              Requirements & documents
            </CardTitle>
            <CardDescription>What you will typically need to provide.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {service.requirements.map((req, index) => (
                <div key={index} className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {req.title}
                      {req.isDocument ? (
                        <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Document
                        </span>
                      ) : null}
                    </p>
                    {req.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{req.description}</p>
                    ) : null}
                    {!req.isVerified ? (
                      <p className="mt-1 text-xs font-medium text-warning">{DEMO_NOTE}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {service.steps.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListOrdered className="size-4 text-secondary" aria-hidden="true" />
              Steps
            </CardTitle>
            <CardDescription>How the process typically works.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {service.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    {step.description ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {service.fees.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fees</CardTitle>
            <CardDescription>Fees are not fixed here — always confirm with the provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {service.fees.map((fee, index) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{fee.name}</p>
                  {fee.frequency ? (
                    <p className="text-xs text-muted-foreground">{fee.frequency}</p>
                  ) : null}
                </div>
                <p className="text-xs font-medium text-warning">{FEE_NOTE}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="size-4 text-secondary" aria-hidden="true" />
            Official source
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
              {service.officialUrl}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Check the official provider for the authoritative source.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">{TRUST_DISCLAIMER}</p>
        </CardContent>
      </Card>

      {service.faqs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Frequently asked questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceFaq faqs={service.faqs} />
          </CardContent>
        </Card>
      ) : null}

      {service.related.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Related services</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {service.related.map((related) => (
              <Link
                key={related.id}
                href={`/services/${related.slug}`}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/25"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                  {related.categoryName}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground group-hover:underline">
                  {related.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{related.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
