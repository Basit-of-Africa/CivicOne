import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, FileText, History, Landmark, Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getApplicationByReference } from "@/modules/applications/service";
import { ApplicationStatusBadge } from "@/modules/applications/components/application-status-badge";
import { ApplicationStepper } from "@/modules/applications/components/application-stepper";
import { StepPanel } from "@/modules/applications/components/step-panel";
import { ApplicationTimeline } from "@/modules/applications/components/application-timeline";
import { SimulateProviderButton } from "@/modules/applications/components/simulate-provider-button";
import { toVerifiedIdentity } from "@/modules/applications/identity";
import { getFormDefinitionMap } from "@/modules/applications/forms";

export const metadata: Metadata = {
  title: "Application",
};

const TRACKING_STATUSES = new Set([
  "SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED", "APPROVED", "REJECTED", "COMPLETED",
]);

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const application = await getApplicationByReference(reference);

  const formDefinitions = await getFormDefinitionMap();
  const identity = toVerifiedIdentity(application.identity);
  const currentStep = application.steps.find((s) => s.id === application.currentStepId) ?? null;
  const isTracking = TRACKING_STATUSES.has(application.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={application.reference}
        breadcrumbs={[
          { label: "Applications", href: "/applications" },
          { label: application.reference },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/applications">
              <ArrowLeft aria-hidden="true" />
              All applications
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">{application.serviceName}</h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Landmark className="size-4" aria-hidden="true" />
                {application.providerName}
              </p>
            </div>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              Last updated {application.updatedAt.toLocaleString()}
            </span>
            <span>{application.jurisdictionName}</span>
          </div>
          <p className="text-sm text-muted-foreground">{application.serviceSummary}</p>
          {isTracking ? (
            <div className="border-t border-border pt-4">
              <SimulateProviderButton applicationId={application.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationStepper steps={application.steps} currentStepId={application.currentStepId} />
        </CardContent>
      </Card>

      {currentStep && !isTracking ? (
        <StepPanel
          application={application}
          step={currentStep}
          identity={identity}
          documents={application.documents}
          formDefinitions={formDefinitions}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>Your application is with the provider (demo).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Provider reference: <span className="font-semibold text-foreground">{application.providerRef ?? "—"}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-secondary" aria-hidden="true" />
              Documents
            </CardTitle>
            <CardDescription>Files attached to this application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {application.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents attached yet.</p>
            ) : (
              application.documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{document.fileName}</p>
                    <p className="text-xs text-muted-foreground">{document.label}</p>
                  </div>
                  <a
                    href={`/applications/${reference}/documents/${document.id}`}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-4 text-secondary" aria-hidden="true" />
              Payments
            </CardTitle>
            <CardDescription>Payment is simulated in this demo.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Confirm the current fee with the official provider. Payment processing arrives in a later phase.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-secondary" aria-hidden="true" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationTimeline entries={application.timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
