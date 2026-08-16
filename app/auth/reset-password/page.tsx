import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your CivicOne Nigeria account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard title="Invalid reset link" description="No reset token was found in this link.">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            Request a new password reset link to continue.
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Enter a new password for your CivicOne account."
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
