import { z } from "zod";

export const FIELD_TYPES = [
  "text", "textarea", "number", "date", "select", "radio",
  "checkbox", "multi-select", "phone", "email", "address",
  "file", "existing-document",
] as const;
export type FormFieldType = (typeof FIELD_TYPES)[number];

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: FormFieldOption[];
  identityField?: "legalName" | "dateOfBirth" | "nationality" | "gender";
  maxLength?: number;
  min?: number;
  max?: number;
  accept?: string;
}

export interface FormDefinition {
  key: string;
  name: string;
  fields: FormField[];
}

export interface VerifiedIdentity {
  legalName: string;
  dateOfBirth: string;
  nationality: string;
  gender: string;
}

function fieldBaseSchema(field: FormField): z.ZodTypeAny {
  switch (field.type) {
    case "number": {
      let s = z.coerce.number({ message: "Enter a valid number" });
      if (field.min !== undefined) s = s.min(field.min, `Must be at least ${field.min}`);
      if (field.max !== undefined) s = s.max(field.max, `Must be at most ${field.max}`);
      return s;
    }
    case "date":
      return z.string().refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: "Enter a valid date",
      });
    case "email":
      return z.string().email("Enter a valid email address");
    case "phone":
      return z.string().regex(/^\+?[0-9\s()-]{7,15}$/, "Enter a valid phone number");
    case "checkbox":
      return z.boolean();
    case "multi-select":
      return z.array(z.string());
    case "select":
    case "radio":
      return z.string();
    case "file":
    case "existing-document":
      return z.string();
    default:
      return z.string();
  }
}

function buildFieldSchema(field: FormField): z.ZodTypeAny {
  const required = field.required ?? false;
  let base = fieldBaseSchema(field);

  if (field.type === "checkbox" && required) {
    base = z.boolean().refine((v) => v === true, "You must confirm this");
  }
  if (field.type === "multi-select" && required) {
    base = z.array(z.string()).min(1, "Select at least one option");
  }
  if (
    required &&
    (field.type === "text" || field.type === "textarea" || field.type === "address" ||
     field.type === "select" || field.type === "radio" || field.type === "file" ||
     field.type === "existing-document" || field.type === "phone" || field.type === "email")
  ) {
    base = (base as z.ZodString).min(1, "This field is required");
  }
  if (field.maxLength && (base as z.ZodString).min) {
    base = (base as z.ZodString).max(field.maxLength, `Must be ${field.maxLength} characters or fewer`);
  }

  if (!required) {
    if (field.type === "checkbox") {
      base = base.optional();
    } else {
      base = base.optional().or(z.literal(""));
    }
  }

  return base;
}

export function buildFormSchema(definition: FormDefinition): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of definition.fields) {
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}

export function buildIdentityPrefill(
  fields: FormField[],
  identity: VerifiedIdentity | null,
): Record<string, string> {
  const prefill: Record<string, string> = {};
  if (!identity) return prefill;
  for (const field of fields) {
    if (field.identityField && identity[field.identityField]) {
      prefill[field.key] = identity[field.identityField];
    }
  }
  return prefill;
}

export function applyIdentityAnswers(
  fields: FormField[],
  values: Record<string, unknown>,
  identity: VerifiedIdentity | null,
): Record<string, unknown> {
  const out = { ...values };
  if (!identity) return out;
  for (const field of fields) {
    if (field.identityField && identity[field.identityField]) {
      out[field.key] = identity[field.identityField];
    }
  }
  return out;
}
