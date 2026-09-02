import Link from "next/link";
import { CheckCircle2, FileText, FolderOpen, Landmark } from "lucide-react";
import type { TimelineEvent } from "@/modules/timeline/service";

const ICONS = {
  identity: CheckCircle2,
  application: FileText,
  record: Landmark,
  document: FolderOpen,
} as const;

export function TimelineList({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const Icon = ICONS[event.type];
        return (
          <li key={event.id} className="flex gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              {event.description ? <p className="text-sm text-muted-foreground">{event.description}</p> : null}
              <p className="text-xs text-muted-foreground">{event.createdAt.toLocaleString()}</p>
              {event.href ? (
                <Link href={event.href} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                  View details
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
