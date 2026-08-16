import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { SectionPlaceholder } from "@/components/app/section-placeholder";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <SectionPlaceholder
      title="Notifications"
      description="Updates about your applications, documents and account."
      icon={Bell}
      placeholderTitle="No notifications yet."
      placeholderDescription="Updates will appear here as you use the platform."
      phase="Notifications arrive in Phase 3"
    />
  );
}
