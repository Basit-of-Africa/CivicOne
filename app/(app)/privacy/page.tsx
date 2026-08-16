import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy",
};

const SECTIONS = [
  {
    title: "What we collect",
    body: "Only what's needed to run your account: your contact details (email or phone), your profile information, and records of the actions you take on the platform.",
  },
  {
    title: "What we don't collect",
    body: "In this phase we do not collect your NIN or other identity numbers. We never collect more than a service genuinely needs.",
  },
  {
    title: "How we use it",
    body: "To keep you signed in, to deliver the features you use, and to keep your account secure. We do not sell your data.",
  },
  {
    title: "Consent",
    body: "Nothing is shared with any service provider or government agency without your explicit, informed consent. Sharing controls arrive with identity verification.",
  },
  {
    title: "Your controls",
    body: "You can update your personal and contact information from your profile, change your password from Security, and request help at any time.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Privacy"
        description="How CivicOne handles your personal information."
        breadcrumbs={[{ label: "Privacy" }]}
      />
      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 shrink-0 text-secondary" aria-hidden="true" />
                <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
