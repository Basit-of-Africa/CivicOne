import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getWalletDocuments, DOCUMENT_CATEGORIES } from "@/modules/documents/service";
import { DocumentCard } from "@/modules/documents/components/document-card";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const documents = await getWalletDocuments({ category });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Your private document wallet. Files are stored privately and never shared publicly."
        breadcrumbs={[{ label: "Documents" }]}
        actions={
          <Button asChild>
            <Link href="/documents/upload">
              <UploadCloud aria-hidden="true" />
              Upload document
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/documents"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!category ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/25"}`}
        >
          All
        </Link>
        {DOCUMENT_CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/documents?category=${c.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === c.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/25"}`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-5" aria-hidden="true" />}
          title={category ? "No documents in this category." : "No documents yet."}
          description={category ? "Try another category or upload a document." : "Upload a document or approve an application to receive certificates here."}
          action={
            <Button asChild>
              <Link href="/documents/upload">Upload a document</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}
