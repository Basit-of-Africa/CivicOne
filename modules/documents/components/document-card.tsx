import Link from "next/link";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { signDocumentUrl, type WalletDocumentView } from "@/modules/documents/service";
import { DOCUMENT_CATEGORY_LABELS } from "@/modules/documents/labels";

export function DocumentCard({ document }: { document: WalletDocumentView }) {
  return (
    <Card className="transition-colors hover:border-foreground/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {DOCUMENT_CATEGORY_LABELS[document.category]}
            </p>
            <h3 className="text-base font-semibold text-foreground">{document.name}</h3>
          </div>
          <Badge variant="outline">
            <FileText className="size-3" aria-hidden="true" />
            {document.mimeType.split("/")[1]?.toUpperCase() ?? "FILE"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {document.fileName} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB
        </p>
        {document.issuer ? <p className="text-xs text-muted-foreground">Issued by {document.issuer}</p> : null}
        {document.expiryDate ? (
          <p className="text-xs text-muted-foreground">Expires {document.expiryDate.toLocaleDateString()}</p>
        ) : null}
        {document.verificationStatus === "GOVERNMENT_VERIFIED" ? (
          <span className="flex items-center gap-1 text-xs font-medium text-secondary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Government verified
          </span>
        ) : null}
        <Link
          href={signDocumentUrl(document.id)}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Download className="size-4" aria-hidden="true" />
          View document
        </Link>
      </CardContent>
    </Card>
  );
}
