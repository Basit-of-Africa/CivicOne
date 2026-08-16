import type { Metadata } from "next";
import { Files } from "lucide-react";
import { SectionPlaceholder } from "@/components/app/section-placeholder";

export const metadata: Metadata = {
  title: "My Services",
};

export default function ServicesPage() {
  return (
    <SectionPlaceholder
      title="My Services"
      description="The public services you've discovered, saved or subscribed to."
      icon={Files}
      placeholderTitle="You don't have any services yet."
      placeholderDescription="Once the service catalogue arrives, services you save or subscribe to will appear here."
      ctaLabel="Explore services"
      ctaHref="/find-a-service"
      phase="Service catalogue arrives in Phase 2"
    />
  );
}
