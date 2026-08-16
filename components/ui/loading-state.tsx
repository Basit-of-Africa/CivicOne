import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  spinnerClassName?: string;
}

/**
 * Full-section loading indicator with optional accessible label.
 */
export function LoadingState({
  label = "Loading…",
  className,
  spinnerClassName,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      <Loader2
        className={cn("size-6 animate-spin", spinnerClassName)}
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
