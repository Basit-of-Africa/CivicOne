"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { registerSchema, type RegisterInput } from "@/modules/auth/validators";
import { registerAction } from "@/modules/auth/actions";

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      identifier: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
    },
  });

  const agreeTerms = watch("agreeTerms");

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await registerAction(values);
      if (!result.ok) {
        if (result.error?.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof RegisterInput, { message });
          }
        } else {
          setFormError(result.error?.message ?? "Unable to create your account.");
        }
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  });

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
        label="Email address or phone number"
        htmlFor="identifier"
        hint="You can register with either — you'll sign in with the same one."
        error={errors.identifier?.message}
        required
      >
        <Input
          id="identifier"
          autoComplete="username"
          placeholder="you@example.com or +234 800 000 0000"
          error={!!errors.identifier}
          {...register("identifier")}
        />
      </FormField>

      <FormField label="Password" htmlFor="password" hint="At least 8 characters with a letter and a number." error={errors.password?.message} required>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a strong password"
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

      <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          error={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
      </FormField>

      <div className="flex items-start gap-2.5 pt-1">
        <Checkbox
          id="agreeTerms"
          checked={agreeTerms}
          onCheckedChange={(checked) => setValue("agreeTerms", checked === true)}
          aria-describedby="agreeTerms-error"
        />
        <label
          htmlFor="agreeTerms"
          className="text-sm leading-snug text-muted-foreground"
        >
          I agree to the{" "}
          <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>.
        </label>
      </div>
      {errors.agreeTerms ? (
        <p id="agreeTerms-error" className="text-xs font-medium text-destructive" role="alert">
          {errors.agreeTerms.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Creating your account…
          </>
        ) : (
          "Create your CivicOne account"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
