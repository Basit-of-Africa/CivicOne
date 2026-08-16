import * as React from "react";
import Link from "next/link";
import { Clock, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export interface SectionPlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Message shown inside the empty state. */
  placeholderTitle: string;
  placeholderDescription: string;
  ctaLabel?: string;
  ctaHref?: string;
  phase?: string;
}

/**
 * Polished placeholder used by modules that land in later phases, so the
 * navigation shell is fully functional without building those features yet.
 */
export function SectionPlaceholder({
  title,
  description,
  icon: Icon,
  placeholderTitle,
  placeholderDescription,
  ctaLabel,
  ctaHref,
  phase,
}: SectionPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      {phase ? (
        <div className="flex items-start gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p>
            <span className="font-medium text-foreground">{phase}.</span>{" "}
            This section is part of the product roadmap. The foundation is
            already in place — it becomes available automatically.
          </p>
        </div>
      ) : null}

      <EmptyState
        icon={<Icon className="size-5" aria-hidden="true" />}
        title={placeholderTitle}
        description={placeholderDescription}
        action={
          ctaLabel && ctaHref ? (
            <Button asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
