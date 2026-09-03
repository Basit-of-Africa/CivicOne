"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { markAllNotificationsAsReadAction } from "@/modules/notifications/actions";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleMarkAll() {
    setPending(true);
    try {
      const result = await markAllNotificationsAsReadAction();
      if (result.ok) {
        toast.success("All notifications marked as read.");
        router.refresh();
      } else {
        toast.error(result.error?.message ?? "Unable to mark notifications.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleMarkAll}>
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <CheckCheck className="size-4" aria-hidden="true" />
      )}
      Mark all read
    </Button>
  );
}
