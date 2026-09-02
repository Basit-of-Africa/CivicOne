"use server";

import { fail, toFieldErrors, validationError, withActionResult } from "@/server/errors";
import {
  deleteWalletDocument,
  uploadWalletDocument,
} from "./service";
import { walletDocumentIdSchema, walletDocumentUploadSchema } from "./validators";

export async function uploadWalletDocumentAction(input: {
  category: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  file: File;
}) {
  const parsed = walletDocumentUploadSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  const buffer = Buffer.from(await input.file.arrayBuffer());
  return withActionResult(() =>
    uploadWalletDocument({
      category: parsed.data.category,
      name: parsed.data.name,
      issuer: parsed.data.issuer,
      issueDate: parsed.data.issueDate,
      expiryDate: parsed.data.expiryDate,
      file: { name: input.file.name, type: input.file.type, size: input.file.size, buffer },
    }),
  );
}

export async function deleteWalletDocumentAction(input: { documentId: string }) {
  const parsed = walletDocumentIdSchema.safeParse(input);
  if (!parsed.success) return fail(validationError(toFieldErrors(parsed.error)));
  return withActionResult(() => deleteWalletDocument(parsed.data.documentId));
}
