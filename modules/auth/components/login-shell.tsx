"use client";

import * as React from "react";
import Link from "next/link";
import { Accessibility, Check, ChevronDown, Globe2, Languages, Minus, Plus, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

function UtilityMenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-card p-2 text-sm shadow-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function LoginShell({ children }: { children: React.ReactNode }) {
  const [largeText, setLargeText] = React.useState(false);
  const [highContrast, setHighContrast] = React.useState(false);

  return (
    <main className={cn("flex min-h-svh w-full bg-card", largeText && "text-[105%]", highContrast && "contrast-125")}>
      <section className="relative flex w-full flex-1 flex-col px-4 pb-6 pt-14 sm:px-6 lg:w-1/2 lg:flex-none lg:px-20 xl:px-24">
        <div className="absolute right-4 top-4 flex items-center gap-1 sm:right-6 lg:right-10">
          <UtilityMenu label="Choose language" icon={<Globe2 className="size-6" aria-hidden="true" />}>
            <p className="px-3 py-2 font-semibold text-foreground">Language</p>
            <Link href="/auth/login" role="menuitem" className="flex items-center gap-2 rounded px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Check className="size-4 text-secondary" aria-hidden="true" /> English
            </Link>
            <button type="button" role="menuitem" disabled className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-muted-foreground/60">
              <Languages className="size-4" aria-hidden="true" /> Hausa (coming soon)
            </button>
            <button type="button" role="menuitem" disabled className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-muted-foreground/60">
              <Languages className="size-4" aria-hidden="true" /> Yoruba (coming soon)
            </button>
          </UtilityMenu>
          <UtilityMenu label="Accessibility" icon={<Accessibility className="size-6" aria-hidden="true" />}>
            <p className="border-b border-border px-3 py-2 font-semibold text-foreground">Accessibility</p>
            <label className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-muted-foreground hover:bg-muted">
              <input type="checkbox" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} className="accent-secondary" />
              High contrast
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-muted-foreground hover:bg-muted">
              <input type="checkbox" checked={largeText} onChange={(event) => setLargeText(event.target.checked)} className="accent-secondary" />
              Larger text
            </label>
            <div className="flex gap-1 border-t border-border pt-2">
              <button type="button" className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-2 text-muted-foreground hover:bg-muted" onClick={() => setLargeText(true)}>
                <Plus className="size-4" aria-hidden="true" /> Increase
              </button>
              <button type="button" className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-2 text-muted-foreground hover:bg-muted" onClick={() => setLargeText(false)}>
                <Minus className="size-4" aria-hidden="true" /> Reset
              </button>
            </div>
          </UtilityMenu>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center lg:w-96 lg:max-w-none">
          <div className="flex justify-center">
            <Logo href="/" size="md" />
          </div>
          <header className="mt-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">One Login</h1>
            <p className="mt-1 text-base text-muted-foreground">Your Nigerian identity, services and records</p>
          </header>
          <div className="mt-10">{children}</div>
          <div className="relative mt-9">
            <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-sm font-medium"><span className="bg-card px-5 text-muted-foreground">Or continue with</span></div>
          </div>
          <div className="mt-6">
            <button type="button" disabled title="Digital ID sign-in is not available yet" className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-muted/40 text-sm font-semibold text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-70">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">ID</span>
              Sign in with Digital ID
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground lg:absolute lg:bottom-5 lg:left-6 lg:mt-0">
          CivicOne is an independent technology platform. It is not a government agency. <Link href="/about" className="underline underline-offset-2 hover:text-foreground">Learn more</Link>
        </p>
      </section>

      <aside aria-label="CivicOne" className="relative hidden flex-1 overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(242,177,52,0.3),transparent_25%),linear-gradient(145deg,#102a43_0%,#0b6b3a_100%)]" />
        <div className="absolute -right-24 top-1/4 size-[32rem] rounded-full border border-white/15" />
        <div className="absolute right-20 top-1/3 size-56 rounded-full border-[18px] border-accent/80" />
        <div className="absolute bottom-20 left-16 h-48 w-72 -rotate-12 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm" />
        <div className="absolute bottom-28 left-28 max-w-sm text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">CivicOne Nigeria</p>
          <p className="mt-4 text-4xl font-semibold leading-tight">One place for the public services that shape your life.</p>
        </div>
      </aside>
    </main>
  );
}