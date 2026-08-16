"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
  siblingCount?: number;
}

function buildPageItems(
  current: number,
  pageCount: number,
  siblingCount: number,
): Array<number | "ellipsis"> {
  const items: Array<number | "ellipsis"> = [];
  const start = Math.max(2, current - siblingCount);
  const end = Math.min(pageCount - 1, current + siblingCount);

  items.push(1);
  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page++) items.push(page);
  if (end < pageCount - 1) items.push("ellipsis");
  if (pageCount > 1) items.push(pageCount);

  return items;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  className,
  siblingCount = 1,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));

  const goTo = React.useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(1, target), pageCount);
      if (clamped !== page) onPageChange(clamped);
    },
    [page, pageCount, onPageChange],
  );

  if (pageCount <= 1) return null;

  const items = buildPageItems(page, pageCount, siblingCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-4", className)}
    >
      <p className="text-sm text-muted-foreground" role="status">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="First page"
          disabled={page === 1}
          onClick={() => goTo(1)}
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft />
        </Button>
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="flex size-9 items-center justify-center text-sm text-muted-foreground"
            >
              &hellip;
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "default" : "outline"}
              size="icon"
              className="size-9"
              aria-current={item === page ? "page" : undefined}
              aria-label={`Page ${item}`}
              onClick={() => goTo(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="Next page"
          disabled={page === pageCount}
          onClick={() => goTo(page + 1)}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="Last page"
          disabled={page === pageCount}
          onClick={() => goTo(pageCount)}
        >
          <ChevronsRight />
        </Button>
      </div>
    </nav>
  );
}
