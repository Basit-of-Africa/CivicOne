import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { SectionPlaceholder } from "@/components/app/section-placeholder";

export const metadata: Metadata = {
  title: "Applications",
};

export default function ApplicationsPage() {
  return (
    <SectionPlaceholder
      title="Applications"
      description="Track every application you've started, from draft to outcome."
      icon={FileText}
      placeholderTitle="No applications yet."
      placeholderDescription="When you start an application, it will appear here with its current status."
      ctaLabel="Find a service"
      ctaHref="/find-a-service"
      phase="Application workflows arrive in Phase 3"
    />
  );
}
