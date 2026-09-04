import Link from "next/link";
import { ArrowRight, Building2, MapPinned } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface StateOption {
  code: string;
  name: string;
  level: string;
  _count: { services: number };
}

const REGIONS = [
  { name: "North Central", states: ["BENUE", "FCT", "KOGI", "KWARA", "NASARAWA", "NIGER", "PLATEAU"] },
  { name: "North East", states: ["ADAMAWA", "BAUCHI", "BORNO", "GOMBE", "TARABA", "YOBE"] },
  { name: "North West", states: ["JIGAWA", "KADUNA", "KANO", "KATSINA", "KEBBI", "SOKOTO", "ZAMFARA"] },
  { name: "South East", states: ["ABIA", "ANAMBRA", "EBONYI", "ENUGU", "IMO"] },
  { name: "South South", states: ["AKWA_IBOM", "BAYELSA", "CROSS_RIVER", "DELTA", "EDO", "RIVERS"] },
  { name: "South West", states: ["EKITI", "LAGOS", "OGUN", "ONDO", "OSUN", "OYO"] },
] as const;

function StateLink({ state }: { state: StateOption }) {
  const serviceCount = state._count.services;

  return (
    <Link
      href={`/find-a-service?jurisdiction=${state.code}`}
      className="group flex min-h-20 items-center justify-between gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/60"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{state.name}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {serviceCount === 0 ? "Services coming soon" : `${serviceCount} service${serviceCount === 1 ? "" : "s"}`}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
    </Link>
  );
}

export function StateDirectory({ states }: { states: StateOption[] }) {
  const byCode = new Map(states.map((state) => [state.code, state]));
  const federal = byCode.get("FEDERAL");
  const stateCount = states.filter((state) => state.level === "STATE" && state.code !== "FCT").length;
  const coveredCount = states.filter((state) => state.level === "STATE" && state._count.services > 0).length;

  return (
    <section aria-labelledby="state-directory-title" className="space-y-5 border-y border-border py-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="gap-1.5">
            <MapPinned className="size-3.5" aria-hidden="true" />
            National directory
          </Badge>
          <div>
            <h2 id="state-directory-title" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Find services by state
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Browse federal services and state-specific public services across Nigeria.
              {stateCount > 0 ? ` ${coveredCount} of ${stateCount} states currently have published services.` : ""}
            </p>
          </div>
        </div>
        {federal ? (
          <Link
            href="/find-a-service?jurisdiction=FEDERAL"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Building2 className="size-4" aria-hidden="true" />
            {federal.name}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {REGIONS.map((region) => (
          <Card key={region.name} className="overflow-hidden border-border bg-card">
            <CardContent className="p-0">
              <div className="border-b border-border bg-muted/40 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">{region.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{region.states.length} states</p>
              </div>
              {region.states.map((code) => {
                const state = byCode.get(code);
                return state ? <StateLink key={state.code} state={state} /> : null;
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="border-t border-border pt-4 text-sm text-muted-foreground">
        Looking for a specific service? Use the search above, or start with your state to see what is available nearby.
      </div>
    </section>
  );
}