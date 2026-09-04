import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Landmark } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DirectoryServiceGrid } from "@/modules/services/components/directory-service-grid";
import { getMinistryBySlug } from "@/modules/services/service";
import { SERVICE_PROVIDERS_SEED } from "@/prisma/service-catalogue-data";

export const metadata: Metadata = { title: "Ministry or Agency" };

export default async function MinistryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await Promise.allSettled([getMinistryBySlug(slug)]);
  const live = result[0].status === "fulfilled" ? result[0].value : null;
  const fallback = SERVICE_PROVIDERS_SEED.find((provider) => provider.slug === slug);
  if (!live && !fallback) notFound();

  const name = live?.name ?? fallback!.name;
  const description = live?.description ?? fallback!.description;
  const officialUrl = live?.officialUrl ?? fallback!.officialUrl;

  return (
    <div className="min-h-svh bg-background">
      <main id="main-content" className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <PageHeader
          title={name}
          description={description ?? undefined}
          breadcrumbs={[{ label: "Ministries & Agencies", href: "/ministries" }, { label: name }]}
          actions={<Button variant="outline" asChild><Link href="/ministries"><ArrowLeft aria-hidden="true" /> All agencies</Link></Button>}
        />
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-md bg-primary/5 text-primary"><Landmark className="size-6" aria-hidden="true" /></div>
            <div><Badge variant="outline">{live?.abbreviation ?? fallback?.abbreviation}</Badge><p className="mt-2 text-sm text-muted-foreground">{live?.services.length ?? 0} published CivicOne services</p></div>
          </div>
          {officialUrl ? <a href={officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Official website <ExternalLink className="size-4" aria-hidden="true" /></a> : null}
        </section>
        <section className="space-y-4" aria-labelledby="ministry-services-title">
          <div><h2 id="ministry-services-title" className="text-xl font-bold text-foreground">Services from {name}</h2><p className="mt-1 text-sm text-muted-foreground">Guides, requirements and next steps for services connected to this organisation.</p></div>
          <DirectoryServiceGrid services={(live?.services ?? []).map((service) => ({ ...service, categorySlug: service.category.slug, categoryName: service.category.name, providerSlug: service.provider.slug, providerName: service.provider.name, providerAbbreviation: service.provider.abbreviation, jurisdictionCode: service.jurisdiction.code, jurisdictionName: service.jurisdiction.name, jurisdictionLevel: service.jurisdiction.level }))} />
        </section>
      </main>
    </div>
  );
}