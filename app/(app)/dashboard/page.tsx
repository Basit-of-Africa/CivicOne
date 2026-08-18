import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  FileText,
  Files,
  FolderOpen,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { getIdentityStatus } from "@/modules/identity/service";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { getGreeting } from "@/lib/format";
import { IdentityCard } from "@/components/dashboard/identity-card";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const firstName = user.firstName ?? "there";
  const greeting = `${getGreeting()}, ${firstName}`;
  const needsEmailVerification = !!user.email && !user.emailVerifiedAt;
  const identityStatus = await getIdentityStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your identity, services and records.
        </p>
      </div>

      {needsEmailVerification && user.email ? (
        <EmailVerificationBanner email={user.email} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          <IdentityCard status={identityStatus} />

          <Card>
            <CardHeader>
              <SectionHeader
                title="My Services"
                description="Services you've discovered or subscribed to."
                actionLabel="Explore services"
                actionHref="/find-a-service"
              />
            </CardHeader>
            <CardContent>
              <EmptyState
                compact
                icon={<Files className="size-5" aria-hidden="true" />}
                title="You don't have any services yet."
                description="Browse the service catalogue and save the ones relevant to you."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="My Applications"
                description="Track the applications you've started."
                actionLabel="Find a service"
                actionHref="/find-a-service"
              />
            </CardHeader>
            <CardContent>
              <EmptyState
                compact
                icon={<FileText className="size-5" aria-hidden="true" />}
                title="No applications yet."
                description="When you start an application, it will appear here with its status."
              />
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <SectionHeader
                title="My Documents"
                actionLabel="View"
                actionHref="/documents"
              />
            </CardHeader>
            <CardContent>
              <EmptyState
                compact
                icon={<FolderOpen className="size-5" aria-hidden="true" />}
                title="No documents yet."
                description="Your document wallet will live here."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader title="Upcoming" />
            </CardHeader>
            <CardContent>
              <EmptyState
                compact
                icon={<CalendarDays className="size-5" aria-hidden="true" />}
                title="Nothing scheduled."
                description="Renewals and deadlines will show up here."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader title="Recent Activity" />
            </CardHeader>
            <CardContent>
              <EmptyState
                compact
                icon={<Activity className="size-5" aria-hidden="true" />}
                title="No recent activity."
                description="Actions you take will appear here."
              />
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" asChild>
            <Link href="/identity/verify">
              Verify my identity
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
