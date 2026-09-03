"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { markNotificationAsReadAction } from "@/modules/notifications/actions";
import type { NotificationView } from "@/modules/notifications/service";

export function NotificationItem({
  notification,
  icon: Icon,
}: {
  notification: NotificationView;
  icon: LucideIcon;
}) {
  const router = useRouter();
  const isUnread = !notification.readAt;

  async function handleClick() {
    if (isUnread) {
      await markNotificationAsReadAction(notification.id);
      router.refresh();
    }
  }

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 transition-colors",
        isUnread
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          isUnread ? "bg-primary/10" : "bg-muted",
        )}
      >
        <Icon
          className={cn("size-4", isUnread ? "text-primary" : "text-muted-foreground")}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm",
              isUnread ? "font-semibold text-foreground" : "font-medium text-foreground",
            )}
          >
            {notification.title}
          </p>
          {isUnread ? (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleDateString()}
        </p>
      </div>
      {isUnread ? (
        <CheckCircle2 className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : null}
    </div>
  );

  if (notification.link) {
    return (
      <Link
        href={notification.link}
        onClick={handleClick}
        className="block transition-opacity hover:opacity-80"
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="w-full text-left">
      {content}
    </button>
  );
}
