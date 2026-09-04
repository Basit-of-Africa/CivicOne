import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/modules/auth/components/login-form";
import { LoginShell } from "@/modules/auth/components/login-shell";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your CivicOne Nigeria account to access your identity, services and records.",
};

export default function LoginPage() {
  return (
    <LoginShell>
      <LoginForm showSignup={false} />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </LoginShell>
  );
}
