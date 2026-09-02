import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { getIdentityView } from "@/modules/identity/service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { IdentitySummary } from "@/modules/identity/components/identity-summary";

export const metadata: Metadata = {
  title: "Identity",
};

export default async function ProfileIdentityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const view = await getIdentityView();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity"
        description="Your verified identity and verification history."
        breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Identity" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/profile">
              <ArrowLeft aria-hidden="true" />
              Back to profile
            </Link>
          </Button>
        }
      />
      <IdentitySummary view={view} />
    </div>
  );
}
