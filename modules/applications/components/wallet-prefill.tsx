import { CheckCircle2, FileText, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface WalletPrefillItem {
  fieldKey: string;
  label: string;
  value: string;
  source: "identity" | "profile" | "wallet";
  isVerified: boolean;
}

/**
 * Phase 6B — Wallet Pre-fill Summary
 * Shows which fields will be auto-filled from the user's wallet/profile.
 */
export function WalletPrefillSummary({
  prefills,
  formName,
}: {
  prefills: WalletPrefillItem[];
  formName: string;
}) {
  if (prefills.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
          Auto-filled from your profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          The following fields in <span className="font-medium text-foreground">{formName}</span> will
          be pre-filled from your saved information. You can edit them if needed.
        </p>
        <div className="space-y-2">
          {prefills.map((item) => (
            <div
              key={item.fieldKey}
              className="flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-2"
            >
              <div className="flex items-center gap-2">
                {item.source === "identity" ? (
                  <User className="size-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <FileText className="size-3.5 text-primary" aria-hidden="true" />
                )}
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{item.value}</span>
                {item.isVerified ? (
                  <Badge variant="outline">Verified</Badge>
                ) : (
                  <Badge variant="neutral">From profile</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
