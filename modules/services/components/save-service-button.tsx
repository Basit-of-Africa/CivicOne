"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { saveServiceAction, unsaveServiceAction } from "@/modules/services/actions";

export function SaveServiceButton({
  serviceId,
  saved,
}: {
  serviceId: string;
  saved: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(saved);

  async function toggle() {
    setPending(true);
    try {
      if (isSaved) {
        const result = await unsaveServiceAction(serviceId);
        if (result.ok) {
          setIsSaved(false);
          router.refresh();
        } else {
          toast.error(result.error?.message ?? "Unable to unsave this service.");
        }
      } else {
        const result = await saveServiceAction(serviceId);
        if (result.ok) {
          setIsSaved(true);
          toast.success("Service saved.");
          router.refresh();
        } else {
          toast.error(result.error?.message ?? "Unable to save this service.");
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={isSaved ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={toggle}
      aria-pressed={isSaved}
    >
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Bookmark aria-hidden="true" className={isSaved ? "fill-current" : undefined} />
      )}
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
