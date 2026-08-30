import type { ApplicationTimelineEntry } from "@/modules/applications/service";
import { APPLICATION_STATUS_LABELS } from "@/modules/applications/status";

export function ApplicationTimeline({ entries }: { entries: ApplicationTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No status updates yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {entries.map((entry, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {APPLICATION_STATUS_LABELS[entry.toStatus]}
            </p>
            <p className="text-xs text-muted-foreground">{entry.createdAt.toLocaleString()}</p>
            {entry.reason ? <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
