import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { RegisterForm } from "@/modules/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a CivicOne Nigeria account with your email address or phone number.",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your CivicOne account"
      description="One secure account for your identity, public services and records."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
