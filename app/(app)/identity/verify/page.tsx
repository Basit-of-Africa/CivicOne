import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { getIdentityStatus } from "@/modules/identity/service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { IdentityVerificationForm } from "@/modules/identity/components/identity-verification-form";
import { PrivacyExplainer } from "@/modules/identity/components/privacy-explainer";
import { VerifiedCard } from "@/modules/identity/components/verified-card";

export const metadata: Metadata = {
  title: "Verify your identity",
};

export default async function IdentityVerifyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const status = await getIdentityStatus();

  if (status.status === "VERIFIED") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Verify your identity"
          description="Your verified identity is active on your account."
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
        <VerifiedCard
          maskedNin={status.maskedNin}
          legalName={status.legalName}
          verifiedAt={status.verifiedAt}
        />
        <PrivacyExplainer />
      </div>
    );
  }

  if (status.status === "SUSPENDED" || status.status === "REQUIRES_MANUAL_REVIEW") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Verify your identity"
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
        <Card>
          <CardContent className="space-y-3 p-5 sm:p-6">
            <StatusBadge status={status.status} />
            <p className="text-sm text-muted-foreground">
              {status.status === "SUSPENDED"
                ? "Your identity has been suspended. Please contact support for assistance."
                : "Your identity verification is under manual review. We will update your status as soon as it is reviewed."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <h2 className="text-lg font-semibold">Verify your Nigerian identity</h2>
              <p className="text-sm text-primary-foreground/80">
                Your NIN helps us establish your identity and connect your CivicOne
                account to services you use.
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <IdentityVerificationForm />
        </CardContent>
      </Card>

      <PrivacyExplainer />
    </div>
  );
}
