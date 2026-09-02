import type { DocumentCategory } from "@prisma/client";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  IDENTITY: "Identity",
  CERTIFICATES: "Certificates",
  LICENCES: "Licences",
  BUSINESS: "Business",
  TAX: "Tax",
  EDUCATION: "Education",
  PROPERTY: "Property",
  EMPLOYMENT: "Employment",
  OTHER: "Other",
};

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
