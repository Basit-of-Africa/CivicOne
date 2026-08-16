"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/modules/auth/validators";
import { resetPasswordAction } from "@/modules/auth/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await resetPasswordAction(token, values);
      if (!result.ok) {
        if (result.error?.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof ResetPasswordInput, { message });
          }
        } else {
          setFormError(result.error?.message ?? "Unable to reset your password.");
        }
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  });

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Password updated</h2>
        <p className="text-sm text-muted-foreground">
          Your password has been changed. Sign in with your new password.
        </p>
        <Button asChild className="w-full">
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {formError}
        </div>
      ) : null}

      <FormField label="New password" htmlFor="password" hint="At least 8 characters with a letter and a number." error={errors.password?.message} required>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a new password"
            error={!!errors.password}
            className="pr-10"
            {...register("password")}
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
          placeholder="Re-enter your new password"
          error={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
      </FormField>

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Updating password…
          </>
        ) : (
          "Reset password"
        )}
      </Button>
    </form>
  );
}
