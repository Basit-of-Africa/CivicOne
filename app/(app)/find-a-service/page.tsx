import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import {
  searchServicesWithIntent,
  getServiceCategories,
  getJurisdictionOptions,
  getSavedServiceIds,
} from "@/modules/services/service";
import { ServiceCard, MODE_LABELS } from "@/modules/services/components/service-card";
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
  mode?: string;
}

export default async function FindServicePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const [savedIds, categories, jurisdictions, outcome] = await Promise.all([
    getSavedServiceIds(),
    getServiceCategories(),
    getJurisdictionOptions(),
    searchServicesWithIntent({
      query: params.q,
      category: params.category === "all" ? undefined : params.category,
      jurisdiction: params.jurisdiction === "all" ? undefined : params.jurisdiction,
      mode: params.mode === "all" ? undefined : (params.mode as "GUIDANCE" | "EXTERNAL" | "INTEGRATED" | undefined),
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
        modes={(["GUIDANCE", "EXTERNAL", "INTEGRATED"] as const).map((m) => ({ slug: m, name: MODE_LABELS[m] ?? m }))}
      />

      {outcome.results.length === 0 ? (
        <ServiceResultsEmpty />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {outcome.results.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              saved={savedIds.has(service.id)}
            />
          ))}
        </div>
      )}

      {outcome.related.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Related services
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {outcome.related.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                saved={savedIds.has(service.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
