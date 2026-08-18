"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, BadgeCheck, Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  identityVerifySchema,
  type IdentityVerifyInput,
} from "@/modules/identity/validators";
import { verifyIdentityAction } from "@/modules/identity/actions";
import { DEMO_IDENTITIES } from "@/modules/identity/providers/demo-identities";
import type { VerifyIdentityResult } from "@/modules/identity/service";

export function IdentityVerificationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [showNin, setShowNin] = React.useState(false);
  const [outcome, setOutcome] = React.useState<VerifyIdentityResult | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<IdentityVerifyInput>({
    resolver: zodResolver(identityVerifySchema),
    defaultValues: { nin: "", consent: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await verifyIdentityAction(values);
      if (!result.ok) {
        if (result.error?.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            setError(field as keyof IdentityVerifyInput, {
              type: "server",
              message,
            });
          }
        } else {
          toast.error(result.error?.message ?? "Unable to verify your identity.");
        }
        return;
      }
      if (result.data) {
        setOutcome(result.data);
        if (result.data.status === "VERIFIED") {
          router.refresh();
        }
      }
    } finally {
      setSubmitting(false);
    }
  });

  if (outcome?.status === "VERIFIED") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-md border border-success/30 bg-success/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">Identity verified</p>
              <p className="text-sm text-muted-foreground">
                {outcome.legalName ?? "Your identity"} ·{" "}
                <span className="font-mono">{outcome.maskedNin ?? "********"}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/profile/identity">View identity details</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {outcome ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning/5 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {outcome.reason ??
              "We could not verify your identity with the details provided."}
          </p>
        </div>
      ) : null}

      <FormField
        label="NIN"
        htmlFor="nin"
        hint="11-digit National Identification Number printed on your NIN slip."
        error={errors.nin?.message}
        required
      >
        <div className="relative">
          <Input
            id="nin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            placeholder="00000000000"
            className="pr-10 font-mono tracking-wider"
            error={!!errors.nin}
            type={showNin ? "text" : "password"}
            {...register("nin")}
          />
          <button
            type="button"
            onClick={() => setShowNin((v) => !v)}
            aria-label={showNin ? "Hide NIN" : "Show NIN"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {showNin ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </FormField>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id="consent"
          aria-invalid={!!errors.consent}
          onCheckedChange={(checked) => setValue("consent", checked === true)}
        />
        <label htmlFor="consent" className="text-sm leading-5 text-muted-foreground">
          I consent to CivicOne checking my NIN against a trusted identity source to
          verify my identity. My NIN is encrypted and never shown in full.{" "}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Read the privacy policy
          </Link>
          .
        </label>
      </div>
      {errors.consent ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {errors.consent.message}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Verifying…
          </>
        ) : (
          <>
            <Fingerprint aria-hidden="true" />
            Verify identity
          </>
        )}
      </Button>

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-warning">
          Demo data
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          This is a demo environment. Use one of these fictional identities to pass
          verification — no real NIN is accepted.
        </p>
        <ul className="mt-3 space-y-2">
          {DEMO_IDENTITIES.map((demo) => (
            <li key={demo.nin}>
              <button
                type="button"
                onClick={() => setValue("nin", demo.nin, { shouldValidate: true })}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="font-medium text-foreground">{demo.legalName}</span>
                <span className="font-mono text-muted-foreground">{demo.nin}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
