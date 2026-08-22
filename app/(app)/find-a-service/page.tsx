import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import {
  searchServices,
  getServiceCategories,
  getJurisdictionOptions,
  getSavedServiceIds,
} from "@/modules/services/service";
import { ServiceCard } from "@/modules/services/components/service-card";
import {
  ServiceSearchControls,
  ServiceResultsEmpty,
} from "@/modules/services/components/service-search-explorer";

export const metadata: Metadata = {
  title: "Find a Service",
};

interface SearchParams {
  q?: string;
  category?: string;
  jurisdiction?: string;
}

export default async function FindServicePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const savedIds = await getSavedServiceIds();

  const [categories, jurisdictions, results] = await Promise.all([
    getServiceCategories(),
    getJurisdictionOptions(),
    searchServices({
      query: params.q,
      category: params.category === "all" ? undefined : params.category,
      jurisdiction: params.jurisdiction === "all" ? undefined : params.jurisdiction,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a Service"
        description="Tell us what you need to do — we'll show you which public service handles it."
        breadcrumbs={[{ label: "Find a Service" }]}
      />

      <ServiceSearchControls
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        jurisdictions={jurisdictions.map((j) => ({ slug: j.code, name: j.name }))}
      />

      {results.length === 0 ? (
        <ServiceResultsEmpty />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              saved={savedIds.has(service.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
