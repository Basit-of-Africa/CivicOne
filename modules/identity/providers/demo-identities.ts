/**
 * FICTIONAL demo identities used ONLY by the mock provider.
 *
 * These NINs and people DO NOT EXIST. The data is clearly labelled DEMO DATA
 * everywhere it appears. The mock provider accepts exactly these NINs (plus
 * two reserved codes below); any other NIN — including a real person's —
 * always fails verification.
 */

export interface DemoIdentity {
  nin: string;
  legalName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  nationality: string;
  stateOfOrigin: string;
  lga: string;
  note: string;
}

export const DEMO_IDENTITIES: DemoIdentity[] = [
  {
    nin: "00000000001",
    legalName: "Adaeze Ngozi Okafor",
    dateOfBirth: "1990-04-12",
    gender: "FEMALE",
    nationality: "Nigerian",
    stateOfOrigin: "Anambra",
    lga: "Idemili North",
    note: "Demo identity A",
  },
  {
    nin: "00000000002",
    legalName: "Ibrahim Musa Bello",
    dateOfBirth: "1985-11-03",
    gender: "MALE",
    nationality: "Nigerian",
    stateOfOrigin: "Kano",
    lga: "Nassarawa",
    note: "Demo identity B",
  },
  {
    nin: "00000000003",
    legalName: "Chinedu Emmanuel Adeyemi",
    dateOfBirth: "1995-07-22",
    gender: "MALE",
    nationality: "Nigerian",
    stateOfOrigin: "Lagos",
    lga: "Alimosho",
    note: "Demo identity C",
  },
];

// Reserved codes used to exercise the non-success provider outcomes.
export const DEMO_REVIEW_NIN = "00000000009"; // → REQUIRES_REVIEW
export const DEMO_UNAVAILABLE_NIN = "00000000010"; // → UNAVAILABLE

export const DEMO_NINS = [
  ...DEMO_IDENTITIES.map((d) => d.nin),
  DEMO_REVIEW_NIN,
  DEMO_UNAVAILABLE_NIN,
];
