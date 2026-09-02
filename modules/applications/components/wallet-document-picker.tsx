"use client";

import * as React from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reuseWalletDocumentAction } from "@/modules/applications/actions";
import type { WalletDocumentView } from "@/modules/documents/service";

export function WalletDocumentPicker({
  applicationId,
  formKey,
  fieldKey,
  label,
  walletDocuments,
  onUsed,
}: {
  applicationId: string;
  formKey: string;
  fieldKey: string;
  label: string;
  walletDocuments: WalletDocumentView[];
  onUsed: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string>("");

  if (walletDocuments.length === 0) return null;

  async function applyDocument() {
    if (!selected) return;
    setPending(true);
    setError(null);
    const result = await reuseWalletDocumentAction({
      applicationId,
      formKey,
      fieldKey,
      label,
      walletDocumentId: selected,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Could not use the wallet document.");
      return;
    }
    onUsed();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Choose a wallet document" />
          </SelectTrigger>
          <SelectContent>
            {walletDocuments.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void applyDocument()} disabled={pending || !selected}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FolderOpen className="size-4" aria-hidden="true" />}
          Use document
        </Button>
      </div>
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
