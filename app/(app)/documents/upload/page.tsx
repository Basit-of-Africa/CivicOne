import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadDocumentForm } from "@/modules/documents/components/upload-document-form";

export const metadata: Metadata = {
  title: "Upload document",
};

export default function UploadDocumentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload document"
        breadcrumbs={[
          { label: "Documents", href: "/documents" },
          { label: "Upload" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/documents">
              <ArrowLeft aria-hidden="true" />
              Back to documents
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-5 sm:p-6">
          <UploadDocumentForm />
        </CardContent>
      </Card>
    </div>
  );
}
