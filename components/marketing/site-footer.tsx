import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { TRUST_DISCLAIMER } from "@/lib/constants";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Find a service", href: "/find-a-service" },
      { label: "My services", href: "/services" },
      { label: "Applications", href: "/applications" },
      { label: "Documents", href: "/documents" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Trust & transparency", href: "/about#trust" },
      { label: "Security", href: "/about#security" },
      { label: "Help", href: "/about#help" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of use", href: "/terms" },
      { label: "Privacy", href: "/about#privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="space-y-3">
            <Logo href="/" />
            <p className="max-w-xs text-sm text-muted-foreground">
              Your Nigerian identity, public services and records in one place.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-sm font-medium text-foreground">{TRUST_DISCLAIMER}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            CivicOne helps you discover and manage public services. CivicOne does
            not act on behalf of, or in place of, any government body.
          </p>
          <div className="mt-4 flex flex-col justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p>
              &copy; {new Date().getFullYear()} CivicOne Nigeria. All rights reserved.
            </p>
            <p>Made for everyone in Nigeria.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
