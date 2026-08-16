import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Fingerprint,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Verify your identity",
};

const STEPS = [
  {
    title: "Confirm your details",
    description: "Review the personal information tied to your CivicOne account.",
  },
  {
    title: "Verify against a trusted source",
    description:
      "Identity verification connects to trusted Nigerian identity sources in Phase 2.",
  },
  {
    title: "Reuse your verified identity",
    description:
      "Once verified, your status is reused across eligible services — with your consent.",
  },
];

export default function IdentityVerifyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify your identity"
        description="Confirm who you are to unlock services that require a verified identity."
        breadcrumbs={[{ label: "Identity verification" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-primary px-5 py-6 text-primary-foreground sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Fingerprint className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Coming in Phase 2</h2>
              <p className="text-sm text-primary-foreground/80">
                Identity verification isn&apos;t available yet — and no NIN is
                collected today.
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              What identity verification will cover
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When it ships, verification will confirm your identity against
              trusted sources so eligible public services trust the result.
            </p>
          </div>

          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/5 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {step.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-md border border-border bg-card px-4 py-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Verification is optional and always initiated by you.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-md border border-border bg-card px-4 py-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Your identity data is stored securely and never sold.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                This section is reserved for the Phase 2 verification flow. You
                can keep using CivicOne in the meantime.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
