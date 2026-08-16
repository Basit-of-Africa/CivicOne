import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { ForgotPasswordForm } from "@/modules/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your CivicOne Nigeria account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email address you registered with and we'll send you a reset link."
      footer={
        <span>
          Remembered your password?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </span>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
