import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck2,
  Files,
  Fingerprint,
  FolderOpen,
  Landmark,
  ExternalLink,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroSearch } from "@/components/marketing/hero-search";
import { SERVICE_CATEGORIES, TRUST_DISCLAIMER } from "@/lib/constants";

const FEATURES: Array<{
  icon: typeof Fingerprint;
  title: string;
  description: string;
  status?: string;
}> = [
  {
    icon: Fingerprint,
    title: "Identity, under your control",
    description:
      "A single secure CivicOne account. Verify your identity when you're ready and reuse it across services.",
  },
  {
    icon: Landmark,
    title: "Discover public services",
    description:
      "Search 22+ public services across 13 categories. See requirements, fees, steps and office locations — before you start.",
  },
  {
    icon: FileCheck2,
    title: "Guided applications",
    description:
      "Follow step-by-step guides with checklists, tips, and what-to-bring details. No more guessing what you need.",
  },
  {
    icon: FolderOpen,
    title: "Keep records organised",
    description:
      "Store certificates, track expiry dates, and manage your documents from one secure wallet.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Find what you need",
    description:
      "Search or browse 22+ public services by category. See requirements, fees, steps and office locations.",
  },
  {
    step: "02",
    title: "Follow the guide",
    description:
      "Get personalised checklists, step-by-step guides with tips, and know exactly what to bring to the office.",
  },
  {
    step: "03",
    title: "Manage everything",
    description:
      "Track applications, store documents, get expiry reminders and keep your records organised from one dashboard.",
  },
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Security first",
    description:
      "Passwords are hashed, sessions are encrypted and your data is never sold.",
  },
  {
    icon: ScrollText,
    title: "Your consent",
    description:
      "Nothing is shared with any service or agency without your explicit consent.",
  },
  {
    icon: BadgeCheck,
    title: "Independent",
    description:
      "CivicOne is a technology platform, not a government agency, and never claims to be one.",
  },
];

const FEATURED_AGENCIES = [
  { abbreviation: "CAC", name: "Corporate Affairs Commission", description: "Register a business or company.", slug: "cac", officialUrl: "https://www.cac.gov.ng" },
  { abbreviation: "FIRS", name: "Federal Inland Revenue Service", description: "Manage federal tax services.", slug: "firs", officialUrl: "https://www.firs.gov.ng" },
  { abbreviation: "NIMC", name: "National Identity Management Commission", description: "Access national identity services.", slug: "nimc", officialUrl: "https://nimc.gov.ng" },
  { abbreviation: "NIS", name: "Nigeria Immigration Service", description: "Explore passports and immigration.", slug: "nis", officialUrl: "https://immigration.gov.ng" },
  { abbreviation: "FRSC", name: "Federal Road Safety Corps", description: "Find driving and vehicle services.", slug: "frsc", officialUrl: "https://frsc.gov.ng" },
  { abbreviation: "JAMB", name: "Joint Admissions and Matriculation Board", description: "Prepare for tertiary admissions.", slug: "jamb", officialUrl: "https://jamb.gov.ng" },
  { abbreviation: "NPC", name: "National Population Commission", description: "Find civil registration services.", slug: "npc", officialUrl: "https://nationalpopulation.gov.ng" },
  { abbreviation: "NAFDAC", name: "National Agency for Food and Drug Administration and Control", description: "Explore regulated product services.", slug: "nafdac", officialUrl: "https://nafdac.gov.ng" },
] as const;

export default function HomePage() {
  return (
    <div className="overflow-x-clip">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(16,42,67,0.08),transparent)]"
        />
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <Badge variant="secondary" className="mb-5 gap-1.5">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Nigeria&apos;s civic operating system — not a government agency
            </Badge>

            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your guide to Nigerian{" "}
              <span className="text-secondary">government services</span>.
            </h1>

            <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
              Discover services, follow step-by-step guides, manage applications
              and keep your documents organised — all from one place. No more
              guessing what you need.
            </p>

            <div className="mt-8 w-full">
              <HeroSearch />
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/auth/register">
                  Create your CivicOne account
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/find-a-service">Explore services</Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Free to create · No NIN required to sign up
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Feature cards                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-border bg-card">
                <CardContent className="space-y-3 p-5">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/5 text-primary">
                    <feature.icon className="size-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                  {feature.status ? (
                    <p className="text-xs font-medium text-secondary">
                      {feature.status}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How it works                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3">
            How it works
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A calm guide for your public life
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three steps to a more organised relationship with government services.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((item) => (
            <li key={item.step} className="relative rounded-lg border border-border bg-card p-6">
              <span className="text-sm font-bold text-secondary">{item.step}</span>
              <h3 className="mt-2 text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Service categories                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <Badge variant="outline" className="mb-3">
                Service catalogue
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                What would you like to do?
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Browse the live catalogue by category. Search, compare and save
                services so the right next step is never more than a tap away.
              </p>
            </div>
            <Button variant="outline" asChild className="shrink-0">
              <Link href="/find-a-service">
                Browse all services
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATEGORIES.map((category) => (
              <Link
                key={category.key}
                href={`/find-a-service?category=${category.key}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 transition-colors hover:border-foreground/25 hover:bg-card"
              >
                <span className="flex items-center gap-3">
                  <Building2
                    className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {category.label}
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Agencies                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <Badge variant="outline" className="mb-3">
                Ministries &amp; agencies
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Start with the organisation
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Find the Nigerian agency behind the service you need, then move
                from a clear explanation to the right official channel.
              </p>
            </div>
            <Button variant="outline" asChild className="shrink-0">
              <Link href="/ministries">
                View all ministries and agencies
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_AGENCIES.map((agency) => (
              <div key={agency.slug} className="flex min-h-44 flex-col rounded-lg border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/5 text-sm font-bold text-primary">
                    {agency.abbreviation}
                  </div>
                  <a
                    href={agency.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Visit ${agency.name} official website`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </div>
                <h3 className="mt-4 text-sm font-semibold leading-snug text-foreground">
                  {agency.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{agency.description}</p>
                <Link
                  href={`/find-a-service?provider=${agency.slug}`}
                  className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary hover:underline"
                >
                  View services
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Trust                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section id="trust" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
          <div>
            <Badge variant="outline" className="mb-3">
              Trust &amp; transparency
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {TRUST_DISCLAIMER}
            </h2>
            <p className="mt-3 text-muted-foreground">
              CivicOne is an independent technology platform for helping
              Nigerians discover, initiate, manage and organise public and
              administrative services. We are not NIMC, CAC, FRSC, NIS, FIRS or
              any ministry, department, agency or state government — and we
              will never claim to be.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {TRUST_POINTS.map((point) => (
              <div key={point.title} className="rounded-lg border border-border bg-card p-5">
                <div className="flex size-10 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                  <point.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {point.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Final CTA                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-lg border border-border bg-primary px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_80%_0%,rgba(242,177,52,0.18),transparent)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <Files className="mx-auto size-9 text-accent" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary-foreground">
              Get organised, in your own time
            </h2>
            <p className="mt-3 text-primary-foreground/80">
              Create your free account today. Browse services, follow guides,
              and manage your documents — all in one place.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="accent" asChild>
                <Link href="/auth/register">
                  Create your CivicOne account
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
