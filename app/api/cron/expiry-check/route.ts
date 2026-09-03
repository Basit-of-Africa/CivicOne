import { NextResponse } from "next/server";
import { checkExpiringRecords } from "@/modules/records/expiry";

/**
 * Vercel Cron Job — runs daily at 2 AM.
 * Checks for records expiring within 90/30/7 days and creates notifications.
 *
 * Vercel cron requests include the `CRON_SECRET` header for authentication.
 * See: https://vercel.com/docs/cron-jobs
 */
export async function GET(request: Request) {
  // Verify the request came from Vercel's cron system
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await checkExpiringRecords();
    return NextResponse.json({ ok: true, notificationsCreated: count });
  } catch (error) {
    console.error("[cron/expiry-check] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
