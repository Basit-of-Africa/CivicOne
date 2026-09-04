"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SearchBox } from "@/components/ui/search-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Option {
  slug: string;
  name: string;
}

export function ServiceSearchControls({
  categories,
  jurisdictions,
  modes,
}: {
  categories: Option[];
  jurisdictions: Option[];
  modes: Array<{ slug: string; name: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const jurisdiction = searchParams.get("jurisdiction") ?? "";
  const mode = searchParams.get("mode") ?? "";

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    const keys = ["q", "category", "jurisdiction", "provider", "mode"] as const;
    for (const key of keys) {
      const value = next[key];
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/find-a-service?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <SearchBox
        size="lg"
        placeholder="Search services, e.g. register a business, renew a licence…"
        defaultValue={q}
        onSearch={(value) => update({ q: value })}
        aria-label="Search services"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onValueChange={(v) => update({ category: v })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={jurisdiction} onValueChange={(v) => update({ jurisdiction: v })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All jurisdictions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jurisdictions</SelectItem>
            {jurisdictions.map((j) => (
              <SelectItem key={j.slug} value={j.slug}>{j.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mode} onValueChange={(v) => update({ mode: v })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            {modes.map((m) => (
              <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {q || category || jurisdiction || mode ? (
          <Badge
            variant="outline"
            className="cursor-pointer px-3 py-1"
            onClick={() => router.push("/find-a-service")}
          >
            Clear filters
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

export function ServiceResultsEmpty() {
  return (
    <EmptyState
      icon={<Search className="size-5" aria-hidden="true" />}
      title="No services matched your search."
      description="Try different keywords, clear your filters, or browse all services by category."
    />
  );
}
