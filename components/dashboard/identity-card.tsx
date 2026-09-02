import Link from "next/link";
import { ArrowRight, BadgeCheck, Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { IdentityStatusView } from "@/modules/identity/service";

/**
 * Identity verification status card shown on the dashboard.
 * Presentational: receives the real identity state from the page.
 */
export function IdentityCard({ status }: { status: IdentityStatusView }) {
  const verified = status.status === "VERIFIED";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={
              verified
                ? "flex size-10 items-center justify-center rounded-md bg-secondary/10 text-secondary"
                : "flex size-10 items-center justify-center rounded-md bg-primary/5 text-primary"
            }
          >
            {verified ? (
              <BadgeCheck className="size-5" aria-hidden="true" />
            ) : (
              <Fingerprint className="size-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {verified ? "Identity verified" : "Verify your identity"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {verified
                ? `Your identity is connected to your CivicOne account${status.maskedNin ? ` (${status.maskedNin})` : ""}.`
                : "Confirm who you are to access more services."}
            </p>
          </div>
        </div>
        <StatusBadge status={status.status} />
      </div>
      <CardContent className="space-y-4 p-5 pt-0">
        <p className="text-sm text-muted-foreground">
          {verified
            ? "Your verified identity is reused across eligible services with your consent."
            : status.status === "VERIFICATION_FAILED"
              ? "Your last verification attempt did not match an identity. You can try again."
              : status.status === "REQUIRES_MANUAL_REVIEW"
                ? "Your verification is awaiting manual review."
                : status.status === "SUSPENDED"
                  ? "Your identity has been suspended. Please contact support."
                  : "Verifying your identity unlocks services that require a confirmed identity."}
        </p>
        {status.status === "SUSPENDED" ? null : (
          <Button asChild variant={verified ? "outline" : "default"} className="w-full sm:w-auto">
            <Link href={verified ? "/profile/identity" : "/identity/verify"}>
              {verified ? (
                "View identity"
              ) : (
                <>
                  Verify my identity
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
