"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { toast } from "@/components/ui/toast";
import {
  updatePersonalInfoSchema,
  type UpdatePersonalInfoInput,
} from "@/modules/users/validators";
import { updatePersonalInfoAction } from "@/modules/users/actions";

export interface PersonalInfoFormProps {
  initial: {
    title: string | null;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
  };
}

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PersonalInfoForm({ initial }: PersonalInfoFormProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdatePersonalInfoInput>({
    resolver: zodResolver(updatePersonalInfoSchema),
    defaultValues: {
      title: initial.title ?? "",
      firstName: initial.firstName ?? "",
      lastName: initial.lastName ?? "",
      middleName: initial.middleName ?? "",
      dateOfBirth: initial.dateOfBirth ? toDateInputValue(new Date(initial.dateOfBirth)) : "",
      gender: (initial.gender as UpdatePersonalInfoInput["gender"]) ?? null,
    },
  });

  const gender = watch("gender");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await updatePersonalInfoAction({
        ...values,
        title: values.title || null,
        middleName: values.middleName || null,
        dateOfBirth: values.dateOfBirth || null,
        gender: values.gender || null,
      });
      if (!result.ok) {
        if (result.error?.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof UpdatePersonalInfoInput, { message });
          }
        } else {
          toast.error(result.error?.message ?? "Unable to save your changes.");
        }
        return;
      }
      toast.success("Personal information saved.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" htmlFor="firstName" error={errors.firstName?.message} required>
          <Input id="firstName" autoComplete="given-name" error={!!errors.firstName} {...register("firstName")} />
        </FormField>
        <FormField label="Last name" htmlFor="lastName" error={errors.lastName?.message} required>
          <Input id="lastName" autoComplete="family-name" error={!!errors.lastName} {...register("lastName")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Middle name" htmlFor="middleName" error={errors.middleName?.message}>
          <Input id="middleName" autoComplete="additional-name" error={!!errors.middleName} {...register("middleName")} />
        </FormField>
        <FormField label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" placeholder="e.g. Dr, Mr, Mrs, Alhaji" error={!!errors.title} {...register("title")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
          <Input id="dateOfBirth" type="date" error={!!errors.dateOfBirth} {...register("dateOfBirth")} />
        </FormField>
      </div>

      <FormField label="Gender" htmlFor="gender" error={errors.gender?.message}>
        <RadioGroup
          id="gender"
          value={gender ?? undefined}
          onValueChange={(value) =>
            setValue("gender", value as UpdatePersonalInfoInput["gender"])
          }
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          <label className="flex items-center gap-2 text-sm text-foreground">
            <RadioGroupItem value="MALE" />
            Male
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <RadioGroupItem value="FEMALE" />
            Female
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <RadioGroupItem value="PREFER_NOT_TO_SAY" />
            Prefer not to say
          </label>
        </RadioGroup>
      </FormField>

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
