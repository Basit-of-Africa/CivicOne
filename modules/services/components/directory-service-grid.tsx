import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ServiceCard } from "@/modules/services/components/service-card";
import type { ServiceCardView } from "@/modules/services/service";

export function DirectoryServiceGrid({ services }: { services: ServiceCardView[] }) {
  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Search className="size-5" aria-hidden="true" />}
        title="Services are being added"
        description="This directory is ready for more public services. Check back soon or browse the full catalogue."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} saved={false} showSave={false} />
      ))}
    </div>
  );
}