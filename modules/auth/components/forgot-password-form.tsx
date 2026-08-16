"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/modules/auth/validators";
import { requestPasswordResetAction } from "@/modules/auth/actions";

export function ForgotPasswordForm() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordResetAction(values);
      if (!result.ok) {
        if (result.error?.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof ForgotPasswordInput, { message });
          }
        } else {
          setFormError(result.error?.message ?? "Unable to process your request.");
        }
        return;
      }
      setSentTo(values.identifier);
    } finally {
      setSubmitting(false);
    }
  });

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <MailCheck className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Check your inbox</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we&apos;ve
          sent a password reset link. It expires in one hour.
        </p>
        <p className="text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => setSentTo(null)}
          >
            try again
          </button>
          .
        </p>
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

      <FormField
        label="Email address"
        htmlFor="identifier"
        hint="We'll email you a secure link to reset your password."
        error={errors.identifier?.message}
        required
      >
        <Input
          id="identifier"
          autoComplete="username"
          type="email"
          placeholder="you@example.com"
          error={!!errors.identifier}
          {...register("identifier")}
        />
      </FormField>

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Sending link…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
