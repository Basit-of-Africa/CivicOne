"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Landmark, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBox } from "@/components/ui/search-box";
import type { MinistryDirectoryView } from "@/modules/services/service";

export function MinistryDirectory({
  ministries,
  query,
  dataUnavailable = false,
}: {
  ministries: MinistryDirectoryView[];
  query: string;
  dataUnavailable?: boolean;
}) {
  return (
    <div className="space-y-6">
      <SearchBox
        size="lg"
        placeholder="Search ministries and agencies"
        defaultValue={query}
        onSearch={(value) => {
          window.location.href = value ? `/ministries?q=${encodeURIComponent(value)}` : "/ministries";
        }}
        aria-label="Search ministries and agencies"
      />

      {dataUnavailable ? (
        <div role="status" className="border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          The live ministry catalogue is temporarily unavailable. Showing the directory structure while we reconnect.
        </div>
      ) : null}

      {ministries.length === 0 ? (
        <div className="border border-border bg-card px-5 py-10 text-center">
          <Search className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-foreground">No ministries matched your search.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try the ministry name or its abbreviation.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ministries.map((ministry) => (
            <Card key={ministry.slug} className="border-border bg-card transition-colors hover:border-foreground/25">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary">
                    <Landmark className="size-5" aria-hidden="true" />
                  </div>
                  {ministry.abbreviation ? <Badge variant="outline">{ministry.abbreviation}</Badge> : null}
                </div>
                <div className="space-y-2">
                  <h2 className="text-base font-semibold leading-snug text-foreground">{ministry.name}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {ministry.description ?? "Public services and information from this government organisation."}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/ministries/${ministry.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    {ministry.serviceCount} service{ministry.serviceCount === 1 ? "" : "s"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  {ministry.officialUrl ? (
                    <a
                      href={ministry.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Official site
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}