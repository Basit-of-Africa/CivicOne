import { env } from "@/lib/env";

/**
 * In-memory sliding-window rate limiter.
 *
 * Used to throttle sensitive actions: login, registration, password reset,
 * email verification. Suitable for single-instance deployments; swap for a
 * shared store (Redis) when horizontal scaling is introduced.
 *
 * All rate-limiting concerns stay behind this abstraction so the backend
 * can be replaced without touching callers.
 */

interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

const buckets = new Map<string, number[]>();

function prune(key: string, windowMs: number, now: number) {
  const timestamps = buckets.get(key);
  if (!timestamps) return;
  const within = timestamps.filter((t) => now - t < windowMs);
  if (within.length === 0) {
    buckets.delete(key);
  } else {
    buckets.set(key, within);
  }
}

export function getRateLimitState(
  key: string,
  windowMs = env.RATE_LIMIT_WINDOW_MS,
): number {
  const now = Date.now();
  const timestamps = buckets.get(key) ?? [];
  return timestamps.filter((t) => now - t < windowMs).length;
}

export async function rateLimit(
  key: string,
  options: { max?: number; windowMs?: number } = {},
): Promise<RateLimitResult> {
  if (!env.RATE_LIMIT_ENABLED) return { ok: true };

  const max = options.max ?? env.RATE_LIMIT_MAX_ATTEMPTS;
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const now = Date.now();

  const timestamps = buckets.get(key) ?? [];
  const within = timestamps.filter((t) => now - t < windowMs);

  if (within.length >= max) {
    const oldest = within[0] ?? now;
    return { ok: false, retryAfterMs: Math.max(1, windowMs - (now - oldest)) };
  }

  within.push(now);
  buckets.set(key, within);

  // Opportunistic cleanup to keep memory bounded.
  if (buckets.size > 10_000) {
    for (const [bucketKey] of buckets) {
      prune(bucketKey, windowMs, now);
    }
  }

  return { ok: true };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
