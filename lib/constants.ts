/**
 * Shared application constants.
 * Safe to import from both client and server code.
 */

export const APP_NAME = "CivicOne Nigeria";
export const APP_TAGLINE =
  "Your Nigerian identity, public services and records in one place.";

export const APP_DESCRIPTION =
  "CivicOne is an independent technology platform that helps Nigerians discover, initiate, manage and organise public and administrative services.";

export const TRUST_DISCLAIMER =
  "CivicOne is an independent technology platform. It is not a government agency.";

/**
 * Service categories used on the landing page and service catalogue.
 */
export const SERVICE_CATEGORIES = [
  { key: "identity-civil-records", label: "Identity & Civil Records" },
  { key: "business-corporate", label: "Business & Corporate" },
  { key: "tax-finance", label: "Tax & Finance" },
  { key: "immigration-travel", label: "Immigration & Travel" },
  { key: "transport", label: "Transport" },
  { key: "education", label: "Education" },
  { key: "health", label: "Health" },
  { key: "property-land", label: "Property & Land" },
  { key: "employment", label: "Employment" },
  { key: "agriculture", label: "Agriculture" },
  { key: "licences-permits", label: "Licences & Permits" },
  { key: "family-social", label: "Family & Social Services" },
  { key: "legal-compliance", label: "Legal & Compliance" },
] as const;

export const HERO_SEARCH_EXAMPLES = [
  "Register a business",
  "Renew my licence",
  "Apply for a passport",
  "Find a public service",
] as const;

export const FORMATTED_STATUS: Record<string, string> = {
  UNVERIFIED: "Not yet verified",
  VERIFIED: "Verified",
  SUSPENDED: "Suspended",
  LOCKED: "Locked",
  CLOSED: "Closed",
  VERIFICATION_PENDING: "Verification in progress",
  VERIFICATION_FAILED: "Verification failed",
  REQUIRES_MANUAL_REVIEW: "Manual review",
};
