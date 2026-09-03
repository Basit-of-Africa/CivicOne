import { CreditCard, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FeeItem {
  name: string;
  amount: number | null;
  currency: string;
  frequency: string | null;
  note: string | null;
}

/**
 * Phase 6A — Fee Calculator
 * Shows a breakdown of fees for the service with totals.
 */
export function FeeCalculator({
  serviceName,
  fees,
}: {
  serviceName: string;
  fees: FeeItem[];
}) {
  if (fees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-secondary" aria-hidden="true" />
            Fees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fee information is not available for this service yet. Confirm
            directly with the provider before making any payments.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalKnown = fees.reduce(
    (sum, f) => (f.amount != null ? sum + f.amount : sum),
    0,
  );
  const hasUnknownFees = fees.some((f) => f.amount == null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4 text-secondary" aria-hidden="true" />
          Fees
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fee items */}
        <div className="space-y-2">
          {fees.map((fee, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {fee.name}
                </p>
                <div className="flex items-center gap-2">
                  {fee.frequency ? (
                    <p className="text-xs text-muted-foreground">
                      {fee.frequency}
                    </p>
                  ) : null}
                  {fee.note ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Info className="size-3" aria-hidden="true" />
                      {fee.note}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold text-foreground">
                {fee.amount != null
                  ? `${fee.currency} ${fee.amount.toLocaleString()}`
                  : "Varies"}
              </p>
            </div>
          ))}
        </div>

        {/* Total */}
        {totalKnown > 0 ? (
          <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Estimated total
            </p>
            <p className="text-base font-bold text-primary">
              NGN {totalKnown.toLocaleString()}
              {hasUnknownFees ? "+" : ""}
            </p>
          </div>
        ) : null}

        {/* Disclaimer */}
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Fees are estimates. Always confirm current fees with the official
          provider before making payments.
        </p>
      </CardContent>
    </Card>
  );
}
