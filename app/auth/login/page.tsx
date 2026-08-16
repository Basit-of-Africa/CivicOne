import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your CivicOne Nigeria account to access your identity, services and records.",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue to your CivicOne account."
      footer={
        <span>
          New to CivicOne?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </span>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
