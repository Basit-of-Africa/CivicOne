import type { Metadata } from "next";
import { History } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getTimeline } from "@/modules/timeline/service";
import { TimelineList } from "@/modules/timeline/components/timeline-list";

export const metadata: Metadata = {
  title: "Timeline",
};

export default async function TimelinePage() {
  const events = await getTimeline();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        description="A chronological record of everything you've initiated and managed."
        breadcrumbs={[{ label: "Timeline" }]}
      />
      {events.length === 0 ? (
        <EmptyState
          icon={<History className="size-5" aria-hidden="true" />}
          title="Your timeline is empty."
          description="Actions, applications and records will be listed here as you use CivicOne."
        />
      ) : (
        <TimelineList events={events} />
      )}
    </div>
  );
}
