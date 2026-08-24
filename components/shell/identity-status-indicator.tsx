import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IdentityStatusView } from "@/modules/identity/service";

export function IdentityStatusIndicator({
  status,
}: {
  status: IdentityStatusView;
}) {
  const verified = status.status === "VERIFIED";
  return (
    <Link
      href="/profile/identity"
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
        verified
          ? "border-border bg-card text-foreground hover:bg-muted"
          : "border-warning/30 bg-warning/5 text-foreground hover:bg-warning/10",
      )}
      title={verified ? "Identity verified" : "Identity not verified"}
    >
      <Fingerprint
        className={cn("size-4 shrink-0", verified ? "text-secondary" : "text-warning")}
        aria-hidden="true"
      />
      <span className="truncate font-medium">
        {verified ? "Identity verified" : "Identity not verified"}
      </span>
    </Link>
  );
}
