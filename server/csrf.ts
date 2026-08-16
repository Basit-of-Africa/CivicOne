import { headers } from "next/headers";
import { AppError } from "@/server/errors";

/**
 * CSRF defence for route handlers and server actions.
 *
 * Next.js ships built-in Origin/Host verification for Server Actions; this
 * helper covers custom route handlers and any future API surface. It rejects
 * cross-origin browser requests while still allowing same-origin callers.
 */
export async function assertSameOrigin(): Promise<void> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");

  // Non-browser clients (CLI, server-to-server) omit Origin — allow.
  if (!origin) return;
  if (!host) {
    throw new AppError("Missing Host header", { code: "FORBIDDEN" });
  }

  try {
    const originUrl = new URL(origin);
    const hostHeader = host.split(":")[0];
    const originHost = originUrl.host.split(":")[0];
    if (originHost !== hostHeader) {
      throw new AppError("Cross-origin request rejected", {
        code: "FORBIDDEN",
      });
    }
  } catch {
    throw new AppError("Invalid Origin header", { code: "FORBIDDEN" });
  }
}
