import "server-only";
import { db } from "@/server/db";
import { generateId } from "@/lib/id";
import { requireUser } from "@/server/auth/session";

/**
 * Phase 6C — Notification Service
 * In-app notification system for application status changes, payments, etc.
 */

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Create a new notification for a user.
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  await db.notification.create({
    data: {
      id: generateId("ntf"),
      userId,
      type,
      title,
      body,
      link: link ?? null,
    },
  });
}

/**
 * Get all notifications for the current user.
 */
export async function getNotifications(
  limit = 50,
): Promise<NotificationView[]> {
  const user = await requireUser();
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }));
}

/**
 * Get unread notification count for the current user.
 */
export async function getUnreadCount(): Promise<number> {
  const user = await requireUser();
  return db.notification.count({
    where: { userId: user.id, readAt: null },
  });
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { readAt: new Date() },
  });
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllAsRead(): Promise<void> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Convenience creators for common notification types
// ---------------------------------------------------------------------------

export async function notifyApplicationStatusChanged(
  userId: string,
  reference: string,
  serviceName: string,
  newStatus: string,
): Promise<void> {
  const statusText = newStatus.replace(/_/g, " ").toLowerCase();
  await createNotification(
    userId,
    "application",
    `Application ${statusText}`,
    `Your ${serviceName} application (${reference}) is now ${statusText}.`,
    `/applications/${reference}`,
  );
}

export async function notifyPaymentConfirmed(
  userId: string,
  reference: string,
  amount: number,
): Promise<void> {
  await createNotification(
    userId,
    "payment",
    "Payment confirmed",
    `Your payment of NGN ${amount.toLocaleString()} for application ${reference} has been confirmed.`,
    `/applications/${reference}`,
  );
}

export async function notifyDocumentUploaded(
  userId: string,
  documentName: string,
): Promise<void> {
  await createNotification(
    userId,
    "document",
    "Document uploaded",
    `"${documentName}" has been added to your document wallet.`,
    `/documents`,
  );
}

export async function notifyRecordCreated(
  userId: string,
  recordType: string,
): Promise<void> {
  await createNotification(
    userId,
    "system",
    "New record created",
    `A new ${recordType} has been added to your records.`,
    `/services/my`,
  );
}
