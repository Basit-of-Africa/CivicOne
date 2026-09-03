import "server-only";
import { db } from "@/server/db";
import { generateId } from "@/lib/id";
import { createNotification } from "@/modules/notifications/service";

/**
 * Phase 6D — Expiry Reminder Service
 * Checks for expiring records and creates notifications.
 */

const EXPIRY_THRESHOLDS = [
  { days: 90, label: "90 days" },
  { days: 30, label: "30 days" },
  { days: 7, label: "7 days" },
] as const;

/**
 * Check for expiring records and create notifications.
 * Should be called periodically (e.g., daily cron job).
 */
export async function checkExpiringRecords(): Promise<number> {
  const now = new Date();
  let notificationsCreated = 0;

  for (const threshold of EXPIRY_THRESHOLDS) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + threshold.days);

    // Find records expiring within this threshold that haven't been notified yet
    const expiringRecords = await db.governmentServiceRecord.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: {
          not: null,
          gte: now,
          lte: targetDate,
        },
      },
      include: {
        service: { select: { name: true, slug: true } },
        user: { select: { id: true, email: true } },
      },
    });

    for (const record of expiringRecords) {
      // Check if we already notified for this threshold
      const existingNotification = await db.notification.findFirst({
        where: {
          userId: record.userId,
          type: "system",
          title: { contains: record.service.name },
          body: { contains: threshold.label },
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Within last 24 hours
          },
        },
      });

      if (!existingNotification) {
        const daysLeft = Math.ceil(
          (record.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        await createNotification(
          record.userId,
          "system",
          `${record.service.name} expiring soon`,
          `Your ${record.service.name} expires in ${daysLeft} days. Consider renewing to avoid service interruption.`,
          `/records/${record.id}`,
        );

        notificationsCreated++;
      }
    }
  }

  return notificationsCreated;
}

/**
 * Get records expiring soon for a specific user.
 */
export async function getExpiringRecordsForUser(
  userId: string,
  daysThreshold = 90,
): Promise<
  Array<{
    id: string;
    recordType: string;
    serviceName: string;
    expiryDate: Date;
    daysLeft: number;
  }>
> {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + daysThreshold);

  const records = await db.governmentServiceRecord.findMany({
    where: {
      userId,
      status: "ACTIVE",
      expiryDate: {
        not: null,
        gte: now,
        lte: threshold,
      },
    },
    include: {
      service: { select: { name: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  return records.map((r) => ({
    id: r.id,
    recordType: r.recordType,
    serviceName: r.service.name,
    expiryDate: r.expiryDate!,
    daysLeft: Math.ceil(
      (r.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    ),
  }));
}
