import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, Mail } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Help",
};

const FAQS = [
  {
    q: "Is CivicOne a government agency?",
    a: "No. CivicOne is an independent technology platform. It is not a government agency and never acts on behalf of any ministry, department or agency.",
  },
  {
    q: "Do I need a NIN to create an account?",
    a: "No. You can create an account with just an email address or phone number. Identity verification — which may involve a NIN — is optional and arrives in a later phase.",
  },
  {
    q: "Can I sign up with my phone number?",
    a: "Yes. You can register with an email address or a phone number, and sign in with whichever you registered.",
  },
  {
    q: "Is my data shared with any agency?",
    a: "Not without your explicit consent. CivicOne never shares your information unless you ask us to.",
  },
  {
    q: "I forgot my password. What do I do?",
    a: "Use the \u201cForgot password?\u201d link on the sign-in page. We'll email you a secure, single-use reset link.",
  },
  {
    q: "My verification email didn't arrive.",
    a: "Check your spam folder first. From the dashboard, you can resend the verification email.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Help"
        description="Answers to common questions about CivicOne."
        breadcrumbs={[{ label: "Help" }]}
      />

      <div className="space-y-3">
        {FAQS.map((faq) => (
          <Card key={faq.q}>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground">{faq.q}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{faq.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
              <LifeBuoy className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Still need help?</h2>
              <p className="text-sm text-muted-foreground">
                Contact support and we&apos;ll get back to you.
              </p>
            </div>
          </div>
          <a
            href="mailto:support@civicone.ng"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <Mail className="size-4" aria-hidden="true" />
            Email support
          </a>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Having trouble signing in?{" "}
        <Link href="/auth/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
          Reset your password
        </Link>
      </p>
    </div>
  );
}
