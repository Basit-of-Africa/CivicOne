"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HERO_SEARCH_EXAMPLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Hero search. Phase 1: the search is UI-only — typing, example selection and
 * submit move the visitor to the (placeholder) service search page.
 */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function submit(value: string) {
    router.push(`/find-a-service${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <form
        role="search"
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          submit(query);
        }}
      >
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What do you need to do?"
          aria-label="What do you need to do?"
          className="h-14 w-full rounded-md border border-input bg-card pr-28 pl-12 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-ring"
        />
        <Button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          size="sm"
        >
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">Try:</span>
        {HERO_SEARCH_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuery(example);
              submit(example);
            }}
            className={cn(
              "rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors",
              "hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
