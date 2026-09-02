"use client";

import * as React from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadWalletDocumentAction } from "@/modules/documents/actions";
import { DOCUMENT_CATEGORIES } from "@/modules/documents/labels";

export function UploadDocumentForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState("OTHER");
  const [name, setName] = React.useState("");
  const [issuer, setIssuer] = React.useState("");
  const [issueDate, setIssueDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);

  async function submit() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await uploadWalletDocumentAction({
      category,
      name,
      issuer,
      issueDate,
      expiryDate,
      file,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Upload failed.");
      return;
    }
    router.push("/documents");
    router.refresh();
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <FormField label="Category" htmlFor="category" required>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Document name" htmlFor="name" required>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Degree certificate" />
      </FormField>

      <FormField label="File" htmlFor="file" required hint="PDF, JPG, PNG or WEBP — up to 5 MB.">
        <input
          ref={inputRef}
          id="file"
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? <p className="mt-1 text-xs text-muted-foreground">{file.name} · {Math.max(1, Math.round(file.size / 1024))} KB</p> : null}
      </FormField>

      <FormField label="Issuer" htmlFor="issuer" hint="Optional — e.g. University of Lagos.">
        <Input id="issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Issue date" htmlFor="issueDate">
          <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </FormField>
        <FormField label="Expiry date" htmlFor="expiryDate">
          <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </FormField>
      </div>

      {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !file}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}
          Upload document
        </Button>
      </div>
    </form>
  );
}
