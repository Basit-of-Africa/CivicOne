"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBoxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onSubmit" | "size"
  > {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  clearable?: boolean;
  size?: "md" | "lg";
}

/**
 * Search input with icon, clear affordance and keyboard-submit support.
 * Submitting currently triggers `onSearch` only — search itself is wired up
 * by the consuming feature.
 */
export const SearchBox = React.forwardRef<HTMLInputElement, SearchBoxProps>(
  (
    {
      className,
      onSearch,
      onClear,
      clearable = true,
      size = "md",
      value: controlledValue,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState("");
    const value = controlledValue ?? internalValue;

    const setValue = (next: string) => {
      setInternalValue(next);
      onChange?.({
        target: { value: next },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <form
        className={cn("relative w-full", className)}
        onSubmit={(event) => {
          event.preventDefault();
          onSearch?.(String(value));
        }}
        role="search"
      >
        <Search
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            size === "lg" ? "size-5" : "size-4",
          )}
        />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(event) => setValue(String(event.target.value))}
          className={cn(
            "w-full rounded-md border border-input bg-card text-foreground shadow-sm transition-colors",
            "placeholder:text-muted-foreground hover:border-foreground/25",
            "focus-visible:outline-2 focus-visible:outline-ring",
            size === "lg" ? "h-12 pl-10 pr-10 text-base" : "h-10 pl-9 pr-9 text-sm",
            className,
          )}
          {...props}
        />
        {clearable && value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              onClear?.();
            }}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </form>
    );
  },
);
SearchBox.displayName = "SearchBox";
