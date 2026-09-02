import "server-only";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";

export type TimelineEventType = "identity" | "application" | "record" | "document";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string | null;
  createdAt: Date;
  href: string | null;
}

export async function getTimeline(opts?: { limit?: number }): Promise<TimelineEvent[]> {
  const user = await requireUser();

  const identityVerifications = await db.identityVerification.findMany({
    where: { userId: user.id },
    orderBy: { verifiedAt: "desc" },
  });
  const identityEvents: TimelineEvent[] = identityVerifications.map((v) => ({
    id: `identity-${v.id}`,
    type: "identity",
    title: "Identity verified",
    description: v.reference,
    createdAt: v.verifiedAt,
    href: "/profile/identity",
  }));

  const applications = await db.application.findMany({
    where: { userId: user.id },
    include: { statusHistory: true },
    orderBy: { createdAt: "desc" },
  });
  const applicationEvents: TimelineEvent[] = applications.flatMap((app) => {
    const events: TimelineEvent[] = [
      {
        id: `app-created-${app.id}`,
        type: "application",
        title: "Application created",
        description: app.reference,
        createdAt: app.createdAt,
        href: `/applications/${app.reference}`,
      },
    ];
    for (const history of app.statusHistory) {
      const title =
        history.toStatus === "SUBMITTED"
          ? "Application submitted"
          : history.toStatus === "APPROVED"
            ? "Application approved"
            : history.toStatus === "REJECTED"
              ? "Application rejected"
              : null;
      if (!title) continue;
      events.push({
        id: `status-${history.id}`,
        type: "application",
        title,
        description: app.reference,
        createdAt: history.createdAt,
        href: `/applications/${app.reference}`,
      });
    }
    return events;
  });

  const records = await db.governmentServiceRecord.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const recordEvents: TimelineEvent[] = records.map((r) => ({
    id: `record-${r.id}`,
    type: "record",
    title: "Service record created",
    description: r.recordType,
    createdAt: r.createdAt,
    href: `/records/${r.id}`,
  }));

  const documents = await db.walletDocument.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const documentEvents: TimelineEvent[] = documents.map((d) => ({
    id: `document-${d.id}`,
    type: "document",
    title: "Document uploaded",
    description: d.name,
    createdAt: d.createdAt,
    href: "/documents",
  }));

  const all = [...identityEvents, ...applicationEvents, ...recordEvents, ...documentEvents].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return opts?.limit ? all.slice(0, opts.limit) : all;
}
