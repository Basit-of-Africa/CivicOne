import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, MailCheck, MailX } from "lucide-react";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/modules/auth/service";
import { isAppError } from "@/server/errors";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address on your CivicOne Nigeria account.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <ResultCard
        icon={<AlertTriangle className="size-6" aria-hidden="true" />}
        tone="warning"
        title="Invalid verification link"
        description="No verification token was found in this link."
      />
    );
  }

  try {
    await verifyEmail(token);
  } catch (error) {
    const message = isAppError(error)
      ? error.message
      : "Unable to verify your email address.";
    return (
      <ResultCard
        icon={<MailX className="size-6" aria-hidden="true" />}
        tone="error"
        title="We couldn't verify that link"
        description={message}
      />
    );
  }

  return (
    <ResultCard
      icon={<MailCheck className="size-6" aria-hidden="true" />}
      tone="success"
      title="Email verified"
      description="Your email address has been confirmed. You can now use it to recover your account."
      cta={{ href: "/dashboard", label: "Go to dashboard" }}
    />
  );
}

function ResultCard({
  icon,
  tone,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  tone: "success" | "warning" | "error";
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  const tones = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-destructive/10 text-destructive",
  };
  return (
    <AuthCard title={title}>
      <div className="space-y-4 text-center">
        <div
          className={`mx-auto flex size-12 items-center justify-center rounded-full ${tones[tone]}`}
        >
          {icon}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {cta ? (
          <Button asChild className="w-full">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
        )}
      </div>
    </AuthCard>
  );
}
