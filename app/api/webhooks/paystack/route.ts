import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handlePaystackWebhook } from "@/modules/payments/service";
import { env } from "@/lib/env";

/**
 * Phase 6C — Paystack Webhook Handler
 * Receives payment confirmation events from Paystack.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // Verify webhook signature
    if (env.PAYSTACK_WEBHOOK_SECRET && signature) {
      const hash = crypto
        .createHmac("sha512", env.PAYSTACK_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");

      if (hash !== signature) {
        console.error("Invalid Paystack webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(body);

    // Handle the event
    await handlePaystackWebhook(event.event, event.data);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
