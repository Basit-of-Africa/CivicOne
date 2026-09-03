/**
 * Phase 6B — Application Templates
 * Pre-built templates for common Nigerian government services.
 * Each template provides a checklist, guide, and tips for the application process.
 */

export interface ApplicationTemplate {
  id: string;
  serviceSlug: string;
  name: string;
  provider: string;
  description: string;
  estimatedTime: string;
  estimatedCost: string;
  checklist: Array<{
    title: string;
    description?: string;
    isRequired: boolean;
    howToObtain?: string;
  }>;
  steps: Array<{
    title: string;
    description: string;
    estimatedTime?: string;
    tips?: string[];
    warnings?: string[];
  }>;
  tips: string[];
  commonMistakes: string[];
}

export const APPLICATION_TEMPLATES: ApplicationTemplate[] = [
  {
    id: "business-registration",
    serviceSlug: "business-registration",
    name: "Business Registration (CAC)",
    provider: "Corporate Affairs Commission",
    description: "Register a new company or business name with the CAC.",
    estimatedTime: "1-2 weeks",
    estimatedCost: "NGN 10,000 - 50,000",
    checklist: [
      {
        title: "CAC Name Search Approval",
        description: "Approved name reservation from CAC",
        isRequired: true,
        howToObtain: "Apply online via CAC portal or visit a CAC office",
      },
      {
        title: "Memorandum & Articles of Association",
        description: "For limited liability companies",
        isRequired: true,
      },
      {
        title: "Form CAC 1.1 (Registration Form)",
        description: "Completed registration form",
        isRequired: true,
      },
      {
        title: "Means of Identification (Directors)",
        description: "NIN, voter's card, or international passport for all directors",
        isRequired: true,
      },
      {
        title: "Proof of Address",
        description: "Utility bill or bank statement (not older than 3 months)",
        isRequired: true,
      },
      {
        title: "Passport Photographs",
        description: "Recent passport photographs of all directors",
        isRequired: true,
      },
      {
        title: "Stamp Duty Payment",
        description: "Payment receipt for stamp duty",
        isRequired: true,
      },
    ],
    steps: [
      {
        title: "Name Search & Reservation",
        description: "Search for available business name and reserve it on the CAC portal.",
        estimatedTime: "1-3 days",
        tips: [
          "Search for 3 alternative names in case your first choice is taken",
          "Name must not be identical to an existing registered name",
          "Reservation is valid for 60 days",
        ],
      },
      {
        title: "Complete Registration Form",
        description: "Fill out the appropriate CAC form (CAC 1.1 for companies, CAC 1.2 for business names).",
        estimatedTime: "1 day",
        tips: [
          "Ensure all directors' details match their NIN records",
          "Business address must be a physical address (not P.O. Box)",
        ],
      },
      {
        title: "Prepare Supporting Documents",
        description: "Gather all required documents including ID, proof of address, and photographs.",
        estimatedTime: "1-2 days",
        warnings: [
          "Documents must be current and valid",
          "Utility bill must be less than 3 months old",
        ],
      },
      {
        title: "Submit & Pay Fees",
        description: "Submit application online and pay the required fees.",
        estimatedTime: "1 day",
        tips: [
          "Pay via CAC approved payment channels only",
          "Keep payment receipt for reference",
        ],
      },
      {
        title: "Await Processing",
        description: "CAC processes your application and issues registration documents.",
        estimatedTime: "5-10 working days",
        tips: [
          "Check status regularly on the CAC portal",
          "You may be contacted for additional information",
        ],
      },
      {
        title: "Collect Certificate",
        description: "Download or collect your Certificate of Incorporation / Business Name Registration.",
        estimatedTime: "1 day",
      },
    ],
    tips: [
      "Register online for faster processing",
      "Ensure all directors have valid NIN",
      "Keep digital copies of all submitted documents",
      "Register for TIN immediately after company registration",
    ],
    commonMistakes: [
      "Using a name too similar to an existing company",
      "Providing inconsistent director information",
      "Using a P.O. Box as business address",
      "Not checking email for CAC communications",
    ],
  },
  {
    id: "national-passport",
    serviceSlug: "national-passport",
    name: "Nigerian International Passport",
    provider: "Nigeria Immigration Service",
    description: "Apply for or renew a Nigerian international passport.",
    estimatedTime: "2-6 weeks",
    estimatedCost: "NGN 35,000 (32 pages) / NGN 70,000 (64 pages)",
    checklist: [
      {
        title: "NIN (National Identification Number)",
        description: "Your 11-digit NIN from NIMC",
        isRequired: true,
        howToObtain: "Enroll at any NIMC office nationwide",
      },
      {
        title: "Birth Certificate / Age Declaration",
        description: "Official birth certificate or sworn age declaration",
        isRequired: true,
      },
      {
        title: "State of Origin / Local Government Letter",
        description: "Letter of indigeneship from your LGA",
        isRequired: true,
      },
      {
        title: "Passport Photographs",
        description: "Recent white-background passport photographs",
        isRequired: true,
      },
      {
        title: "Old Passport (for renewal)",
        description: "Previous passport if renewing",
        isRequired: false,
      },
      {
        title: "Marriage Certificate (if applicable)",
        description: "If name change due to marriage",
        isRequired: false,
      },
    ],
    steps: [
      {
        title: "Online Application",
        description: "Complete the passport application form on the NIS portal.",
        estimatedTime: "30 minutes",
        tips: [
          "Use the NIS e-passport portal (nis.gov.ng)",
          "Ensure all details match your NIN record",
        ],
      },
      {
        title: "Pay Application Fee",
        description: "Pay the passport fee via the NIS approved payment channels.",
        estimatedTime: "1 day",
        tips: [
          "Keep your payment receipt",
          "Fees vary by passport type (32 or 64 pages)",
        ],
      },
      {
        title: "Book Biometrics Appointment",
        description: "Schedule a biometrics capture appointment at your nearest NIS office.",
        estimatedTime: "1-3 days",
        tips: [
          "Choose a location convenient for you",
          "Book early to avoid long wait times",
        ],
      },
      {
        title: "Attend Biometrics Capture",
        description: "Visit the NIS office for biometrics capture (fingerprints, photo, signature).",
        estimatedTime: "2-3 hours",
        warnings: [
          "Bring all original documents",
          "Arrive early on your appointment day",
          "Wear dark clothing (not white) for the photo",
        ],
      },
      {
        title: "Await Processing",
        description: "NIS processes your application and produces your passport.",
        estimatedTime: "2-6 weeks",
        tips: [
          "Check status on the NIS portal",
          "Processing time varies by NIS office",
        ],
      },
      {
        title: "Collect Passport",
        description: "Collect your passport from the NIS office or receive via courier.",
        estimatedTime: "1 day",
      },
    ],
    tips: [
      "Apply at least 3 months before any planned travel",
      "Ensure your NIN is linked to your biometrics",
      "Keep digital copies of all documents",
      "Track your application status regularly",
    ],
    commonMistakes: [
      "Applying without a valid NIN",
      "Providing inconsistent personal information",
      "Not bringing original documents to biometrics",
      "Choosing wrong passport type (32 vs 64 pages)",
    ],
  },
  {
    id: "driver-licence",
    serviceSlug: "driver-licence",
    name: "Driver's Licence (FRSC)",
    provider: "Federal Road Safety Corps",
    description: "Apply for or renew a Nigerian driver's licence.",
    estimatedTime: "2-4 weeks",
    estimatedCost: "NGN 6,000 - 15,000 (varies by class)",
    checklist: [
      {
        title: "Learner's Permit",
        description: "Valid learner's permit (for first-time applicants)",
        isRequired: true,
      },
      {
        title: "NIN (National Identification Number)",
        description: "Your 11-digit NIN from NIMC",
        isRequired: true,
      },
      {
        title: "Birth Certificate / Age Declaration",
        description: "Proof of age",
        isRequired: true,
      },
      {
        title: "Medical Certificate",
        description: "Certificate of fitness from approved medical centre",
        isRequired: true,
      },
      {
        title: "Passport Photographs",
        description: "Recent white-background passport photographs",
        isRequired: true,
      },
      {
        title: "Driving School Certificate",
        description: "Certificate from FRSC-approved driving school (for new applicants)",
        isRequired: true,
      },
    ],
    steps: [
      {
        title: "Online Application",
        description: "Complete the driver's licence application on the FRSC portal.",
        estimatedTime: "30 minutes",
        tips: [
          "Use the FRSC portal (frsc.gov.ng)",
          "Select the correct licence class",
        ],
      },
      {
        title: "Pay Application Fee",
        description: "Pay the required fee via FRSC approved payment channels.",
        estimatedTime: "1 day",
      },
      {
        title: "Visit FRSC Office",
        description: "Visit the FRSC office for biometrics capture and document verification.",
        estimatedTime: "2-4 hours",
        warnings: [
          "Bring all original documents",
          "Some FRSC offices require appointments",
        ],
      },
      {
        title: "Driving Test (if required)",
        description: "Some licence classes require a practical driving test.",
        estimatedTime: "1-2 hours",
        tips: [
          "Practice before your test date",
          "Know the basic road signs and rules",
        ],
      },
      {
        title: "Await Processing",
        description: "FRSC processes your application and produces your licence.",
        estimatedTime: "2-4 weeks",
      },
      {
        title: "Collect Licence",
        description: "Collect your driver's licence from the FRSC office.",
        estimatedTime: "1 day",
      },
    ],
    tips: [
      "Start with a learner's permit if you're a new driver",
      "Keep your licence valid — renew before expiry",
      "Different licence classes for different vehicle types",
      "FRSC can suspend licences for traffic offences",
    ],
    commonMistakes: [
      "Applying for wrong licence class",
      "Not having a valid medical certificate",
      "Driving with an expired licence",
      "Not renewing before the 5-year validity period",
    ],
  },
];

export function getTemplateBySlug(slug: string): ApplicationTemplate | undefined {
  return APPLICATION_TEMPLATES.find((t) => t.serviceSlug === slug);
}

export function getAllTemplates(): ApplicationTemplate[] {
  return APPLICATION_TEMPLATES;
}
