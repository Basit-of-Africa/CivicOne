"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { toast } from "@/components/ui/toast";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/modules/users/validators";
import { changePasswordAction } from "@/modules/users/actions";

export function ChangePasswordForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await changePasswordAction(values);
      if (!result.ok) {
        if (result.error?.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof ChangePasswordInput, { message });
          }
        } else {
          toast.error(result.error?.message ?? "Unable to change your password.");
        }
        return;
      }
      reset();
      toast.success("Password changed. Other sessions have been signed out.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message} required>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          error={!!errors.currentPassword}
          {...register("currentPassword")}
        />
      </FormField>

      <FormField label="New password" htmlFor="newPassword" hint="At least 8 characters with a letter and a number." error={errors.newPassword?.message} required>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            error={!!errors.newPassword}
            className="pr-10"
            {...register("newPassword")}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </FormField>

      <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          error={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
      </FormField>

      <p className="text-xs text-muted-foreground">
        Changing your password signs out every other device where you&apos;re signed in.
      </p>

      <div className="pt-1">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Changing…
            </>
          ) : (
            "Change password"
          )}
        </Button>
      </div>
    </form>
  );
}
