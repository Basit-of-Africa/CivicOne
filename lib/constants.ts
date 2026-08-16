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
 * Service categories used on the landing page and placeholder catalogue.
 */
export const SERVICE_CATEGORIES = [
  { key: "business", label: "Business" },
  { key: "identity", label: "Identity" },
  { key: "documents", label: "Documents" },
  { key: "licences", label: "Licences & Permits" },
  { key: "taxes", label: "Tax" },
  { key: "government", label: "Government Services" },
  { key: "education", label: "Education" },
  { key: "health", label: "Health" },
  { key: "justice", label: "Justice & Legal" },
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
