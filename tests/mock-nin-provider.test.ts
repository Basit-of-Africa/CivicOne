import { describe, expect, it } from "vitest";
import {
  DEMO_IDENTITIES,
  DEMO_REVIEW_NIN,
  DEMO_UNAVAILABLE_NIN,
  MockNINVerificationProvider,
} from "@/modules/identity/providers";

describe("MockNINVerificationProvider", () => {
  it("succeeds only for seeded demo identities", async () => {
    for (const demo of DEMO_IDENTITIES) {
      const result = await MockNINVerificationProvider.verifyIdentity({
        nin: demo.nin,
      });
      expect(result.result).toBe("SUCCESS");
      if (result.result === "SUCCESS") {
        expect(result.identity.legalName).toBe(demo.legalName);
        expect(result.identity.stateOfOrigin).toBe(demo.stateOfOrigin);
        expect(result.identity.lga).toBe(demo.lga);
        expect(result.identity.nationality).toBe("Nigerian");
      }
    }
  });

  it("never accepts an arbitrary real-looking NIN", async () => {
    const candidates = ["98765432109", "11223344556", "00000000007", "00000000008"];
    for (const nin of candidates) {
      const result = await MockNINVerificationProvider.verifyIdentity({ nin });
      expect(result.result).toBe("FAILED");
      if (result.result === "FAILED") {
        expect(result.reasonCode).toBe("IDENTITY_NOT_FOUND");
      }
    }
  });

  it("returns REQUIRES_REVIEW for the reserved review NIN", async () => {
    const result = await MockNINVerificationProvider.verifyIdentity({
      nin: DEMO_REVIEW_NIN,
    });
    expect(result.result).toBe("REQUIRES_REVIEW");
  });

  it("returns UNAVAILABLE for the reserved unavailable NIN", async () => {
    const result = await MockNINVerificationProvider.verifyIdentity({
      nin: DEMO_UNAVAILABLE_NIN,
    });
    expect(result.result).toBe("UNAVAILABLE");
  });

  it("exposes a stable code and the mock flag", () => {
    expect(MockNINVerificationProvider.code).toBe("MOCK_NIN");
    expect(MockNINVerificationProvider.isMock).toBe(true);
  });

  it("resolves the adapter by code", async () => {
    const { getProviderAdapter } = await import("@/modules/identity/providers");
    expect(getProviderAdapter("MOCK_NIN")).toBe(MockNINVerificationProvider);
    expect(getProviderAdapter("NIMC")).toBeNull();
  });
});
