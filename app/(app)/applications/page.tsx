import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getApplicationsForUser } from "@/modules/applications/service";
import { ApplicationCard } from "@/modules/applications/components/application-card";

export const metadata: Metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const applications = await getApplicationsForUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Every application you've started, from draft to outcome."
        breadcrumbs={[{ label: "Applications" }]}
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" aria-hidden="true" />}
          title="No applications yet."
          description="When you start an application, it will appear here with its current status."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
