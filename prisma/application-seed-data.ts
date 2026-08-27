import type { FormDefinition } from "../modules/applications/form-config";

const STATE_OPTIONS: Array<{ label: string; value: string }> = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "FCT (Abuja)",
].map((name) => ({ label: name, value: name }));

export const FORM_DEFINITIONS_SEED: FormDefinition[] = [
  {
    key: "personal-details",
    name: "Personal details",
    fields: [
      { key: "fullName", label: "Full name", type: "text", required: true, identityField: "legalName", hint: "Verified identity information", maxLength: 120 },
      { key: "dateOfBirth", label: "Date of birth", type: "date", required: true, identityField: "dateOfBirth", hint: "Verified identity information" },
      { key: "nationality", label: "Nationality", type: "text", required: true, identityField: "nationality", hint: "Verified identity information", maxLength: 80 },
      { key: "gender", label: "Gender", type: "select", required: true, identityField: "gender", hint: "Verified identity information", options: [{ label: "Female", value: "Female" }, { label: "Male", value: "Male" }] },
      { key: "phone", label: "Phone number", type: "phone", required: true, placeholder: "+234 800 000 0000" },
      { key: "email", label: "Email address", type: "email", required: true },
      { key: "residentialAddress", label: "Residential address", type: "address", required: false, maxLength: 300 },
    ],
  },
  {
    key: "company-details",
    name: "Company details",
    fields: [
      { key: "companyName", label: "Proposed company name", type: "text", required: true, maxLength: 160, hint: "This is the name that will be registered with the CAC." },
      { key: "companyType", label: "Company type", type: "select", required: true, options: [{ label: "Private Limited Company", value: "private-limited" }, { label: "Public Limited Company", value: "public-limited" }, { label: "Company Limited by Guarantee", value: "guarantee" }, { label: "Unlimited Company", value: "unlimited" }] },
      { key: "businessSector", label: "Business sector", type: "select", required: true, options: [{ label: "Technology", value: "technology" }, { label: "Agriculture", value: "agriculture" }, { label: "Retail & Trade", value: "retail" }, { label: "Finance", value: "finance" }, { label: "Manufacturing", value: "manufacturing" }, { label: "Services", value: "services" }, { label: "Other", value: "other" }] },
      { key: "registeredAddress", label: "Registered office address", type: "address", required: true, maxLength: 300 },
      { key: "contactPhone", label: "Contact phone", type: "phone", required: true },
      { key: "contactEmail", label: "Contact email", type: "email", required: true },
    ],
  },
  {
    key: "passport-details",
    name: "Passport details",
    fields: [
      { key: "passportType", label: "Passport type", type: "select", required: true, options: [{ label: "Standard 32-page", value: "standard-32" }, { label: "Standard 64-page", value: "standard-64" }] },
      { key: "maritalStatus", label: "Marital status", type: "select", required: true, options: [{ label: "Single", value: "single" }, { label: "Married", value: "married" }, { label: "Divorced", value: "divorced" }, { label: "Widowed", value: "widowed" }] },
      { key: "stateOfOrigin", label: "State of origin", type: "select", required: true, options: STATE_OPTIONS },
      { key: "photo", label: "Passport photograph", type: "file", required: true, accept: "image/png,image/jpeg" },
    ],
  },
  {
    key: "driver-details",
    name: "Driver details",
    fields: [
      { key: "licenceClass", label: "Licence class", type: "select", required: true, options: [{ label: "A (Motorcycle)", value: "A" }, { label: "B (Car)", value: "B" }, { label: "C (Light vehicle)", value: "C" }, { label: "E (Heavy vehicle)", value: "E" }, { label: "F (Special vehicle)", value: "F" }] },
      { key: "stateOfIssuance", label: "State of issuance", type: "select", required: true, options: STATE_OPTIONS },
      { key: "trainingCertificate", label: "Training school certificate", type: "file", required: false, accept: ".pdf" },
    ],
  },
];

export interface WorkflowStepSeed {
  type: "ELIGIBILITY" | "FORM" | "DOCUMENTS" | "REVIEW" | "PAYMENT" | "SUBMISSION" | "STATUS" | "COMPLETION";
  title: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface WorkflowSeed {
  serviceSlug: string;
  provider: "MOCK_CAC" | "MOCK_PASSPORT" | "MOCK_DRIVER_LICENCE";
  steps: WorkflowStepSeed[];
}

export const WORKFLOWS_SEED: WorkflowSeed[] = [
  {
    serviceSlug: "business-registration",
    provider: "MOCK_CAC",
    steps: [
      { type: "ELIGIBILITY", title: "Check eligibility", description: "Make sure you can apply." },
      { type: "FORM", title: "Company details", config: { formKey: "company-details" } },
      { type: "DOCUMENTS", title: "Documents", config: { documents: [
        { key: "memorandum-articles", label: "Memorandum and Articles of Association", required: true },
        { key: "directors-identification", label: "Directors' identification", required: true },
        { key: "registered-address-proof", label: "Proof of registered address", required: true },
      ] } },
      { type: "REVIEW", title: "Review your application" },
      { type: "PAYMENT", title: "Fees", config: { demo: true } },
      { type: "SUBMISSION", title: "Submit to CAC", config: { provider: "MOCK_CAC" } },
      { type: "COMPLETION", title: "Track your application" },
    ],
  },
  {
    serviceSlug: "national-passport",
    provider: "MOCK_PASSPORT",
    steps: [
      { type: "ELIGIBILITY", title: "Check eligibility" },
      { type: "FORM", title: "Personal details", config: { formKey: "personal-details" } },
      { type: "FORM", title: "Passport details", config: { formKey: "passport-details" } },
      { type: "DOCUMENTS", title: "Documents", config: { documents: [
        { key: "nin", label: "National Identification Number (NIN)", required: true },
        { key: "birth-certificate", label: "Birth certificate or declaration of age", required: true },
        { key: "lga-letter", label: "Local government letter of identification", required: true },
        { key: "passport-photo", label: "Passport photograph", required: true, accept: "image/png,image/jpeg" },
      ] } },
      { type: "REVIEW", title: "Review your application" },
      { type: "PAYMENT", title: "Fees", config: { demo: true } },
      { type: "SUBMISSION", title: "Submit to NIS", config: { provider: "MOCK_PASSPORT" } },
      { type: "COMPLETION", title: "Track your application" },
    ],
  },
  {
    serviceSlug: "driver-licence",
    provider: "MOCK_DRIVER_LICENCE",
    steps: [
      { type: "ELIGIBILITY", title: "Check eligibility" },
      { type: "FORM", title: "Personal details", config: { formKey: "personal-details" } },
      { type: "FORM", title: "Driver details", config: { formKey: "driver-details" } },
      { type: "DOCUMENTS", title: "Documents", config: { documents: [
        { key: "passport-photo", label: "Passport photograph", required: true, accept: "image/png,image/jpeg" },
        { key: "training-certificate", label: "Training school certificate", required: false, accept: ".pdf" },
      ] } },
      { type: "REVIEW", title: "Review your application" },
      { type: "PAYMENT", title: "Fees", config: { demo: true } },
      { type: "SUBMISSION", title: "Submit to FRSC", config: { provider: "MOCK_DRIVER_LICENCE" } },
      { type: "COMPLETION", title: "Track your application" },
    ],
  },
];
