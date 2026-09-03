"use client";

import * as React from "react";
import { Check, Circle, FileText, Info, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  isDocument: boolean;
  isVerified: boolean;
  isWalletItem?: boolean;
  howToObtain?: string | null;
}

/**
 * Phase 6A — Personalized Service Checklist
 * Shows what the user needs to prepare, with items already in their wallet pre-checked.
 */
export function ServiceChecklist({
  serviceId,
  serviceName,
  requirements,
  walletDocumentNames,
}: {
  serviceId: string;
  serviceName: string;
  requirements: ChecklistItem[];
  walletDocumentNames?: string[];
}) {
  const walletSet = React.useMemo(
    () => new Set((walletDocumentNames ?? []).map((n) => n.toLowerCase())),
    [walletDocumentNames],
  );

  const items = React.useMemo(() => {
    return requirements.map((req) => {
      const inWallet =
        req.isDocument &&
        walletSet.has(req.title.toLowerCase());
      return { ...req, checked: req.isVerified || inWallet };
    });
  }, [requirements, walletSet]);

  const completedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  function handlePrint() {
    window.print();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-secondary" aria-hidden="true" />
            Your Checklist
          </CardTitle>
          <Badge variant="outline">
            {completedCount}/{totalCount} ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Checklist items */}
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-md border px-4 py-3 transition-colors",
                item.checked
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-card",
              )}
            >
              <span className="mt-0.5 shrink-0">
                {item.checked ? (
                  <Check className="size-4 text-primary" aria-hidden="true" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    item.checked ? "text-primary" : "text-foreground",
                  )}
                >
                  {item.title}
                  {item.isDocument ? (
                    <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Document
                    </span>
                  ) : null}
                  {item.isWalletItem || item.checked ? (
                    <span className="ml-2 rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      In wallet
                    </span>
                  ) : null}
                </p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
                {item.howToObtain && !item.checked ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="size-3 shrink-0" aria-hidden="true" />
                    {item.howToObtain}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {totalCount === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No specific requirements listed for this service. Confirm with the
            official provider.
          </p>
        ) : null}

        {/* Print button */}
        <div className="flex justify-end border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="size-4" aria-hidden="true" />
            Print checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
