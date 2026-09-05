"use client";

import * as React from "react";
import { CheckCircle2, ExternalLink, Landmark, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateCacCompanyAction } from "@/modules/applications/actions";

export function CacTinLookup({
  rcNumber,
  entityType,
}: {
  rcNumber: string;
  entityType?: string;
}) {
  const [tin, setTin] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [lookedUp, setLookedUp] = React.useState(false);

  async function lookup() {
    setPending(true);
    setError(null);
    setTin(null);
    setStatus(null);
    setLookedUp(true);
    const response = await validateCacCompanyAction({
      rcNumber,
      entityType: (entityType ?? "COMPANY") as "COMPANY",
    });
    if (!response.ok) {
      setError(response.error?.message ?? "Could not retrieve company details from CAC.");
    } else if (response.data) {
      setTin(response.data.tin ?? null);
      setStatus(response.data.status ?? null);
    }
    setPending(false);
  }

  if (!rcNumber) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="size-4 text-secondary" aria-hidden="true" />
          CAC company data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Look up the registered entity for this application using CAC.
          </p>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void lookup()}>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Search className="size-3.5" aria-hidden="true" />}
            Look up
          </Button>
        </div>

        {lookedUp && !pending && tin && (
          <div className="flex items-center gap-2 rounded-md border border-secondary/20 bg-secondary/5 px-3 py-2">
            <CheckCircle2 className="size-4 text-secondary" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              TIN: <span className="font-semibold">{tin}</span>
            </p>
          </div>
        )}

        {lookedUp && !pending && !tin && !error && status && (
          <p className="text-sm text-muted-foreground">
            Entity found with status <span className="font-medium text-foreground">{status}</span>, but no TIN is on file yet.
          </p>
        )}

        {lookedUp && !pending && !tin && !error && !status && (
          <p className="text-sm text-muted-foreground">
            No CAC data found for this RC number.
          </p>
        )}

        {error && !pending && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        <div className="border-t border-border pt-3">
          <a
            href="https://pre.cac.gov.ng"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open CAC portal
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
