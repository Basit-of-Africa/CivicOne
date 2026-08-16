"use client";

import * as React from "react";
import { Loader2, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { resendEmailVerificationAction } from "@/modules/auth/actions";

/**
 * Banner shown when the signed-in account has an unverified email address.
 */
export function EmailVerificationBanner({
  email,
}: {
  email: string;
}) {
  const [sending, setSending] = React.useState(false);

  async function handleResend() {
    setSending(true);
    try {
      const result = await resendEmailVerificationAction();
      if (!result.ok) {
        toast.error(result.error?.message ?? "Unable to send the verification email.");
        return;
      }
      toast.success("Verification email sent. Check your inbox.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Verify your email address
          </p>
          <p className="text-sm text-muted-foreground">
            Confirm <span className="font-medium text-foreground">{email}</span> to
            secure account recovery.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={sending}
        className="shrink-0"
      >
        {sending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          "Resend email"
        )}
      </Button>
    </div>
  );
}
