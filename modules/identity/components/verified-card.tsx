import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export interface VerifiedCardProps {
  maskedNin: string | null;
  legalName: string | null;
  verifiedAt: Date | null;
}

export function VerifiedCard({ maskedNin, legalName, verifiedAt }: VerifiedCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-secondary/10 px-5 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <BadgeCheck className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Identity verified</h2>
            <p className="text-sm text-muted-foreground">
              Your identity is connected to your CivicOne account.
            </p>
          </div>
        </div>
      </div>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </dt>
            <dd className="mt-1">
              <StatusBadge status="VERIFIED" />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Legal name
            </dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {legalName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              NIN
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-foreground">
              {maskedNin ?? "********"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Verified on
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {verifiedAt
                ? verifiedAt.toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/profile/identity">View identity details</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
