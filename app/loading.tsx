import { Logo } from "@/components/ui/logo";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background">
      <Logo href="/" />
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading…
      </p>
    </div>
  );
}
