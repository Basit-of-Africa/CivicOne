import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  homeHref?: string;
  showHome?: boolean;
}

/**
 * Accessible breadcrumb navigation built on an ordered list.
 */
export function Breadcrumb({
  items,
  homeHref = "/dashboard",
  showHome = true,
  className,
  ...props
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)} {...props}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {showHome ? (
          <li className="flex items-center gap-1.5">
            <Link
              href={homeHref}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Home className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </li>
        ) : null}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(isLast && "font-medium text-foreground")}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight className="size-3.5" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
