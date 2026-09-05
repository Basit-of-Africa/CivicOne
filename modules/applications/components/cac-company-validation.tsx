"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateCacCompanyAction } from "@/modules/applications/actions";
import type { CacCompany } from "@/server/cac-vas";

export function CacCompanyValidation({
  initialValue,
  onValidated,
}: {
  initialValue?: string;
  onValidated: (company: CacCompany) => void;
}) {
  const [rcNumber, setRcNumber] = React.useState(initialValue ?? "");
  const [result, setResult] = React.useState<CacCompany | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function validate() {
    setPending(true);
    setError(null);
    setResult(null);
    const response = await validateCacCompanyAction({ rcNumber });
    if (!response.ok) {
      setError(response.error?.message ?? "CAC validation failed.");
    } else if (response.data) {
      setResult(response.data);
      onValidated(response.data);
    }
    setPending(false);
  }

  return (
    <div className="rounded-md border border-secondary/20 bg-secondary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 space-y-1.5">
          <span className="text-sm font-medium text-foreground">Validate an existing CAC registration</span>
          <Input value={rcNumber} onChange={(event) => setRcNumber(event.target.value)} placeholder="RC123456" aria-label="Existing CAC RC number" />
        </label>
        <Button type="button" variant="secondary" disabled={pending || rcNumber.trim().length === 0} onClick={() => void validate()}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
          Validate with CAC
        </Button>
      </div>
      {result ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-secondary">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {result.entityName ?? "Entity found"} {result.status ? `· ${result.status}` : ""}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm font-medium text-destructive" role="alert">{error}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">Only a company identifier is sent to CAC. CivicOne does not store the API key in your browser.</p>
    </div>
  );
}