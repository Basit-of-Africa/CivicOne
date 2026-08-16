import type { Metadata } from "next";
import { History } from "lucide-react";
import { SectionPlaceholder } from "@/components/app/section-placeholder";

export const metadata: Metadata = {
  title: "Timeline",
};

export default function TimelinePage() {
  return (
    <SectionPlaceholder
      title="Timeline"
      description="A chronological record of everything you've initiated and managed."
      icon={History}
      placeholderTitle="Your timeline is empty."
      placeholderDescription="Actions, applications and records will be listed here as you use CivicOne."
      phase="Records & timeline arrive in Phase 5"
    />
  );
}
