"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBox } from "@/components/ui/search-box";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES } from "@/lib/constants";

/**
 * Find a Service — Phase 1 UI shell.
 *
 * Search is intentionally non-functional beyond UI interaction. The query and
 * category selection are preserved in the URL so Phase 2 can read them.
 */
export function FindServiceExplorer() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("category") ?? "";

  const [query, setQuery] = React.useState(initialQuery);
  const [category, setCategory] = React.useState(initialCategory);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a Service"
        description="Search the public service catalogue. Results become available in Phase 2."
      />

      <SearchBox
        size="lg"
        placeholder="Search services, e.g. register a business, renew a licence…"
        value={query}
        onChange={(event) => setQuery(String(event.target.value))}
        onSearch={(value) => setQuery(value)}
        onClear={() => setQuery("")}
        aria-label="Search services"
      />

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
          Browse by category
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("")}
          >
            <Badge
              variant={category === "" ? "primary" : "outline"}
              className="cursor-pointer px-3 py-1"
            >
              All services
            </Badge>
          </button>
          {SERVICE_CATEGORIES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
            >
              <Badge
                variant={category === item.key ? "primary" : "outline"}
                className="cursor-pointer px-3 py-1"
              >
                {item.label}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <EmptyState
        icon={<Search className="size-5" aria-hidden="true" />}
        title="The service catalogue is being built."
        description={
          query || category
            ? `We've noted your search${query ? ` for "${query}"` : ""}${category ? ` in ${SERVICE_CATEGORIES.find((c) => c.key === category)?.label ?? category}` : ""}. Detailed results arrive in Phase 2.`
            : "Detailed, up-to-date service information lands in Phase 2."
        }
      />
    </div>
  );
}
