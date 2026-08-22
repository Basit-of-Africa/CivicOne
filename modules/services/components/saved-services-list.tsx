import Link from "next/link";
import { Files, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { ServiceCardView } from "@/modules/services/service";
import { ServiceCard } from "./service-card";

export function SavedServicesList({
  services,
}: {
  services: ServiceCardView[];
}) {
  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Files className="size-5" aria-hidden="true" />}
        title="You haven't saved any services yet."
        description="Save services you're interested in to find them here later."
        action={
          <Button asChild>
            <Link href="/find-a-service">
              <Search aria-hidden="true" />
              Find a service
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} saved />
      ))}
    </div>
  );
}
