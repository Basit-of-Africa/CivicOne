import { generateId } from "@/lib/id";
import {
  DEMO_IDENTITIES,
  DEMO_REVIEW_NIN,
  DEMO_UNAVAILABLE_NIN,
} from "./demo-identities";
import type { IdentityProviderAdapter, ProviderResult } from "./types";

/**
 * MOCK NIN verification provider — DEVELOPMENT ONLY.
 *
 * This provider NEVER contacts NIMC and NEVER performs a real NIN lookup.
 * It succeeds only for the fictional demo identities. Every other NIN
 * returns FAILED, so an arbitrary (possibly real) NIN is never accepted as
 * a successful verification.
 */
export const MockNINVerificationProvider: IdentityProviderAdapter = {
  code: "MOCK_NIN",
  name: "Demo NIN provider (mock)",
  isMock: true,

  async verifyIdentity(input: { nin: string }): Promise<ProviderResult> {
    const nin = input.nin.trim();
    const reference = generateId("mkn");

    if (nin === DEMO_UNAVAILABLE_NIN) {
      return {
        result: "UNAVAILABLE",
        reference,
        reasonCode: "SERVICE_UNAVAILABLE",
      };
    }
    if (nin === DEMO_REVIEW_NIN) {
      return {
        result: "REQUIRES_REVIEW",
        reference,
        reasonCode: "MANUAL_REVIEW_REQUIRED",
      };
    }

    const match = DEMO_IDENTITIES.find((demo) => demo.nin === nin);
    if (!match) {
      return { result: "FAILED", reference, reasonCode: "IDENTITY_NOT_FOUND" };
    }

    return {
      result: "SUCCESS",
      reference,
      identity: {
        legalName: match.legalName,
        dateOfBirth: match.dateOfBirth,
        gender: match.gender,
        nationality: match.nationality,
        stateOfOrigin: match.stateOfOrigin,
        lga: match.lga,
      },
    };
  },
};

const PROVIDER_BY_CODE: Record<string, IdentityProviderAdapter> = {
  [MockNINVerificationProvider.code]: MockNINVerificationProvider,
};

export function getProviderAdapter(
  code: string,
): IdentityProviderAdapter | null {
  return PROVIDER_BY_CODE[code] ?? null;
}
