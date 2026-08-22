import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { getSavedServices } from "@/modules/services/service";
import { SavedServicesList } from "@/modules/services/components/saved-services-list";

export const metadata: Metadata = {
  title: "My Services",
};

export default async function ServicesPage() {
  const saved = await getSavedServices();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Services"
        description="Public services you've saved for later."
        breadcrumbs={[{ label: "My Services" }]}
      />
      <SavedServicesList services={saved} />
    </div>
  );
}
