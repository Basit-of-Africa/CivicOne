import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Terms of Use",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        title="Terms of Use"
        description="The terms that govern your use of CivicOne Nigeria."
      />
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. What CivicOne is</h2>
          <p>
            CivicOne Nigeria (&quot;CivicOne&quot;) is an independent technology
            platform that helps people discover, initiate, manage and organise
            public and administrative services. CivicOne is not a government
            agency and does not act on behalf of NIMC, CAC, FRSC, NIS, FIRS, any
            ministry, department, agency or state government.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Your account</h2>
          <p>
            You are responsible for safeguarding your sign-in credentials. Do not
            share your password. CivicOne may suspend or close accounts that
            violate these terms or that are used unlawfully.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Services</h2>
          <p>
            Public services are delivered by the responsible government bodies.
            CivicOne provides information and organisation tools only. Application
            outcomes remain the decision of the relevant agency.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Privacy</h2>
          <p>
            Your data is handled as described on the About page and in the
            application&apos;s privacy controls. CivicOne never sells personal data.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. No warranty</h2>
          <p>
            CivicOne provides the platform &quot;as is&quot;. While we work hard to keep
            information accurate, service details are provided for guidance and
            may change. Always confirm requirements with the responsible agency
            before relying on them.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Changes</h2>
          <p>
            These terms may be updated from time to time. Material changes will be
            communicated through the platform.
          </p>
        </section>
      </div>
    </div>
  );
}
