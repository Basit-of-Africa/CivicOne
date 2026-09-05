"use client";

import * as React from "react";
import { CheckCircle2, Info, Loader2, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkCacNameAction } from "@/modules/applications/actions";
import type { CacSearchResult } from "@/server/cac-vas";

export function CacNameCheck({
  companyName,
}: {
  companyName: string;
}) {
  const [results, setResults] = React.useState<CacSearchResult[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  async function check() {
    setPending(true);
    setError(null);
    setResults(null);
    setSearched(true);
    const response = await checkCacNameAction(companyName);
    if (!response.ok) {
      setError(response.error?.message ?? "Name check failed.");
    } else {
      setResults(response.data ?? []);
    }
    setPending(false);
  }

  if (!companyName || companyName.trim().length < 2) return null;

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Check if this name is already registered</p>
        <Button type="button" variant="outline" size="sm" disabled={pending || companyName.trim().length < 2} onClick={() => void check()}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Search className="size-3.5" aria-hidden="true" />}
          Check name
        </Button>
      </div>

      {results !== null && (
        <div className="mt-3 space-y-2">
          {results.length === 0 ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-secondary">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              No exact match found on CAC — this name may be available.
            </p>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
                <Info className="size-3.5" aria-hidden="true" />
                {results.length} similar {results.length === 1 ? "entity" : "entities"} found on CAC:
              </p>
              <ul className="space-y-1">
                {results.slice(0, 5).map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <XCircle className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate font-medium text-foreground">{item.entityName}</span>
                    <span>{item.rcNumber ?? ""}</span>
                    {item.status ? <span className="text-muted-foreground">· {item.status}</span> : null}
                  </li>
                ))}
              </ul>
              {results.length > 5 && (
                <p className="text-xs text-muted-foreground">…and {results.length - 5} more results.</p>
              )}
            </>
          )}
        </div>
      )}

      {error && !pending && (
        <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
