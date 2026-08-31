import "server-only";
import { createHmac } from "node:crypto";
import type { DocumentCategory, RecordSource, RecordVerificationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { generateId } from "@/lib/id";
import { timingSafeEqualStrings } from "@/server/crypto";
import { env } from "@/lib/env";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export const DOCUMENT_CATEGORIES: Array<{ value: DocumentCategory; label: string }> = [
  { value: "IDENTITY", label: "Identity" },
  { value: "CERTIFICATES", label: "Certificates" },
  { value: "LICENCES", label: "Licences" },
  { value: "BUSINESS", label: "Business" },
  { value: "TAX", label: "Tax" },
  { value: "EDUCATION", label: "Education" },
  { value: "PROPERTY", label: "Property" },
  { value: "EMPLOYMENT", label: "Employment" },
  { value: "OTHER", label: "Other" },
];

export interface WalletDocumentView {
  id: string;
  category: DocumentCategory;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  issuer: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  verificationStatus: RecordVerificationStatus;
  source: RecordSource;
  createdAt: Date;
}

const viewSelect = {
  id: true,
  category: true,
  name: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  issuer: true,
  issueDate: true,
  expiryDate: true,
  verificationStatus: true,
  source: true,
  createdAt: true,
} as const;

async function currentUser() {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.DOCUMENTS_SELF);
  return user;
}

export async function getWalletDocuments(opts?: {
  category?: string;
  limit?: number;
}): Promise<WalletDocumentView[]> {
  const user = await currentUser();
  const rows = await db.walletDocument.findMany({
    where: { userId: user.id, ...(opts?.category ? { category: opts.category as DocumentCategory } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts?.limit,
    select: viewSelect,
  });
  return rows.map((row) => ({ ...row }));
}

export async function getWalletDocumentCount(): Promise<number> {
  const user = await currentUser();
  return db.walletDocument.count({ where: { userId: user.id } });
}

export async function uploadWalletDocument(input: {
  category: DocumentCategory;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  file: { name: string; type: string; size: number; buffer: Buffer };
}): Promise<WalletDocumentView> {
  const user = await currentUser();
  if (input.file.size <= 0 || input.file.size > MAX_FILE_BYTES) {
    throw new AppError("File must be between 1 byte and 5 MB.", { code: "VALIDATION_ERROR" });
  }
  if (!ALLOWED_MIME.has(input.file.type)) {
    throw new AppError("File type not supported. Use PDF, JPG, PNG or WEBP.", { code: "VALIDATION_ERROR" });
  }
  const parseDate = (v?: string) => (v ? new Date(`${v}T00:00:00.000Z`) : null);
  const doc = await db.walletDocument.create({
    data: {
      id: generateId("wdc"),
      userId: user.id,
      category: input.category,
      name: input.name,
      fileName: input.file.name.slice(0, 255),
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      fileData: input.file.buffer as unknown as Uint8Array<ArrayBuffer>,
      issuer: input.issuer?.trim() ? input.issuer.trim() : null,
      issueDate: parseDate(input.issueDate),
      expiryDate: parseDate(input.expiryDate),
      verificationStatus: "UNVERIFIED",
      source: "USER_PROVIDED",
    },
    select: viewSelect,
  });
  return { ...doc };
}

export async function deleteWalletDocument(id: string): Promise<void> {
  const user = await currentUser();
  const doc = await db.walletDocument.findFirst({ where: { id, userId: user.id } });
  if (!doc) throw new AppError("Document not found.", { code: "NOT_FOUND" });
  await db.walletDocument.delete({ where: { id } });
}

export async function getWalletDocumentBytes(id: string): Promise<{
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileData: Uint8Array<ArrayBuffer>;
}> {
  const user = await currentUser();
  const doc = await db.walletDocument.findFirst({ where: { id, userId: user.id } });
  if (!doc) throw new AppError("Document not found.", { code: "NOT_FOUND" });
  return { fileName: doc.fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, fileData: doc.fileData };
}

function signValue(value: string): string {
  return createHmac("sha256", env.DOCUMENT_SIGNING_SECRET).update(value).digest("hex");
}

export function signDocumentUrl(documentId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + env.DOCUMENT_SIGNED_URL_TTL_SECONDS;
  const sig = signValue(`${documentId}:${exp}`);
  return `/documents/${documentId}/download?exp=${exp}&sig=${sig}`;
}

export function verifyDocumentSignature(
  documentId: string,
  token: string,
  exp: number,
  now = Date.now(),
): boolean {
  if (!token || !Number.isFinite(exp) || exp < Math.floor(now / 1000)) return false;
  const expected = signValue(`${documentId}:${exp}`);
  return timingSafeEqualStrings(expected, token);
}
