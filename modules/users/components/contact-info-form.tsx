"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { toast } from "@/components/ui/toast";
import {
  updateContactSchema,
  type UpdateContactInput,
} from "@/modules/users/validators";
import { updateContactAction } from "@/modules/users/actions";

export interface ContactInfoFormProps {
  initial: {
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
}

export function ContactInfoForm({ initial }: ContactInfoFormProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<UpdateContactInput>({
    resolver: zodResolver(updateContactSchema),
    defaultValues: {
      email: initial.email ?? "",
      phone: initial.phone ?? "",
      address: initial.address ?? "",
      city: initial.city ?? "",
      state: initial.state ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await updateContactAction({
        ...values,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
      });
      if (!result.ok) {
        if (result.error?.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof UpdateContactInput, { message });
          }
        } else {
          toast.error(result.error?.message ?? "Unable to save your changes.");
        }
        return;
      }
      toast.success("Contact information saved.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Email address"
          htmlFor="email"
          error={errors.email?.message}
        >
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" error={!!errors.email} {...register("email")} />
        </FormField>
        <FormField label="Phone number" htmlFor="phone" hint="e.g. +234 800 000 0000" error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+234 800 000 0000" error={!!errors.phone} {...register("phone")} />
        </FormField>
      </div>

      <FormField label="Street address" htmlFor="address" error={errors.address?.message}>
        <Input id="address" autoComplete="street-address" placeholder="Street, area" error={!!errors.address} {...register("address")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="City" htmlFor="city" error={errors.city?.message}>
          <Input id="city" autoComplete="address-level2" placeholder="Lagos" error={!!errors.city} {...register("city")} />
        </FormField>
        <FormField label="State" htmlFor="state" error={errors.state?.message}>
          <Input id="state" autoComplete="address-level1" placeholder="Lagos State" error={!!errors.state} {...register("state")} />
        </FormField>
      </div>

      <p className="text-xs text-muted-foreground">
        If you change your email address, you&apos;ll need to verify the new address before it can be used to recover your account.
      </p>

      <div className="pt-1">
        <Button type="submit" disabled={submitting || !isDirty}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
