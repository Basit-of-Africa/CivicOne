import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus, Layers, Archive, CheckCircle2, CalendarClock, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyServicesOverview } from "@/modules/records/service";
import { getApplicationsForUser } from "@/modules/applications/service";
import { RecordCard } from "@/modules/records/components/record-card";
import { ApplicationCard } from "@/modules/applications/components/application-card";

export const metadata: Metadata = {
  title: "My Services",
};

export default async function MyServicesPage() {
  const [overview, applications] = await Promise.all([getMyServicesOverview(), getApplicationsForUser()]);
  const active = overview.active;
  const anyRecords = active.length > 0 || overview.completed.length > 0 || overview.archived.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Services"
        description="Records issued to you and applications in progress."
        breadcrumbs={[{ label: "My Services" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/services">
              <FolderPlus aria-hidden="true" />
              Saved services
            </Link>
          </Button>
        }
      />

      {!anyRecords && applications.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" aria-hidden="true" />}
          title="Nothing here yet."
          description="When a service you apply for is approved, its record will appear here."
        />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">Active</h2>
              <span className="text-xs text-muted-foreground">({active.length})</span>
            </div>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active records.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {active.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            )}
          </section>

          {overview.expiringSoon.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-warning" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Expiring soon</h2>
                <span className="text-xs text-muted-foreground">({overview.expiringSoon.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {overview.expiringSoon.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-secondary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">Applications</h2>
              <span className="text-xs text-muted-foreground">({applications.length})</span>
            </div>
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications in progress.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {applications.map((application) => <ApplicationCard key={application.id} application={application} />)}
              </div>
            )}
          </section>

          {overview.completed.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Completed</h2>
                <span className="text-xs text-muted-foreground">({overview.completed.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {overview.completed.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            </section>
          ) : null}

          {overview.archived.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Archived</h2>
                <span className="text-xs text-muted-foreground">({overview.archived.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {overview.archived.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
