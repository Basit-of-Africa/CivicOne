"use server";

import { withActionResult } from "@/server/errors";
import {
  markAsRead,
  markAllAsRead,
} from "./service";

export async function markNotificationAsReadAction(notificationId: string) {
  return withActionResult(() => markAsRead(notificationId));
}

export async function markAllNotificationsAsReadAction() {
  return withActionResult(() => markAllAsRead());
}
