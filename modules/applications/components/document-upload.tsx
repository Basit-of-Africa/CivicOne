"use client";

import * as React from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocumentAction, removeDocumentAction } from "@/modules/applications/actions";
import type { WalletDocumentView } from "@/modules/documents/service";
import { WalletDocumentPicker } from "./wallet-document-picker";

export interface DocumentItem {
  id: string;
  label: string;
  fileName: string;
  sizeBytes: number;
}

export function DocumentUpload({
  applicationId,
  formKey,
  fieldKey,
  label,
  accept,
  documents,
  attached,
  onChanged,
  walletDocuments,
}: {
  applicationId: string;
  formKey: string;
  fieldKey: string;
  label: string;
  accept?: string;
  documents: DocumentItem[];
  attached: string | null;
  onChanged: () => void;
  walletDocuments?: WalletDocumentView[];
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const attachedDoc = documents.find((d) => d.id === attached) ?? null;

  async function handleFile(file: File) {
    setPending(true);
    setError(null);
    try {
      const result = await uploadDocumentAction({
        applicationId,
        formKey,
        fieldKey,
        label,
        file,
      });
      if (!result.ok) {
        setError(result.error?.message ?? "Upload failed.");
        return;
      }
      onChanged();
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (!attachedDoc) return;
    setPending(true);
    try {
      const result = await removeDocumentAction({ applicationId, documentId: attachedDoc.id });
      if (!result.ok) setError(result.error?.message ?? "Could not remove the document.");
      onChanged();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {attachedDoc ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{attachedDoc.fileName}</p>
            <p className="text-xs text-muted-foreground">{Math.max(1, Math.round(attachedDoc.sizeBytes / 1024))} KB</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRemove} disabled={pending} aria-label="Remove document">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}
              Upload
            </Button>
            {walletDocuments && walletDocuments.length > 0 ? (
              <p className="text-xs font-medium text-secondary">
                Use document from your CivicOne Wallet
              </p>
            ) : null}
          </div>
          <WalletDocumentPicker
            applicationId={applicationId}
            formKey={formKey}
            fieldKey={fieldKey}
            label={label}
            walletDocuments={walletDocuments ?? []}
            onUsed={onChanged}
          />
        </div>
      )}
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
