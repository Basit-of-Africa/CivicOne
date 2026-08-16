import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { SectionPlaceholder } from "@/components/app/section-placeholder";

export const metadata: Metadata = {
  title: "Documents",
};

export default function DocumentsPage() {
  return (
    <SectionPlaceholder
      title="Documents"
      description="Your personal document wallet — uploads, official records and more."
      icon={FolderOpen}
      placeholderTitle="No documents yet."
      placeholderDescription="Your document wallet will live here in a later phase."
      phase="Document wallet arrives in Phase 4"
    />
  );
}
