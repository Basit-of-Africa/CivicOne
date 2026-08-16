import "server-only";
import { headers } from "next/headers";

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export async function getRequestContext(): Promise<RequestContext> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
  const userAgent = requestHeaders.get("user-agent");
  return { ipAddress, userAgent };
}
