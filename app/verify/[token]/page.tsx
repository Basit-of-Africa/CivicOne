import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, FileText, Calendar, Building2, ExternalLink, ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { verifyVerificationToken } from "@/modules/records/qr-verification";
import { RECORD_STATUS_LABELS, RECORD_VERIFICATION_LABELS } from "@/modules/records/labels";

export const metadata: Metadata = {
  title: "Verify Certificate — CivicOne Nigeria",
};

interface VerificationResult {
  valid: boolean;
  record?: {
    id: string;
    recordType: string;
    status: string;
    verificationStatus: string;
    issueDate: Date | null;
    expiryDate: Date | null;
    providerName: string;
    holderName: string;
    applicationReference: string | null;
  };
  error?: string;
}

async function verifyCertificate(token: string): Promise<VerificationResult> {
  const payload = verifyVerificationToken(token);
  if (!payload) {
    return { valid: false, error: "Invalid or tampered verification token." };
  }

  const record = await db.governmentServiceRecord.findUnique({
    where: { id: payload.r },
    include: {
      provider: { select: { name: true } },
      application: { select: { reference: true } },
    },
  });

  if (!record) {
    return { valid: false, error: "Record not found. This certificate may have been revoked." };
  }

  // Verify the document ID matches
  const document = await db.walletDocument.findUnique({
    where: { id: payload.d },
    select: { id: true, recordId: true },
  });

  if (!document || document.recordId !== record.id) {
    return { valid: false, error: "Certificate document mismatch. This may be a forged document." };
  }

  // Look up the holder's name from the identity profile
  const profile = await db.identityProfile.findUnique({
    where: { userId: record.userId },
    select: { legalName: true },
  });

  return {
    valid: true,
    record: {
      id: record.id,
      recordType: record.recordType,
      status: record.status,
      verificationStatus: record.verificationStatus,
      issueDate: record.issueDate,
      expiryDate: record.expiryDate,
      providerName: record.provider.name,
      holderName: profile?.legalName ?? "—",
      applicationReference: record.application?.reference ?? null,
    },
  };
}

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await verifyCertificate(token);

  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="size-4" aria-hidden="true" />
            CivicOne Nigeria
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Certificate Verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan or enter a verification code to check certificate authenticity.
          </p>
        </div>

        {/* Result Card */}
        {result.valid && result.record ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Verified Certificate</p>
                <p className="text-xs text-muted-foreground">This certificate was issued by CivicOne Nigeria</p>
              </div>
            </div>

            <dl className="space-y-3 rounded-md bg-card border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Certificate type</dt>
                <dd className="text-sm font-medium text-foreground text-right">{result.record.recordType}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Building2 className="size-3" aria-hidden="true" /> Issued by
                </dt>
                <dd className="text-sm font-medium text-foreground text-right">{result.record.providerName}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Holder</dt>
                <dd className="text-sm font-medium text-foreground text-right">{result.record.holderName}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" aria-hidden="true" /> Issue date
                </dt>
                <dd className="text-sm font-medium text-foreground text-right">
                  {result.record.issueDate ? result.record.issueDate.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                </dd>
              </div>
              {result.record.expiryDate ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expiry date</dt>
                  <dd className="text-sm font-medium text-foreground text-right">
                    {result.record.expiryDate.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
                <dd className="text-sm font-medium text-foreground text-right">{RECORD_STATUS_LABELS[result.record.status as keyof typeof RECORD_STATUS_LABELS] ?? result.record.status}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verification</dt>
                <dd className="text-sm font-medium text-foreground text-right">
                  {RECORD_VERIFICATION_LABELS[result.record.verificationStatus as keyof typeof RECORD_VERIFICATION_LABELS] ?? result.record.verificationStatus}
                </dd>
              </div>
              {result.record.applicationReference ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <FileText className="size-3" aria-hidden="true" /> Application ref
                  </dt>
                  <dd className="text-sm font-medium text-foreground text-right">{result.record.applicationReference}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="size-5 text-destructive" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">Verification Failed</p>
                <p className="text-xs text-muted-foreground">{result.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            This verification is provided by <span className="font-medium text-foreground">CivicOne Nigeria</span> — a private-sector service orchestration platform.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This is not an official government document.{" "}
            <a href="https://civicone.ng/about" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
              Learn more <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
