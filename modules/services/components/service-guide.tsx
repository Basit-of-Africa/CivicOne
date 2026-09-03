import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface GuideStep {
  title: string;
  description: string;
  estimatedTime?: string | null;
  tips?: string[];
  warnings?: string[];
  whatToBring?: string[];
  officeRequired?: boolean;
}

/**
 * Phase 6A — Enhanced Step-by-Step Guide
 * Rich, expandable guide with tips, warnings, and what-to-bring details.
 */
export function ServiceGuide({
  serviceName,
  providerName,
  steps,
}: {
  serviceName: string;
  providerName: string;
  steps: GuideStep[];
}) {
  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-secondary" aria-hidden="true" />
            Step-by-Step Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detailed steps are not available for this service yet. Check the{" "}
            {providerName} website for the current process.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4 text-secondary" aria-hidden="true" />
          Step-by-Step Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-6">
          {steps.map((step, index) => (
            <li key={index} className="relative flex gap-4">
              {/* Step number connector */}
              <div className="flex flex-col items-center">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                {index < steps.length - 1 ? (
                  <div className="mt-2 w-px flex-1 bg-border" />
                ) : null}
              </div>

              {/* Step content */}
              <div className="min-w-0 flex-1 space-y-3 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Estimated time */}
                {step.estimatedTime ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    Estimated time: {step.estimatedTime}
                  </div>
                ) : null}

                {/* What to bring */}
                {step.whatToBring && step.whatToBring.length > 0 ? (
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      What to bring
                    </p>
                    <ul className="mt-1 space-y-1">
                      {step.whatToBring.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-foreground"
                        >
                          <CheckCircle2
                            className="mt-0.5 size-3 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Tips */}
                {step.tips && step.tips.length > 0 ? (
                  <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                    <p className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Lightbulb className="size-3.5" aria-hidden="true" />
                      Pro tips
                    </p>
                    <ul className="mt-1 space-y-1">
                      {step.tips.map((tip, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground"
                        >
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Warnings */}
                {step.warnings && step.warnings.length > 0 ? (
                  <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                    <p className="flex items-center gap-1 text-xs font-medium text-warning">
                      <AlertTriangle
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      Watch out for
                    </p>
                    <ul className="mt-1 space-y-1">
                      {step.warnings.map((warning, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground"
                        >
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Office required badge */}
                {step.officeRequired ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    In-person visit required at a{" "}
                    {providerName} office
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
