"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AuthCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Centered card shell shared by all auth pages.
 */
export function AuthCard({
  title,
  description,
  footer,
  children,
  className,
}: AuthCardProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo href="/" size="md" />
        </div>
        <Card className={cn("overflow-hidden", className)}>
          <CardContent className="space-y-5 p-6 sm:p-8">
            <header className="space-y-1.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </header>
            {children}
          </CardContent>
        </Card>
        {footer ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          CivicOne is an independent technology platform. It is not a
          government agency.{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
            Learn more
          </Link>
        </p>
      </div>
    </div>
  );
}
