import type { Metadata } from "next";
import {
  Cookie,
  KeyRound,
  Lock,
  ScanEye,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Security",
};

const ITEMS = [
  {
    icon: Lock,
    title: "Passwords are never stored",
    description:
      "Passwords are hashed with bcrypt (a one-way function, 12 rounds) before storage. Neither CivicOne staff nor a database breach can read them.",
  },
  {
    icon: Cookie,
    title: "Secure sessions",
    description:
      "You're signed in through an opaque token in an HTTP-only, same-site cookie. Session tokens are stored hashed in the database and expire automatically.",
  },
  {
    icon: Timer,
    title: "Sign-in rate limiting",
    description:
      "Failed sign-in attempts are rate-limited to slow down automated attacks without disturbing legitimate users.",
  },
  {
    icon: KeyRound,
    title: "Secure account recovery",
    description:
      "Password resets use short-lived, single-use links. Reset links expire and can only be used once.",
  },
  {
    icon: ScanEye,
    title: "Audit trail",
    description:
      "Sensitive actions are recorded in a structured audit log so unusual activity can be investigated. Passwords, tokens and identity numbers are never logged.",
  },
  {
    icon: ShieldCheck,
    title: "Access is scoped",
    description:
      "Staff roles only grant the access they need. Identity admins can't touch content, content admins can't touch identity — and nobody gets unrestricted access by default.",
  },
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Security"
        description="How CivicOne protects your account and your data."
        breadcrumbs={[{ label: "Security" }]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <Card key={item.title}>
            <CardContent className="space-y-2.5 p-5">
              <div className="flex size-10 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                <item.icon className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
