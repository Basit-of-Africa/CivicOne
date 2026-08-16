import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  size?: "sm" | "md";
  showWordmark?: boolean;
}

/**
 * CivicOne wordmark + mark. Used across marketing, auth and app shells.
 */
export function Logo({
  href = "/",
  size = "md",
  showWordmark = true,
  className,
  ...props
}: LogoProps) {
  const markSize = size === "md" ? "size-8" : "size-7";
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="CivicOne Nigeria — home"
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground",
          markSize,
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-[55%]"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M12 21v-5h4v5" />
          <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-bold tracking-tight text-foreground",
              size === "md" ? "text-lg" : "text-base",
            )}
          >
            CivicOne
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Nigeria
          </span>
        </span>
      ) : null}
    </Link>
  );
}
