import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import {
  searchServicesWithIntent,
  getServiceCategories,
  getJurisdictionOptions,
} from "@/modules/services/service";
import { ServiceCard, MODE_LABELS } from "@/modules/services/components/service-card";
import {
  ServiceSearchControls,
  ServiceResultsEmpty,
} from "@/modules/services/components/service-search-explorer";
import { StateDirectory } from "@/modules/services/components/state-directory";
import type { StateOption } from "@/modules/services/components/state-directory";
import { JURISDICTIONS } from "@/prisma/service-catalogue-data";

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

  const [categoriesResult, jurisdictionsResult, outcomeResult] = await Promise.allSettled([
    getServiceCategories(),
    getJurisdictionOptions(),
    searchServicesWithIntent({
      query: params.q,
      category: params.category === "all" ? undefined : params.category,
      jurisdiction: params.jurisdiction === "all" ? undefined : params.jurisdiction,
      mode: params.mode === "all" ? undefined : (params.mode as "GUIDANCE" | "EXTERNAL" | "INTEGRATED" | undefined),
    }),
  ]);

  const dataUnavailable = [categoriesResult, jurisdictionsResult, outcomeResult].some(
    (result) => result.status === "rejected",
  );
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const jurisdictions: StateOption[] = jurisdictionsResult.status === "fulfilled"
    ? jurisdictionsResult.value
    : JURISDICTIONS.filter((j) => j.level === "FEDERAL" || j.level === "STATE").map((j) => ({
        code: j.code,
        name: j.name,
        level: j.level,
        _count: { services: 0 },
      }));
  const outcome = outcomeResult.status === "fulfilled"
    ? outcomeResult.value
    : { results: [], related: [], intentMatched: false };

  return (
    <div className="min-h-svh bg-background">
      <main id="main-content" className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <PageHeader
          title="Find a public service"
          description="Search government services across Nigeria, or browse what is available in your state."
          breadcrumbs={[{ label: "Find a Service" }]}
        />

        <ServiceSearchControls
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          jurisdictions={jurisdictions.map((j) => ({ slug: j.code, name: j.name }))}
          modes={["GUIDANCE", "EXTERNAL", "INTEGRATED"].map((m) => ({ slug: m, name: MODE_LABELS[m] ?? m }))}
        />

        {dataUnavailable ? (
          <div role="status" className="border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
            The service catalogue is temporarily unavailable. You can still browse all 36 states and the Federal Capital Territory while we reconnect.
          </div>
        ) : null}

        <StateDirectory states={jurisdictions} dataUnavailable={dataUnavailable} />

        {outcome.results.length === 0 ? (
          <ServiceResultsEmpty />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {outcome.results.map((service) => (
              <ServiceCard key={service.id} service={service} saved={false} />
            ))}
          </div>
        )}

        {outcome.related.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Related services</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {outcome.related.map((service) => (
                <ServiceCard key={service.id} service={service} saved={false} />
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}