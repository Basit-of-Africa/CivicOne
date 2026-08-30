"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormField } from "@/components/ui/form-field";
import {
  buildFormSchema,
  buildIdentityPrefill,
  type FormDefinition,
  type VerifiedIdentity,
} from "@/modules/applications/form-config";
import { saveAnswersAction } from "@/modules/applications/actions";
import { DocumentUpload, type DocumentItem } from "./document-upload";

export function DynamicForm({
  applicationId,
  definition,
  values,
  identity,
  documents,
  onSaved,
}: {
  applicationId: string;
  definition: FormDefinition;
  values: Record<string, unknown>;
  identity: VerifiedIdentity | null;
  documents: DocumentItem[];
  onSaved: () => void;
}) {
  const schema = React.useMemo(() => buildFormSchema(definition), [definition]);
  const prefill = React.useMemo(
    () => buildIdentityPrefill(definition.fields, identity),
    [definition, identity],
  );
  const defaultValues = React.useMemo(
    () => ({ ...values, ...prefill }),
    [values, prefill],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(data: Record<string, unknown>) {
    setError(null);
    const result = await saveAnswersAction({ applicationId, formKey: definition.key, values: data });
    if (!result.ok) {
      setError(result.error?.message ?? "Could not save your answers.");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit((data) => void onSubmit(data as Record<string, unknown>))} className="space-y-5" noValidate>
      {definition.fields.map((field) => {
        const isVerified = Boolean(field.identityField && prefill[field.key]);
        const registered = register(field.key);
        const error = errors[field.key]?.message as string | undefined;

        if (field.type === "file" || field.type === "existing-document") {
          const value = watch(field.key) as string | null | undefined;
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <DocumentUpload
                applicationId={applicationId}
                formKey={definition.key}
                fieldKey={field.key}
                label={field.label}
                accept={field.accept}
                documents={documents}
                attached={value ?? null}
                onChanged={() => setValue(field.key, watch(field.key) as string, { shouldValidate: true })}
              />
            </FormField>
          );
        }

        if (field.type === "textarea" || field.type === "address") {
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <div className={isVerified ? "pointer-events-none opacity-80" : ""}>
                <Textarea id={`field-${field.key}`} rows={3} {...registered} disabled={isVerified} aria-invalid={Boolean(error)} />
              </div>
              {isVerified ? <VerifiedHint /> : null}
            </FormField>
          );
        }

        if (field.type === "select") {
          const current = (watch(field.key) as string) ?? "";
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <div className={isVerified ? "pointer-events-none opacity-80" : ""}>
                <Select value={current} onValueChange={(v) => setValue(field.key, v)} disabled={isVerified}>
                  <SelectTrigger id={`field-${field.key}`} className="w-full" aria-invalid={Boolean(error)}>
                    <SelectValue placeholder={field.placeholder ?? "Select an option"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isVerified ? <VerifiedHint /> : null}
            </FormField>
          );
        }

        if (field.type === "radio") {
          const current = (watch(field.key) as string) ?? "";
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <div className={isVerified ? "pointer-events-none opacity-80" : ""}>
                <RadioGroup value={current} onValueChange={(v) => setValue(field.key, v)} disabled={isVerified}>
                  {(field.options ?? []).map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem id={`field-${field.key}-${option.value}`} value={option.value} />
                      <label htmlFor={`field-${field.key}-${option.value}`} className="text-sm text-foreground">{option.label}</label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {isVerified ? <VerifiedHint /> : null}
            </FormField>
          );
        }

        if (field.type === "checkbox") {
          const current = Boolean(watch(field.key));
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <Checkbox id={`field-${field.key}`} checked={current} onCheckedChange={(v) => setValue(field.key, v === true)} disabled={isVerified} />
            </FormField>
          );
        }

        if (field.type === "multi-select") {
          const current = (watch(field.key) as string[] | undefined) ?? [];
          return (
            <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
              <div className="space-y-2">
                {(field.options ?? []).map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`field-${field.key}-${option.value}`}
                      checked={current.includes(option.value)}
                      onCheckedChange={(checked) => {
                        const next = checked ? [...current, option.value] : current.filter((v) => v !== option.value);
                        setValue(field.key, next);
                      }}
                    />
                    <label htmlFor={`field-${field.key}-${option.value}`} className="text-sm text-foreground">{option.label}</label>
                  </div>
                ))}
              </div>
            </FormField>
          );
        }

        return (
          <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`} error={error} required={field.required} hint={field.hint}>
            <div className={isVerified ? "pointer-events-none opacity-80" : ""}>
              <Input
                id={`field-${field.key}`}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                placeholder={field.placeholder}
                disabled={isVerified}
                {...registered}
                aria-invalid={Boolean(error)}
              />
            </div>
            {isVerified ? <VerifiedHint /> : null}
          </FormField>
        );
      })}

      {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Save & continue
        </Button>
      </div>
    </form>
  );
}

function VerifiedHint() {
  return (
    <p className="flex items-center gap-1 text-xs font-medium text-secondary">
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      Verified identity information
    </p>
  );
}
