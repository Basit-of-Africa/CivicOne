import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CreditCard,
  FileText,
  FolderOpen,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNotifications } from "@/modules/notifications/service";
import { MarkAllReadButton } from "@/modules/notifications/components/mark-all-read-button";
import { NotificationItem } from "@/modules/notifications/components/notification-item";

export const metadata: Metadata = {
  title: "Notifications",
};

const ICON_MAP: Record<string, typeof Bell> = {
  application: FileText,
  payment: CreditCard,
  document: FolderOpen,
  system: Bell,
};

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: "Notifications" }]}
        actions={
          unreadCount > 0 ? <MarkAllReadButton /> : null
        }
      />

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Bell className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              No notifications yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Updates about your applications, documents and account will appear
              here.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/find-a-service">
                Find a service
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {unreadCount > 0 ? (
                  <span>
                    {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                  </span>
                ) : (
                  "All caught up"
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((notification) => {
              const Icon = ICON_MAP[notification.type] ?? Bell;
              return (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  icon={Icon}
                />
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
