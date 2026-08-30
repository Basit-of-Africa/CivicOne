import { cn } from "@/lib/utils";
import type { WorkflowStepView } from "@/modules/applications/workflow-config";

export function ApplicationStepper({
  steps,
  currentStepId,
}: {
  steps: WorkflowStepView[];
  currentStepId: string | null;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const state =
          currentIndex === -1 || index < currentIndex
            ? "done"
            : index === currentIndex
              ? "current"
              : "upcoming";
        return (
          <li
            key={step.id}
            className="flex items-center gap-2 text-xs"
            aria-current={state === "current" ? "step" : undefined}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                state === "done" && "border-primary bg-primary/10 text-primary",
                state === "current" && "border-primary bg-primary text-primary-foreground",
                state === "upcoming" && "border-border text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "hidden sm:inline",
                state === "current" ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {step.title}
            </span>
            {index < steps.length - 1 ? (
              <span className="mx-1 h-px w-4 bg-border" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
