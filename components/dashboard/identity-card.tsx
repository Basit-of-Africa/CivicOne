import Link from "next/link";
import { ArrowRight, Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

/**
 * Identity verification status card shown on the dashboard.
 * Leads to the Phase 2 identity-verification placeholder route.
 */
export function IdentityCard() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/5 text-primary">
            <Fingerprint className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Identity verification
            </h2>
            <p className="text-sm text-muted-foreground">
              Confirm who you are to access more services.
            </p>
          </div>
        </div>
        <StatusBadge status="UNVERIFIED" label="Not yet verified" />
      </div>
      <CardContent className="p-5 pt-0">
        <p className="text-sm text-muted-foreground">
          Verifying your identity unlocks services that require a confirmed
          identity. No NIN is collected today — identity verification arrives
          in a later phase.
        </p>
        <Button asChild className="mt-4 w-full sm:w-auto">
          <Link href="/identity/verify">
            Verify my identity
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
