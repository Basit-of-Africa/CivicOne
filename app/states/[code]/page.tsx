import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPinned } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DirectoryServiceGrid } from "@/modules/services/components/directory-service-grid";
import { getJurisdictionByCode } from "@/modules/services/service";
import { JURISDICTIONS } from "@/prisma/service-catalogue-data";

export const metadata: Metadata = { title: "State Services" };

export default async function StatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();
  const result = await Promise.allSettled([getJurisdictionByCode(normalizedCode)]);
  const live = result[0].status === "fulfilled" ? result[0].value : null;
  const fallback = JURISDICTIONS.find((jurisdiction) => jurisdiction.code === normalizedCode && jurisdiction.level === "STATE");
  if (!live && !fallback) notFound();

  const name = live?.name ?? fallback!.name;
  return (
    <div className="min-h-svh bg-background">
      <main id="main-content" className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <PageHeader title={`${name} services`} description={`Explore public services and official next steps available in ${name}.`} breadcrumbs={[{ label: "Find a Service", href: "/find-a-service" }, { label: name }]} actions={<Button variant="outline" asChild><Link href="/find-a-service"><ArrowLeft aria-hidden="true" /> All states</Link></Button>} />
        <section className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 sm:p-6"><div className="flex size-12 items-center justify-center rounded-md bg-secondary/10 text-secondary"><MapPinned className="size-6" aria-hidden="true" /></div><div><p className="text-sm font-semibold text-foreground">{name}</p><p className="mt-1 text-sm text-muted-foreground">{live?.services.length ?? 0} published state services</p></div></section>
        <section className="space-y-4" aria-labelledby="state-services-title"><div><h2 id="state-services-title" className="text-xl font-bold text-foreground">Services in {name}</h2><p className="mt-1 text-sm text-muted-foreground">Browse services by agency, category and delivery mode.</p></div><DirectoryServiceGrid services={(live?.services ?? []).map((service) => ({ ...service, categorySlug: service.category.slug, categoryName: service.category.name, providerSlug: service.provider.slug, providerName: service.provider.name, providerAbbreviation: service.provider.abbreviation, jurisdictionCode: service.jurisdiction.code, jurisdictionName: service.jurisdiction.name, jurisdictionLevel: service.jurisdiction.level }))} /></section>
      </main>
    </div>
  );
}