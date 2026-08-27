import { describe, expect, it } from "vitest";
import type { ApplicationStatus } from "@prisma/client";
import { getMockProvider } from "@/modules/applications/providers";

const ctx = {
  reference: "CO-2026-000001",
  providerRef: null as string | null,
  status: "SUBMITTED" as const,
};

describe("mock providers", () => {
  it("exposes all three demo providers", () => {
    expect(getMockProvider("MOCK_CAC").id).toBe("MOCK_CAC");
    expect(getMockProvider("MOCK_PASSPORT").id).toBe("MOCK_PASSPORT");
    expect(getMockProvider("MOCK_DRIVER_LICENCE").id).toBe("MOCK_DRIVER_LICENCE");
  });

  it("throws for unknown providers", () => {
    expect(() => getMockProvider("NOPE" as never)).toThrow();
  });

  it("submits and returns a provider reference", async () => {
    const cac = getMockProvider("MOCK_CAC");
    const result = await cac.submit(ctx);
    expect(result.providerRef).toMatch(/^CAC-/);
  });

  it("progresses CAC through review to approval", async () => {
    const cac = getMockProvider("MOCK_CAC");
    let status: ApplicationStatus = "SUBMITTED";
    const outcomes: string[] = [];
    while (status !== "APPROVED" && status !== "REJECTED") {
      const next = await cac.advance({ ...ctx, providerRef: "CAC-x", status });
      status = next.status;
      outcomes.push(status);
    }
    expect(outcomes).toContain("UNDER_REVIEW");
    expect(outcomes[outcomes.length - 1]).toBe("APPROVED");
  });

  it("can force a rejection outcome", async () => {
    const cac = getMockProvider("MOCK_CAC");
    const next = await cac.advance(
      { ...ctx, providerRef: "CAC-x", status: "UNDER_REVIEW" as const },
      { forceOutcome: "REJECTED" },
    );
    expect(next.status).toBe("REJECTED");
  });
});
