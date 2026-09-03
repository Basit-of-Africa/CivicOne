import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  FileText,
  Files,
  FolderOpen,
  ChevronRight,
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
import { getWalletDocuments, signDocumentUrl } from "@/modules/documents/service";
import { getMyServicesOverview } from "@/modules/records/service";
import { getTimeline } from "@/modules/timeline/service";
import { getApplicationsForUser } from "@/modules/applications/service";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const firstName = user.firstName ?? "there";
  const greeting = `${getGreeting()}, ${firstName}`;
  const needsEmailVerification = !!user.email && !user.emailVerifiedAt;
  // identityStatus is already fetched by the (app) layout for the sidebar.
  // Reuse it here via a separate call — React cache deduplicates within
  // the same request so this won't cause an extra DB round-trip.
  const identityStatus = await getIdentityStatus();

  const [applications, documents, timeline, overview] = await Promise.all([
    getApplicationsForUser(),
    getWalletDocuments({ limit: 4 }),
    getTimeline({ limit: 5 }),
    getMyServicesOverview(),
  ]);
  const expiringSoon = overview.expiringSoon;
  const recentApplications = applications.slice(0, 3);

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
                description="Records issued to you and applications in progress."
                actionLabel="View"
                actionHref="/services/my"
              />
            </CardHeader>
            <CardContent>
              {overview.active.length > 0 ? (
                <div className="space-y-3">
                  <ul className="space-y-1">
                    {overview.active.map((record) => (
                      <li key={record.id}>
                        <Link
                          href={`/records/${record.id}`}
                          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          {record.serviceName}
                          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="px-2 text-xs text-muted-foreground">
                    {overview.active.length} active record{overview.active.length === 1 ? "" : "s"}
                    {overview.completed.length > 0 ? ` · ${overview.completed.length} completed` : ""}
                  </p>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={<Files className="size-5" aria-hidden="true" />}
                  title="You don't have any records yet."
                  description="Apply for a service and its record will appear here on approval."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="My Applications"
                description="Track the applications you've started."
                actionLabel="View all"
                actionHref="/applications"
              />
            </CardHeader>
            <CardContent>
              {recentApplications.length > 0 ? (
                <ul className="space-y-1">
                  {recentApplications.map((application) => (
                    <li key={application.id}>
                      <Link
                        href={`/applications/${application.reference}`}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        {application.reference}
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={<FileText className="size-5" aria-hidden="true" />}
                  title="No applications yet."
                  description="When you start an application, it will appear here with its status."
                />
              )}
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
              {documents.length > 0 ? (
                <ul className="space-y-1">
                  {documents.map((document) => (
                    <li key={document.id}>
                      <Link
                        href={signDocumentUrl(document.id)}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <span className="truncate">{document.name}</span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={<FolderOpen className="size-5" aria-hidden="true" />}
                  title="No documents yet."
                  description="Approved services add certificates to your wallet automatically."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader title="Upcoming" />
            </CardHeader>
            <CardContent>
              {expiringSoon.length > 0 ? (
                <ul className="space-y-1">
                  {expiringSoon.map((record) => (
                    <li key={record.id}>
                      <Link
                        href={`/records/${record.id}`}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <span className="truncate">{record.serviceName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {record.expiryDate ? record.expiryDate.toLocaleDateString() : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={<CalendarDays className="size-5" aria-hidden="true" />}
                  title="Nothing scheduled."
                  description="Renewals and deadlines will show up here."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader title="Recent Activity" />
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <ul className="space-y-1">
                  {timeline.map((event) => (
                    <li key={event.id}>
                      {event.href ? (
                        <Link
                          href={event.href}
                          className="block rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <span className="block truncate">{event.title}</span>
                          <span className="block truncate text-xs font-normal text-muted-foreground">
                            {event.createdAt.toLocaleString()}
                          </span>
                        </Link>
                      ) : (
                        <div className="rounded-md px-2 py-1.5">
                          <span className="block text-sm font-medium text-foreground">{event.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {event.createdAt.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={<Activity className="size-5" aria-hidden="true" />}
                  title="No recent activity."
                  description="Actions you take will appear here."
                />
              )}
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
