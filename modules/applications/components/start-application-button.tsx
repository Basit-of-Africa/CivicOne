"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startApplicationAction } from "@/modules/applications/actions";

export function StartApplicationButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    start(async () => {
      const result = await startApplicationAction(serviceId);
      if (result.ok && result.data) {
        router.push(`/applications/${result.data.reference}`);
      } else {
        setError(result.error?.message ?? "Could not start the application.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
        Start application
      </Button>
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
