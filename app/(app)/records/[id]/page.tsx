import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, FileText, Landmark, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRecordById } from "@/modules/records/service";
import { signDocumentUrl } from "@/modules/documents/service";
import { APPLICATION_STATUS_LABELS } from "@/modules/applications/status";
import { RECORD_STATUS_LABELS, RECORD_VERIFICATION_LABELS, RECORD_SOURCE_LABELS } from "@/modules/records/labels";

export const metadata: Metadata = {
  title: "Record",
};

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getRecordById(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={record.recordType}
        breadcrumbs={[
          { label: "My Services", href: "/services/my" },
          { label: record.recordType },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/services/my">
              <ArrowLeft aria-hidden="true" />
              My services
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">{record.serviceName}</h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Landmark className="size-4" aria-hidden="true" />
                {record.providerName}
              </p>
            </div>
            <StatusBadge status={record.status} label={RECORD_STATUS_LABELS[record.status]} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verification</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ShieldCheck className="size-4 text-secondary" aria-hidden="true" />
                {RECORD_VERIFICATION_LABELS[record.verificationStatus]}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{RECORD_SOURCE_LABELS[record.source]}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issue date</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {record.issueDate ? record.issueDate.toLocaleDateString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expiry</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {record.expiryDate ? record.expiryDate.toLocaleDateString() : "Does not expire"}
              </dd>
            </div>
            {record.externalReference ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{record.externalReference}</dd>
              </div>
            ) : null}
            {record.officialUrl ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Provider</dt>
                <dd className="mt-1">
                  <a href={record.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Official site <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-secondary" aria-hidden="true" />
            Documents
          </CardTitle>
          <CardDescription>Certificates and files linked to this record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {record.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents linked to this record.</p>
          ) : (
            record.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {document.fileName} · {(document.sizeBytes / 1024).toFixed(0)} KB
                  </p>
                </div>
                <a href={signDocumentUrl(document.id)} className="shrink-0 text-sm font-medium text-primary hover:underline">
                  View
                </a>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {record.application ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-secondary" aria-hidden="true" />
              Related application
            </CardTitle>
            <CardDescription>The application that produced this record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{record.application.reference}</p>
              <StatusBadge status={record.application.status} label={APPLICATION_STATUS_LABELS[record.application.status as keyof typeof APPLICATION_STATUS_LABELS]} />
            </div>
            <ol className="space-y-2">
              {record.application.timeline.map((entry, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-foreground">{APPLICATION_STATUS_LABELS[entry.toStatus as keyof typeof APPLICATION_STATUS_LABELS]}</p>
                    <p className="text-xs text-muted-foreground">{entry.createdAt.toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/applications/${record.application.reference}`}>Open application</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
