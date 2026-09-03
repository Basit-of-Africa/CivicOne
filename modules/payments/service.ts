import "server-only";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { generateId } from "@/lib/id";
import { logAudit } from "@/server/audit";
import { getRequestContext } from "@/server/request";
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { AppError } from "@/server/errors";

/**
 * Phase 6C — Paystack Payment Service
 * Server-side Paystack integration for application fees.
 */

// ---------------------------------------------------------------------------
// Initialize Paystack transaction
// ---------------------------------------------------------------------------

export interface InitializePaymentInput {
  applicationId: string;
  amount: number; // in Naira
  email: string;
  metadata?: Record<string, string>;
}

export interface PaymentInitResult {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
}

export async function initializePayment(
  input: InitializePaymentInput,
): Promise<PaymentInitResult> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.APPLICATIONS_SELF);

  if (!env.PAYSTACK_SECRET_KEY) {
    throw new AppError(
      "Payment is not configured. Please contact support.",
      { code: "INTERNAL" },
    );
  }

  const reference = `CO-${Date.now()}-${generateId("pay").slice(-6)}`;

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amount * 100, // Paystack expects amount in kobo
      reference,
      callback_url: `${env.APP_URL}/api/webhooks/paystack`,
      metadata: {
        application_id: input.applicationId,
        user_id: user.id,
        ...input.metadata,
      },
    }),
  });

  const data = await response.json();

  if (!data.status) {
    throw new AppError(
      data.message ?? "Failed to initialize payment.",
      { code: "INTERNAL" },
    );
  }

  const ctx = await getRequestContext();
  await logAudit({
    actorId: user.id,
    action: "payment.initialized",
    resourceType: "application",
    resourceId: input.applicationId,
    metadata: { reference, amount: input.amount },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
    accessCode: data.data.access_code,
  };
}

// ---------------------------------------------------------------------------
// Verify Paystack transaction
// ---------------------------------------------------------------------------

export interface PaymentVerificationResult {
  status: string;
  reference: string;
  amount: number;
  gatewayResponse: string;
}

export async function verifyPayment(
  reference: string,
): Promise<PaymentVerificationResult> {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new AppError(
      "Payment is not configured.",
      { code: "INTERNAL" },
    );
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      },
    },
  );

  const data = await response.json();

  if (!data.status) {
    throw new AppError(
      data.message ?? "Payment verification failed.",
      { code: "PAYMENT_FAILED" },
    );
  }

  return {
    status: data.data.status,
    reference: data.data.reference,
    amount: data.data.amount / 100, // Convert from kobo to Naira
    gatewayResponse: data.data.gateway_response,
  };
}

// ---------------------------------------------------------------------------
// Handle Paystack webhook
// ---------------------------------------------------------------------------

export async function handlePaystackWebhook(
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (event === "charge.success") {
    const reference = data.reference as string;
    const metadata = data.metadata as Record<string, string> | undefined;
    const applicationId = metadata?.application_id;
    const userId = metadata?.user_id;

    if (applicationId && userId) {
      // Update application status
      await db.application.update({
        where: { id: applicationId },
        data: { status: "SUBMITTED" },
      });

      // Create status history
      await db.applicationStatusHistory.create({
        data: {
          id: generateId("ash"),
          applicationId,
          fromStatus: "PAYMENT_PENDING",
          toStatus: "SUBMITTED",
          reason: `Payment confirmed via Paystack (${reference})`,
          actorUserId: userId,
        },
      });

      await logAudit({
        actorId: userId,
        action: "payment.confirmed",
        resourceType: "application",
        resourceId: applicationId,
        metadata: { reference, event },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Get Paystack public key (for client-side)
// ---------------------------------------------------------------------------

export function getPaystackPublicKey(): string {
  return env.PAYSTACK_PUBLIC_KEY;
}
