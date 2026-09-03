import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  ExternalLink,
  Fingerprint,
  Landmark,
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
          {/* Phase 6B: Companion button */}
          <Button variant="outline" asChild>
            <Link href={`/services/${service.slug}/companion`}>
              <BookOpen aria-hidden="true" />
              Companion
            </Link>
          </Button>
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

      {/* Phase 6A: Requirements → Personalized Checklist */}
      {service.requirements.length > 0 ? (
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

      {/* Phase 6A: Steps → Enhanced Guide */}
      {service.steps.length > 0 ? (
        <ServiceGuide
          serviceName={service.name}
          providerName={service.providerName}
          steps={service.steps}
        />
      ) : null}

      {/* Phase 6A: Fees → Fee Calculator */}
      {service.fees.length > 0 ? (
        <FeeCalculator
          serviceName={service.name}
          fees={service.fees.map((fee) => ({
            name: fee.name,
            amount: fee.amount,
            currency: fee.currency,
            frequency: fee.frequency,
            note: fee.note,
          }))}
        />
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

      {/* Phase 6A: Office Locator */}
      {offices && offices.length > 0 ? (
        <OfficeLocator
          providerName={service.providerName}
          offices={offices}
        />
      ) : null}

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
