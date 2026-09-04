import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { getMinistryDirectory, type MinistryDirectoryView } from "@/modules/services/service";
import { MinistryDirectory } from "@/modules/services/components/ministry-directory";
import { SERVICE_PROVIDERS_SEED } from "@/prisma/service-catalogue-data";

export const metadata: Metadata = {
  title: "Ministries & Agencies",
};

export default async function MinistriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q ?? "";
  const result = await Promise.allSettled([getMinistryDirectory(query)]);
  const first = result[0];
  const dataUnavailable = first.status === "rejected";
  const ministries: MinistryDirectoryView[] = first.status === "fulfilled"
    ? first.value
    : SERVICE_PROVIDERS_SEED.map((provider) => ({
        slug: provider.slug,
        name: provider.name,
        abbreviation: provider.abbreviation,
        description: provider.description,
        officialUrl: provider.officialUrl,
        serviceCount: 0,
      })).filter((provider) => {
        const normalizedQuery = query.trim().toLowerCase();
        return !normalizedQuery
          || provider.name.toLowerCase().includes(normalizedQuery)
          || provider.abbreviation.toLowerCase().includes(normalizedQuery);
      });

  return (
    <div className="min-h-svh bg-background">
      <main id="main-content" className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <PageHeader
          title="Ministries & agencies"
          description="Find the government organisation responsible for a service, then see the services and official channels connected to it."
          breadcrumbs={[{ label: "Ministries & Agencies" }]}
        />
        <MinistryDirectory ministries={ministries} query={query} dataUnavailable={dataUnavailable} />
      </main>
    </div>
  );
}