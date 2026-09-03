import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Landmark,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { getRecordById } from "@/modules/records/service";
import { signDocumentUrl } from "@/modules/documents/service";
import { APPLICATION_STATUS_LABELS } from "@/modules/applications/status";
import { RECORD_STATUS_LABELS, RECORD_VERIFICATION_LABELS, RECORD_SOURCE_LABELS } from "@/modules/records/labels";

export const metadata: Metadata = {
  title: "Record",
};

function getExpiryInfo(expiryDate: Date | null): { daysLeft: number; label: string; urgency: "ok" | "warning" | "danger" | "expired" } | null {
  if (!expiryDate) return null;
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { daysLeft, label: `Expired ${Math.abs(daysLeft)} days ago`, urgency: "expired" };
  if (daysLeft <= 30) return { daysLeft, label: `Expires in ${daysLeft} days`, urgency: "danger" };
  if (daysLeft <= 90) return { daysLeft, label: `Expires in ${daysLeft} days`, urgency: "warning" };
  return { daysLeft, label: `Expires in ${daysLeft} days`, urgency: "ok" };
}

const URGENCY_STYLES = {
  ok: "border-primary/20 bg-primary/5",
  warning: "border-warning/30 bg-warning/5",
  danger: "border-destructive/30 bg-destructive/5",
  expired: "border-destructive/50 bg-destructive/10",
};

const URGENCY_TEXT = {
  ok: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
  expired: "text-destructive",
};

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getRecordById(id);

  const expiryInfo = getExpiryInfo(record.expiryDate);

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

      {/* Phase 6D: Expiry countdown banner */}
      {expiryInfo && expiryInfo.urgency !== "ok" ? (
        <div className={`flex items-start gap-3 rounded-md border px-4 py-3 ${URGENCY_STYLES[expiryInfo.urgency]}`}>
          <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${URGENCY_TEXT[expiryInfo.urgency]}`} aria-hidden="true" />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${URGENCY_TEXT[expiryInfo.urgency]}`}>
              {expiryInfo.label}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {expiryInfo.urgency === "expired"
                ? "This record has expired. Please renew to maintain validity."
                : "Consider renewing before this record expires to avoid service interruption."}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/services/${record.serviceSlug ?? ""}`}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Renew
            </Link>
          </Button>
        </div>
      ) : null}

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
              <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                {record.expiryDate ? record.expiryDate.toLocaleDateString() : "Does not expire"}
                {expiryInfo && expiryInfo.urgency === "ok" ? (
                  <Badge variant="outline">{expiryInfo.label}</Badge>
                ) : null}
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
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {document.fileName} · {(document.sizeBytes / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={signDocumentUrl(document.id)} download={document.fileName}>
                    <Download className="size-4" aria-hidden="true" />
                    Download
                  </a>
                </Button>
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
