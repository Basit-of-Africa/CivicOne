export type ProviderResult =
  | {
      result: "SUCCESS";
      reference: string;
      identity: {
        legalName: string;
        dateOfBirth: string; // ISO date (yyyy-mm-dd)
        gender: "MALE" | "FEMALE";
        nationality: string;
        stateOfOrigin: string;
        lga: string;
      };
    }
  | {
      result: "FAILED";
      reference: string;
      reasonCode: "IDENTITY_NOT_FOUND";
    }
  | {
      result: "REQUIRES_REVIEW";
      reference: string;
      reasonCode: "MANUAL_REVIEW_REQUIRED";
    }
  | {
      result: "UNAVAILABLE";
      reference: string;
      reasonCode: "SERVICE_UNAVAILABLE";
    };

export interface IdentityProviderAdapter {
  readonly code: string;
  readonly name: string;
  readonly isMock: boolean;
  verifyIdentity(input: { nin: string }): Promise<ProviderResult>;
}
