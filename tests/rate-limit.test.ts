import { describe, expect, it } from "vitest";
import { getRateLimitState, rateLimit, resetRateLimit } from "@/server/rate-limit";

describe("rate limiter", () => {
  it("allows requests under the limit", async () => {
    resetRateLimit("test:under");
    for (let i = 0; i < 5; i++) {
      expect((await rateLimit("test:under", { max: 5, windowMs: 1000 })).ok).toBe(
        true,
      );
    }
  });

  it("blocks requests over the limit", async () => {
    resetRateLimit("test:over");
    for (let i = 0; i < 5; i++) {
      await rateLimit("test:over", { max: 5, windowMs: 1000 });
    }
    const blocked = await rateLimit("test:over", { max: 5, windowMs: 1000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates keys from each other", async () => {
    resetRateLimit("test:a");
    resetRateLimit("test:b");
    for (let i = 0; i < 5; i++) {
      await rateLimit("test:a", { max: 5, windowMs: 1000 });
    }
    expect((await rateLimit("test:a", { max: 5, windowMs: 1000 })).ok).toBe(false);
    expect((await rateLimit("test:b", { max: 5, windowMs: 1000 })).ok).toBe(true);
  });

  it("tracks the current attempt count", async () => {
    resetRateLimit("test:count");
    await rateLimit("test:count", { max: 5, windowMs: 1000 });
    await rateLimit("test:count", { max: 5, windowMs: 1000 });
    expect(getRateLimitState("test:count", 1000)).toBe(2);
  });

  it("expires entries after the window", async () => {
    resetRateLimit("test:expire");
    await rateLimit("test:expire", { max: 1, windowMs: 10 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect((await rateLimit("test:expire", { max: 1, windowMs: 10 })).ok).toBe(true);
  });
});
