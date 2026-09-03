"use server";

import { withActionResult } from "@/server/errors";
import { initializePayment } from "./service";

export async function initializePaymentAction(input: {
  applicationId: string;
  amount: number;
  email: string;
}) {
  return withActionResult(() =>
    initializePayment(input),
  );
}
