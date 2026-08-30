"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateProviderAction } from "@/modules/applications/actions";

export function SimulateProviderButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handle() {
    setPending(true);
    setError(null);
    const result = await simulateProviderAction(applicationId);
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Could not advance the application.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={handle} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
        Simulate provider update (demo)
      </Button>
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
