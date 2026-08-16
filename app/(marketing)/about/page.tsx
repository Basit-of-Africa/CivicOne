import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Cookie,
  HandHeart,
  LifeBuoy,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About CivicOne",
};

const VALUES = [
  {
    icon: HandHeart,
    title: "Made for Nigerians",
    description:
      "Built around how people in Nigeria actually deal with paperwork, queues and agencies.",
  },
  {
    icon: BadgeCheck,
    title: "Honest about who we are",
    description:
      "CivicOne is an independent technology platform. We are not a government agency and never imply endorsement.",
  },
  {
    icon: Lock,
    title: "Your data stays yours",
    description:
      "Nothing is shared with any service or agency without your explicit consent.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 sm:py-16">
      <section className="space-y-4">
        <PageHeader
          title="About CivicOne"
          description="An independent technology platform for helping Nigerians discover, initiate, manage and organise public and administrative services."
        />
        <p className="max-w-2xl text-muted-foreground">
          Millions of Nigerians interact with public services every day — from
          business registration and licence renewals to passports and tax
          returns. CivicOne exists to make that easier: one secure account, a
          clear view of the services available to you, and a single home for
          your applications and records.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {VALUES.map((value) => (
          <Card key={value.title}>
            <CardContent className="space-y-2.5 p-5">
              <div className="flex size-10 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                <value.icon className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-foreground">{value.title}</h2>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="trust" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Trust &amp; transparency
        </h2>
        <p className="text-muted-foreground">
          CivicOne is an independent technology platform. It is not a
          government agency. CivicOne does not represent NIMC, CAC, FRSC, NIS,
          FIRS, any ministry, department, agency or state government — and it
          will never falsely claim to. Services are always provided by the
          relevant public bodies; CivicOne helps you find, initiate and manage
          them.
        </p>
      </section>

      <section id="security" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-secondary" aria-hidden="true" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Security
          </h2>
        </div>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2.5">
            <Cookie className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Passwords are hashed; session tokens are stored hashed and expire.
          </li>
          <li className="flex gap-2.5">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Sign-in is rate-limited and sensitive actions are audited.
          </li>
          <li className="flex gap-2.5">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Staff access is scoped per role — no blanket admin access.
          </li>
        </ul>
      </section>

      <section id="privacy" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Privacy
        </h2>
        <p className="text-muted-foreground">
          CivicOne collects only the information needed to run your account and
          deliver the services you ask for. In this phase that means your
          contact details and profile information. Your data is never sold, and
          identity numbers (NIN) are not collected at this stage. See{" "}
          <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
            Terms of Use
          </Link>{" "}
          for details.
        </p>
      </section>

      <section id="help" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-2.5">
          <LifeBuoy className="size-5 text-secondary" aria-hidden="true" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Help
          </h2>
        </div>
        <p className="text-muted-foreground">
          Need a hand? Create an account and open the Help section from your
          dashboard, or sign in below.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/auth/register">Create your account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
