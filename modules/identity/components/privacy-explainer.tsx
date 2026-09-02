import { Database, EyeOff, Lock, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  {
    icon: Database,
    title: "What is stored",
    body: "Your verified identity details (legal name, date of birth, gender, nationality, state and LGA) and an encrypted record of your NIN.",
  },
  {
    icon: Share2,
    title: "Why it is stored",
    body: "So your CivicOne account is connected to a confirmed identity and can be reused across eligible public services with your consent.",
  },
  {
    icon: EyeOff,
    title: "Who can access it",
    body: "Only you, through your account. CivicOne never displays your full NIN and never shares your identity without your explicit consent.",
  },
  {
    icon: Lock,
    title: "How it is protected",
    body: "Your NIN is encrypted at rest and never used as an identifier. Access to identity data is authorised and recorded in an audit trail.",
  },
];

export function PrivacyExplainer() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        Your identity data
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <Card key={item.title}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2.5">
                <item.icon className="size-4 shrink-0 text-secondary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        CivicOne is an independent technology platform. It is not a government agency.
      </p>
    </div>
  );
}
