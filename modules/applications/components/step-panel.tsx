"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  confirmEligibilityAction,
  confirmPaymentAction,
  advanceStepAction,
} from "@/modules/applications/actions";
import { DynamicForm } from "./dynamic-form";
import { DocumentUpload, type DocumentItem } from "./document-upload";
import type {
  ApplicationDetailView,
  ApplicationDocumentView,
} from "@/modules/applications/service";
import type { WorkflowStepView } from "@/modules/applications/workflow-config";
import {
  buildIdentityPrefill,
  type FormDefinition,
  type VerifiedIdentity,
} from "@/modules/applications/form-config";

export function StepPanel({
  application,
  step,
  identity,
  documents,
  formDefinitions,
}: {
  application: ApplicationDetailView;
  step: WorkflowStepView;
  identity: VerifiedIdentity | null;
  documents: ApplicationDocumentView[];
  formDefinitions: Record<string, FormDefinition>;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  const docItems: DocumentItem[] = documents.map((d) => ({
    id: d.id,
    label: d.label,
    fileName: d.fileName,
    sizeBytes: d.sizeBytes,
  }));

  function refresh() {
    setPending(false);
    router.refresh();
  }

  async function run(action: () => Promise<{ ok: boolean; error?: { message?: string } }>) {
    setPending(true);
    setError(null);
    const result = await action();
    if (!result.ok) {
      setError(result.error?.message ?? "Something went wrong.");
      setPending(false);
      return;
    }
    refresh();
  }

  if (step.type === "ELIGIBILITY") {
    const config = (step.config ?? {}) as { confirmLabel?: string };
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            You must meet the eligibility criteria for {application.serviceName} before applying.
          </p>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
            <span>{config.confirmLabel ?? "I confirm I meet the eligibility requirements."}</span>
          </label>
          <div className="flex justify-end">
            <Button disabled={pending || !confirm} onClick={() => void run(() => confirmEligibilityAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
              Continue
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "FORM") {
    const config = (step.config ?? {}) as { formKey: string };
    const definition = formDefinitions[config.formKey];
    if (!definition) {
      return <p className="text-sm text-destructive">This form is not available.</p>;
    }
    const prefill = buildIdentityPrefill(definition.fields, identity);
    return (
      <DynamicForm
        applicationId={application.id}
        definition={definition}
        values={{ ...(application.answers[config.formKey] ?? {}), ...prefill }}
        identity={identity}
        documents={docItems}
        onSaved={() => void run(() => advanceStepAction(application.id))}
      />
    );
  }

  if (step.type === "DOCUMENTS") {
    const config = (step.config ?? {}) as { documents: Array<{ key: string; label: string; required?: boolean; accept?: string }> };
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>Attach the documents required for this service.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.documents.map((doc) => {
            const attached = (application.answers._documents?.[doc.key] as string | null | undefined) ?? null;
            return (
              <div key={doc.key} className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  {doc.label}
                  {doc.required ? <span className="ml-1 text-destructive">*</span> : null}
                </p>
                <DocumentUpload
                  applicationId={application.id}
                  formKey="_documents"
                  fieldKey={doc.key}
                  label={doc.label}
                  accept={doc.accept}
                  documents={docItems}
                  attached={attached}
                  onChanged={() => router.refresh()}
                />
              </div>
            );
          })}
          <div className="flex justify-end pt-2">
            <Button disabled={pending} onClick={() => void run(() => advanceStepAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              Continue
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "REVIEW") {
    const rows: Array<[string, unknown]> = [];
    for (const [formKey, values] of Object.entries(application.answers)) {
      if (formKey === "_documents") continue;
      for (const [key, value] of Object.entries(values)) {
        rows.push([`${formKey}.${key}`, value]);
      }
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>Check everything looks right before you submit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-2">
            {rows.map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-4 border-b border-border pb-2">
                <dt className="text-sm text-muted-foreground">{key}</dt>
                <dd className="text-sm font-medium text-foreground">
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : Array.isArray(value) ? value.join(", ") : String(value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end">
            <Button disabled={pending} onClick={() => void run(() => advanceStepAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              Continue
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "PAYMENT") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-secondary" aria-hidden="true" />
            {step.title}
          </CardTitle>
          <CardDescription>
            Payment is simulated in this demo. Confirm the current fee with the official provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
            <span>I confirm I have paid the applicable fee to the provider.</span>
          </label>
          <div className="flex justify-end">
            <Button disabled={pending || !confirm} onClick={() => void run(() => confirmPaymentAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Continue
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "SUBMISSION") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>Submit your application to the official provider (simulated).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            When you submit, {application.providerName} will issue a reference and begin processing (demo).
          </p>
          <div className="flex justify-end">
            <Button disabled={pending} onClick={() => void run(() => advanceStepAction(application.id))}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              Submit application
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "COMPLETION") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application submitted</CardTitle>
          <CardDescription>Your reference is tracked below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Reference: <span className="font-semibold text-foreground">{application.reference}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Provider reference: <span className="font-semibold text-foreground">{application.providerRef ?? "—"}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
