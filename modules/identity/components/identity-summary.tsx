import Link from "next/link";
import { ArrowRight, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { IdentityView } from "@/modules/identity/service";

const ATTEMPT_LABELS: Record<string, string> = {
  SUCCESS: "Successful",
  FAILED: "Failed",
  REQUIRES_REVIEW: "Review required",
  UNAVAILABLE: "Service unavailable",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

export function IdentitySummary({ view }: { view: IdentityView }) {
  const verified = view.status === "VERIFIED";

  if (!verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Identity verification</CardTitle>
          <CardDescription>
            Confirm your identity to unlock services that require a verified identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={view.status} />
            <span className="text-sm text-muted-foreground">
              {view.status === "VERIFICATION_FAILED"
                ? "Your last verification attempt did not match an identity."
                : view.status === "REQUIRES_MANUAL_REVIEW"
                  ? "Your verification is awaiting manual review."
                  : view.status === "SUSPENDED"
                    ? "Your identity has been suspended."
                    : "Your identity is not yet verified."}
            </span>
          </div>
          {view.status === "SUSPENDED" ? null : (
            <Button asChild>
              <Link href="/identity/verify">
                {view.status === "VERIFICATION_FAILED" ? "Try again" : "Verify my identity"}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Identity verification</CardTitle>
            <CardDescription>
              Information confirmed against a trusted identity source.
            </CardDescription>
          </div>
          <StatusBadge status="VERIFIED" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full legal name" value={view.identity.legalName} />
          <Field
            label="Date of birth"
            value={view.identity.dateOfBirth ? formatDate(view.identity.dateOfBirth) : null}
          />
          <Field label="Gender" value={view.identity.gender ?? null} />
          <Field label="Nationality" value={view.identity.nationality} />
          <Field label="State of origin" value={view.identity.stateOfOrigin} />
          <Field label="LGA" value={view.identity.lga} />
          <Field label="NIN (masked)" value={view.maskedNin ? <span className="font-mono">{view.maskedNin}</span> : null} />
        </dl>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">Verification history</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <Field label="Identity status" value={view.status} />
            <Field
              label="Verification date"
              value={view.verifiedAt ? formatDate(view.verifiedAt) : null}
            />
            <Field label="Verification provider" value={view.providerName} />
            <Field
              label="Last verification attempt"
              value={
                view.lastAttempt
                  ? `${ATTEMPT_LABELS[view.lastAttempt.result] ?? view.lastAttempt.result} · ${formatDate(view.lastAttempt.createdAt)}`
                  : null
              }
            />
          </dl>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/40 px-4 py-3">
          <Fingerprint className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Government-verified identity fields cannot be edited directly. To correct
            them, contact support.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
