import type { JurisdictionLevel, ServiceMode } from "@prisma/client";

export interface JurisdictionSeed {
  code: string;
  name: string;
  level: JurisdictionLevel;
  parent?: string; // parent code
}

export const JURISDICTIONS: JurisdictionSeed[] = [
  { code: "FEDERAL", name: "Nigeria (Federal)", level: "FEDERAL" },
];

const STATES: Array<[string, string]> = [
  ["ABIA", "Abia"],
  ["ADAMAWA", "Adamawa"],
  ["AKWA_IBOM", "Akwa Ibom"],
  ["ANAMBRA", "Anambra"],
  ["BAUCHI", "Bauchi"],
  ["BAYELSA", "Bayelsa"],
  ["BENUE", "Benue"],
  ["BORNO", "Borno"],
  ["CROSS_RIVER", "Cross River"],
  ["DELTA", "Delta"],
  ["EBONYI", "Ebonyi"],
  ["EDO", "Edo"],
  ["EKITI", "Ekiti"],
  ["ENUGU", "Enugu"],
  ["GOMBE", "Gombe"],
  ["IMO", "Imo"],
  ["JIGAWA", "Jigawa"],
  ["KADUNA", "Kaduna"],
  ["KANO", "Kano"],
  ["KATSINA", "Katsina"],
  ["KEBBI", "Kebbi"],
  ["KOGI", "Kogi"],
  ["KWARA", "Kwara"],
  ["LAGOS", "Lagos"],
  ["NASARAWA", "Nasarawa"],
  ["NIGER", "Niger"],
  ["OGUN", "Ogun"],
  ["ONDO", "Ondo"],
  ["OSUN", "Osun"],
  ["OYO", "Oyo"],
  ["PLATEAU", "Plateau"],
  ["RIVERS", "Rivers"],
  ["SOKOTO", "Sokoto"],
  ["TARABA", "Taraba"],
  ["YOBE", "Yobe"],
  ["ZAMFARA", "Zamfara"],
  ["FCT", "Federal Capital Territory (Abuja)"],
];

for (const [code, name] of STATES) {
  JURISDICTIONS.push({ code, name, level: "STATE" });
}

// Representative LGAs (capital/area-council + one extra per state where known).
// Full 774-LGA dataset is a later data-loading task.
export const LGAS: Array<[string, string[]]> = [
  ["ABIA", ["Obi Ngwa", "Umuahia North"]],
  ["ADAMAWA", ["Yola North", "Ganye"]],
  ["AKWA_IBOM", ["Uyo", "Ikot Ekpene"]],
  ["ANAMBRA", ["Awka North", "Idemili North"]],
  ["BAUCHI", ["Bauchi", "Katagum"]],
  ["BAYELSA", ["Yenagoa", "Brass"]],
  ["BENUE", ["Makurdi", "Gboko"]],
  ["BORNO", ["Maiduguri", "Biu"]],
  ["CROSS_RIVER", ["Calabar Municipal", "Ikom"]],
  ["DELTA", ["Oshimili South", "Warri South"]],
  ["EBONYI", ["Abakaliki", "Afikpo North"]],
  ["EDO", ["Oredo", "Esan West"]],
  ["EKITI", ["Ado-Ekiti", "Ikere"]],
  ["ENUGU", ["Enugu North", "Nsukka"]],
  ["GOMBE", ["Gombe", "Akko"]],
  ["IMO", ["Owerri Municipal", "Orlu"]],
  ["JIGAWA", ["Dutse", "Hadejia"]],
  ["KADUNA", ["Kaduna North", "Zaria"]],
  ["KANO", ["Nassarawa", "Kano Municipal"]],
  ["KATSINA", ["Katsina", "Daura"]],
  ["KEBBI", ["Birnin Kebbi", "Argungu"]],
  ["KOGI", ["Lokoja", "Okene"]],
  ["KWARA", ["Ilorin East", "Offa"]],
  ["LAGOS", ["Lagos Island", "Alimosho"]],
  ["NASARAWA", ["Lafia", "Karu"]],
  ["NIGER", ["Minna", "Bida"]],
  ["OGUN", ["Abeokuta North", "Ijebu Ode"]],
  ["ONDO", ["Akure North", "Ondo West"]],
  ["OSUN", ["Osogbo", "Ilesa East"]],
  ["OYO", ["Ibadan North", "Ogbomoso North"]],
  ["PLATEAU", ["Jos North", "Barkin Ladi"]],
  ["RIVERS", ["Port Harcourt", "Obio/Akpor"]],
  ["SOKOTO", ["Sokoto North", "Wamako"]],
  ["TARABA", ["Jalingo", "Wukari"]],
  ["YOBE", ["Damaturu", "Potiskum"]],
  ["ZAMFARA", ["Gusau", "Kaura Namoda"]],
  ["FCT", ["Abuja Municipal Area Council", "Bwari", "Kuje"]],
];

for (const [stateCode, lgas] of LGAS) {
  for (const lga of lgas) {
    const code = lga.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    JURISDICTIONS.push({
      code: `${stateCode}_${code}`,
      name: lga,
      level: "LOCAL",
      parent: stateCode,
    });
  }
}

export const SERVICE_CATEGORIES_SEED: Array<{ slug: string; name: string; description: string }> = [
  { slug: "identity-civil-records", name: "Identity & Civil Records", description: "NIN, birth and other civil records." },
  { slug: "business-corporate", name: "Business & Corporate", description: "Company and business registration." },
  { slug: "tax-finance", name: "Tax & Finance", description: "Tax identification and financial services." },
  { slug: "immigration-travel", name: "Immigration & Travel", description: "Passports, visas and travel documents." },
  { slug: "transport", name: "Transport", description: "Licences, registrations and roadworthiness." },
  { slug: "education", name: "Education", description: "Examinations and student registration." },
  { slug: "health", name: "Health", description: "Product registration and health coverage." },
  { slug: "property-land", name: "Property & Land", description: "Land titles, permits and property." },
  { slug: "employment", name: "Employment", description: "Pensions, youth service and work documents." },
  { slug: "agriculture", name: "Agriculture", description: "Loans and support for farmers." },
  { slug: "licences-permits", name: "Licences & Permits", description: "Professional and operating licences." },
  { slug: "family-social", name: "Family & Social Services", description: "Marriage, death and social records." },
  { slug: "legal-compliance", name: "Legal & Compliance", description: "Clearances and compliance documents." },
];

export interface ProviderSeed {
  slug: string;
  name: string;
  abbreviation: string;
  description: string;
  officialUrl: string;
}

export const SERVICE_PROVIDERS_SEED: ProviderSeed[] = [
  { slug: "cac", name: "Corporate Affairs Commission", abbreviation: "CAC", description: "Registers companies and business names in Nigeria.", officialUrl: "https://www.cac.gov.ng" },
  { slug: "firs", name: "Federal Inland Revenue Service", abbreviation: "FIRS", description: "Administers federal taxes and tax identification numbers.", officialUrl: "https://www.firs.gov.ng" },
  { slug: "nimc", name: "National Identity Management Commission", abbreviation: "NIMC", description: "Issues the National Identification Number (NIN).", officialUrl: "https://nimc.gov.ng" },
  { slug: "nis", name: "Nigeria Immigration Service", abbreviation: "NIS", description: "Issues Nigerian passports and manages immigration.", officialUrl: "https://immigration.gov.ng" },
  { slug: "frsc", name: "Federal Road Safety Corps", abbreviation: "FRSC", description: "Issues driver licences and manages vehicle registration.", officialUrl: "https://www.frsc.gov.ng" },
  { slug: "jamb", name: "Joint Admissions and Matriculation Board", abbreviation: "JAMB", description: "Conducts the UTME examination.", officialUrl: "https://www.jamb.gov.ng" },
  { slug: "npc", name: "National Population Commission", abbreviation: "NPC", description: "Registers births and deaths in Nigeria.", officialUrl: "https://nationalpopulation.gov.ng" },
  { slug: "nafdac", name: "National Agency for Food and Drug Administration and Control", abbreviation: "NAFDAC", description: "Regulates food, drugs and products.", officialUrl: "https://www.nafdac.gov.ng" },
  { slug: "pcn", name: "Pharmacists Council of Nigeria", abbreviation: "PCN", description: "Registers pharmacy premises and professionals.", officialUrl: "https://www.pcn.gov.ng" },
  { slug: "nysc", name: "National Youth Service Corps", abbreviation: "NYSC", description: "Administers the one-year national youth service.", officialUrl: "https://www.nysc.gov.ng" },
  { slug: "pencom", name: "National Pension Commission", abbreviation: "PenCom", description: "Regulates the contributory pension scheme.", officialUrl: "https://www.pencom.gov.ng" },
  { slug: "nhia", name: "National Health Insurance Authority", abbreviation: "NHIA", description: "Administers health insurance coverage.", officialUrl: "https://www.nhis.gov.ng" },
  { slug: "boa", name: "Bank of Agriculture", abbreviation: "BOA", description: "Provides credit to farmers and agricultural enterprises.", officialUrl: "https://www.bankofagricultureng.com" },
  { slug: "npf", name: "Nigeria Police Force", abbreviation: "NPF", description: "Issues character certificates and police clearances.", officialUrl: "https://npf.gov.ng" },
  { slug: "lasg-pp", name: "Lagos State Ministry of Physical Planning and Urban Development", abbreviation: "LASG-PP", description: "Issues building permits in Lagos State.", officialUrl: "https://physicalplanning.lagosstate.gov.ng" },
  { slug: "lasg-vio", name: "Lagos State Vehicle Inspection Service", abbreviation: "LASG-VIO", description: "Issues roadworthiness certificates in Lagos State.", officialUrl: "https://motor-vehicle.lagosstate.gov.ng" },
];

export interface RequirementSeed {
  title: string;
  description?: string;
  isDocument?: boolean;
  isVerified?: boolean;
}

export interface FeeSeed {
  name: string;
  frequency?: string;
  note?: string;
}

export interface DemoServiceSeed {
  slug: string;
  name: string;
  category: string; // category slug
  provider: string; // provider slug
  jurisdiction: string; // jurisdiction code
  mode: ServiceMode;
  summary: string;
  description: string;
  eligibility: string;
  estimatedTime?: string;
  officialUrl: string;
  requirements: RequirementSeed[];
  fees: FeeSeed[];
  faqs: Array<{ question: string; answer: string }>;
  related: string[];
  steps?: Array<{ title: string; description: string }>;
}

const UNVERIFIED_NOTE = "Demo information. Confirm current requirements with the official provider.";

export const DEMO_SERVICES_SEED: DemoServiceSeed[] = [
  {
    slug: "business-registration",
    name: "Company Registration",
    category: "business-corporate",
    provider: "cac",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Register a limited liability company with the Corporate Affairs Commission.",
    description: "Company registration creates a legal entity (a private limited company) in Nigeria. It is handled by the Corporate Affairs Commission (CAC) through its online portal.",
    eligibility: "You must be at least 18 years old and have a valid means of identification.",
    estimatedTime: "A few working days after submission",
    officialUrl: "https://pre.cac.gov.ng",
    requirements: [
      { title: "Two proposed company names (in order of preference)", isVerified: true },
      { title: "Reserved name approval", description: "Names are reserved through the CAC portal before filing.", isVerified: true },
      { title: "Memorandum and Articles of Association", isDocument: true },
      { title: "Directors' and shareholders' details", description: UNVERIFIED_NOTE },
      { title: "Proof of registered address", isDocument: true },
    ],
    fees: [
      { name: "Company registration filing fee", frequency: "per application" },
      { name: "Name reservation fee", frequency: "per name" },
    ],
    faqs: [
      { question: "How long does company registration take?", answer: "CAC registrations are typically processed within a few working days once the application is complete and payment is made." },
      { question: "Do I need a NIN to register a company?", answer: "CAC now requires identification for directors and shareholders. Confirm the current identification requirements with the CAC portal." },
    ],
    related: ["tin-registration", "business-name-registration", "cac-annual-returns"],
    steps: [
      { title: "Reserve your company name", description: "Check name availability and reserve your preferred names on the CAC portal." },
      { title: "Prepare incorporation documents", description: "Draft the Memorandum and Articles of Association, often with the help of a lawyer or CAC-accredited agent." },
      { title: "Enter company details", description: "Provide directors' and shareholders' information, share structure and registered address." },
      { title: "Upload documents and pay", description: "Attach the required documents and pay the filing fees on the portal." },
      { title: "Submit and track", description: "Submit the application and monitor its status until the certificate is issued." },
    ],
  },
  {
    slug: "business-name-registration",
    name: "Business Name Registration",
    category: "business-corporate",
    provider: "cac",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Register a business name for a sole trader or partnership.",
    description: "A business name registration formalises a trading name for individuals or partnerships that are not incorporated as a company.",
    eligibility: "Available to individuals and partnerships trading under a name.",
    estimatedTime: "Usually processed within one working day",
    officialUrl: "https://pre.cac.gov.ng",
    requirements: [
      { title: "Proposed business name(s)", isVerified: true },
      { title: "Business address", isDocument: true },
      { title: "Identification of the proprietor or partners", description: UNVERIFIED_NOTE },
    ],
    fees: [{ name: "Business name registration fee", frequency: "per application" }],
    faqs: [
      { question: "Is a business name the same as a company?", answer: "No. A business name is for sole traders and partnerships; a company is a separate legal entity. Both are registered with CAC." },
    ],
    related: ["business-registration", "tin-registration"],
    steps: [
      { title: "Log in to the CAC portal", description: "Sign in or create an account on the CAC online portal." },
      { title: "Check name availability", description: "Search for your proposed business name and reserve it if it is available." },
      { title: "Enter business details", description: "Provide the business address, nature of business and proprietor or partner details." },
      { title: "Pay and submit", description: "Pay the registration fee and submit the application for processing." },
    ],
  },
  {
    slug: "tin-registration",
    name: "Tax Identification Number (TIN) Registration",
    category: "tax-finance",
    provider: "firs",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Get a Tax Identification Number for yourself or your business.",
    description: "A TIN is required to file taxes and for many financial transactions in Nigeria. It is issued by the Federal Inland Revenue Service (FIRS).",
    eligibility: "Individuals, companies and organisations that need to file taxes.",
    estimatedTime: "Immediate online",
    officialUrl: "https://efirs.firs.gov.ng",
    requirements: [
      { title: "Valid identification (e.g. NIN, passport or driver's licence)", isDocument: true },
      { title: "Proof of business registration (for companies)", isDocument: true },
    ],
    fees: [{ name: "TIN registration", note: "Registration is free" }],
    faqs: [
      { question: "Why do I need a TIN?", answer: "A TIN is used to file tax returns and is often requested by banks and government bodies." },
    ],
    related: ["business-registration"],
    steps: [
      { title: "Create an e-FIRS account", description: "Sign up on the FIRS e-FIRS portal." },
      { title: "Choose TIN registration", description: "Select the individual or business TIN registration option." },
      { title: "Provide identification", description: "Enter your identification details, such as your NIN." },
      { title: "Receive your TIN", description: "Your TIN is issued immediately after successful submission." },
    ],
  },
  {
    slug: "nin-enrollment",
    name: "NIN Enrollment",
    category: "identity-civil-records",
    provider: "nimc",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Enrol for a National Identification Number (NIN).",
    description: "The NIN is Nigeria's unique identity number, issued by NIMC. It is increasingly required for passports, bank accounts, SIM registration and government services.",
    eligibility: "Nigerian citizens and legal residents.",
    estimatedTime: "NIN is issued on enrolment; card delivery takes longer",
    officialUrl: "https://nimc.gov.ng",
    requirements: [
      { title: "Birth certificate or declaration of age", isDocument: true },
      { title: "Proof of address", isDocument: true },
      { title: "Biometrics capture (facial and fingerprints)", description: UNVERIFIED_NOTE },
    ],
    fees: [
      { name: "First NIN enrolment", note: "First enrolment is free; confirm with NIMC" },
    ],
    faqs: [
      { question: "Do I need to pay for a NIN?", answer: "First-time enrolment is free at NIMC centres. Any token fees charged by third-party centres should be confirmed with NIMC." },
    ],
    related: ["national-passport", "driver-licence"],
    steps: [
      { title: "Book an appointment", description: "Schedule an enrolment slot at an approved NIMC enrolment centre." },
      { title: "Bring your documents", description: "Carry your birth certificate or declaration of age and proof of address." },
      { title: "Complete the form", description: "Fill in the enrolment form at the centre." },
      { title: "Capture biometrics", description: "Your facial image and fingerprints are captured." },
      { title: "Receive your NIN slip", description: "Your NIN is issued on enrolment; the card may take longer to arrive." },
    ],
  },
  {
    slug: "national-passport",
    name: "Nigerian Passport (New Application)",
    category: "immigration-travel",
    provider: "nis",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Apply for a Nigerian passport through the Immigration portal.",
    description: "The Nigeria Immigration Service issues passports. New applicants create an account on the passport portal, complete an online form, pay the fee and book an appointment.",
    eligibility: "Nigerian citizens by birth, registration or naturalisation.",
    estimatedTime: "Processing takes a number of weeks after the interview",
    officialUrl: "https://passport.immigration.gov.ng",
    requirements: [
      { title: "NIN", isDocument: true },
      { title: "Birth certificate or declaration of age", isDocument: true },
      { title: "Local government letter of identification", isDocument: true },
      { title: "Passport photographs", isDocument: true },
      { title: "Marriage certificate (for married applicants changing name)", isDocument: true },
    ],
    fees: [
      { name: "Passport application fee", frequency: "per application" },
    ],
    faqs: [
      { question: "How long is a Nigerian passport valid?", answer: "Passport validity varies by age and type. Confirm the current validity rules with the Immigration Service." },
      { question: "Can I renew online?", answer: "Yes — renewals are handled on the same passport portal. See the renewal service." },
    ],
    related: ["international-passport-renewal", "nin-enrollment", "police-character-certificate"],
    steps: [
      { title: "Create a passport account", description: "Register on the Nigeria Immigration Service passport portal." },
      { title: "Complete the application form", description: "Fill in the online application and select your preferred passport office." },
      { title: "Pay the application fee", description: "Pay online and keep the payment receipt." },
      { title: "Book an appointment", description: "Choose a date to attend your passport office." },
      { title: "Attend the interview", description: "Present your documents and complete biometric capture at the office." },
      { title: "Collect your passport", description: "Return to collect your passport when the tracking status shows it is ready." },
    ],
  },
  {
    slug: "international-passport-renewal",
    name: "Passport Renewal",
    category: "immigration-travel",
    provider: "nis",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Renew an existing Nigerian passport.",
    description: "Renew your passport on the Immigration portal. Renewal is usually simpler than a first application, but still requires an online form, payment and an appointment.",
    eligibility: "Nigerians with an existing, expiring or expired passport.",
    estimatedTime: "A few weeks after the appointment",
    officialUrl: "https://passport.immigration.gov.ng",
    requirements: [
      { title: "Old passport", isDocument: true },
      { title: "NIN", isDocument: true },
      { title: "Passport photographs", isDocument: true },
    ],
    fees: [{ name: "Passport renewal fee", frequency: "per application" }],
    faqs: [
      { question: "Can I renew before my passport expires?", answer: "You can usually renew while your current passport is still valid. Check the portal for the current window." },
    ],
    related: ["national-passport"],
    steps: [
      { title: "Log in to the passport portal", description: "Sign in with your existing passport account." },
      { title: "Start a renewal", description: "Open a renewal application and verify your personal details." },
      { title: "Pay the renewal fee", description: "Pay online and save your receipt." },
      { title: "Book an appointment", description: "Schedule a visit to the passport office." },
      { title: "Attend and collect", description: "Complete capture at the office and collect the renewed passport when ready." },
    ],
  },
  {
    slug: "driver-licence",
    name: "Driver's Licence",
    category: "transport",
    provider: "frsc",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Apply for or renew your Nigerian driver's licence.",
    description: "Driver licences in Nigeria are issued by the FRSC. The process includes an online application, biometric capture and a written/computerised test for new drivers.",
    eligibility: "Applicants must be 18 or older and pass the required tests.",
    estimatedTime: "Licence is produced within a few weeks of capture",
    officialUrl: "https://www.frsc.gov.ng/driver-licence",
    requirements: [
      { title: "Completed licence application form", isDocument: true },
      { title: "Passport photograph", isDocument: true },
      { title: "Proof of identity", isDocument: true },
      { title: "Training school certificate (for new licences)", description: UNVERIFIED_NOTE },
    ],
    fees: [{ name: "Driver's licence fee", frequency: "per licence period" }],
    faqs: [
      { question: "How long is a Nigerian driver's licence valid?", answer: "Licences are typically issued with a validity period of several years; check your licence for the expiry date." },
    ],
    related: ["vehicle-registration", "road-worthiness-certificate", "nin-enrollment"],
    steps: [
      { title: "Complete the online application", description: "Fill in the licence application form on the FRSC portal." },
      { title: "Book biometric capture", description: "Schedule a capture appointment at an FRSC office or approved centre." },
      { title: "Pay the licence fee", description: "Pay online and keep the receipt." },
      { title: "Attend capture", description: "Complete your biometrics; new drivers also sit the required test." },
      { title: "Collect your licence", description: "The licence is produced within a few weeks and delivered to your chosen collection point." },
    ],
  },
  {
    slug: "vehicle-registration",
    name: "Vehicle Registration and Number Plates",
    category: "transport",
    provider: "frsc",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Register a vehicle and obtain Nigerian number plates.",
    description: "Vehicle registration is handled by the FRSC (often via state offices). It covers the registration certificate, number plates and annual licensing.",
    eligibility: "Owners of vehicles used or imported into Nigeria.",
    estimatedTime: "Varies by state; allow several days",
    officialUrl: "https://www.frsc.gov.ng",
    requirements: [
      { title: "Vehicle import papers or proof of purchase", isDocument: true },
      { title: "Customs duty evidence (for imported vehicles)", isDocument: true },
      { title: "Proof of identity", isDocument: true },
      { title: "Comprehensive insurance certificate", isDocument: true },
    ],
    fees: [
      { name: "Registration and number plate fee", frequency: "per vehicle" },
      { name: "Annual vehicle licence fee", frequency: "annual" },
    ],
    faqs: [
      { question: "Do I need insurance to register a vehicle?", answer: "Yes — a valid comprehensive insurance certificate is required for registration." },
    ],
    related: ["road-worthiness-certificate", "driver-licence"],
    steps: [
      { title: "Prepare vehicle documents", description: "Gather proof of purchase or import papers, identity and insurance." },
      { title: "Visit the FRSC office", description: "Go to an FRSC office or approved centre for the process." },
      { title: "Complete the registration form", description: "Submit the form with your vehicle details." },
      { title: "Pay the fees", description: "Pay the registration, number plate and licensing fees." },
      { title: "Collect your documents", description: "Receive the registration certificate and number plates." },
    ],
  },
  {
    slug: "certificate-of-occupancy",
    name: "Certificate of Occupancy",
    category: "property-land",
    provider: "lasg-pp",
    jurisdiction: "LAGOS",
    mode: "GUIDANCE",
    summary: "Understand how to obtain a Certificate of Occupancy for land.",
    description: "A Certificate of Occupancy (C of O) is the key land title document in many Nigerian states. This guide explains the typical process; land administration varies by state.",
    eligibility: "Individuals and organisations holding land requiring formalisation.",
    estimatedTime: "Months, depending on the state and land office",
    officialUrl: "https://physicalplanning.lagosstate.gov.ng",
    requirements: [
      { title: "Land title documents (sale agreement, deed)", isDocument: true },
      { title: "Survey plan of the land", isDocument: true },
      { title: "Tax clearance certificate", isDocument: true },
      { title: "Land use charges evidence", isDocument: true },
    ],
    fees: [{ name: "Application and processing fees", frequency: "per application" }],
    faqs: [
      { question: "Is a Certificate of Occupancy the same as ownership?", answer: "A C of O is a title document that formalises your interest in land. Requirements and fees differ by state." },
    ],
    related: ["building-permit"],
    steps: [
      { title: "Gather your land documents", description: "Collect your sale agreement, deed and survey plan." },
      { title: "Verify the land", description: "Confirm the survey and land details with the land office." },
      { title: "Submit the application", description: "File your application with the relevant state land office." },
      { title: "Pay processing fees", description: "Pay the application and processing fees." },
      { title: "Await issuance", description: "The Certificate of Occupancy is issued once processing completes." },
    ],
  },
  {
    slug: "building-permit",
    name: "Building Permit (Lagos State)",
    category: "property-land",
    provider: "lasg-pp",
    jurisdiction: "LAGOS",
    mode: "EXTERNAL",
    summary: "Apply for a building permit for construction in Lagos State.",
    description: "Building permits are required before construction in Lagos State and are processed by the Ministry of Physical Planning and Urban Development.",
    eligibility: "Property owners and developers building within Lagos State.",
    estimatedTime: "Several weeks after complete submission",
    officialUrl: "https://physicalplanning.lagosstate.gov.ng",
    requirements: [
      { title: "Proof of ownership / title to land", isDocument: true },
      { title: "Approved building plans", isDocument: true },
      { title: "Structural drawings by a registered professional", isDocument: true },
      { title: "EIA or flood-risk assessments where required", isDocument: true },
    ],
    fees: [{ name: "Building permit processing fee", frequency: "per project" }],
    faqs: [
      { question: "Can I start building before the permit is issued?", answer: "Building without an approved permit can lead to enforcement action. Confirm the rules with the Lagos State authorities." },
    ],
    related: ["certificate-of-occupancy"],
    steps: [
      { title: "Prepare your title documents", description: "Gather proof of ownership or title to the land." },
      { title: "Get plans approved", description: "Have building plans and structural drawings prepared by registered professionals." },
      { title: "Submit to the planning authority", description: "Lodge the plans with the state Ministry of Physical Planning." },
      { title: "Pay the permit fee", description: "Pay the permit processing fee for your project." },
      { title: "Collect the permit", description: "Receive the approved building permit once the review is complete." },
    ],
  },
  {
    slug: "marriage-registration",
    name: "Marriage Registration",
    category: "family-social",
    provider: "npc",
    jurisdiction: "FEDERAL",
    mode: "GUIDANCE",
    summary: "Register a marriage and obtain a marriage certificate.",
    description: "Marriages can be registered at the National Population Commission (NPC) registry. This guide explains the documents typically required and the process.",
    eligibility: "Couples who are legally entitled to marry in Nigeria.",
    estimatedTime: "Certificate is issued on the day of registration",
    officialUrl: "https://nationalpopulation.gov.ng",
    requirements: [
      { title: "Completed marriage registration form", isDocument: true },
      { title: "Passport photographs of both spouses", isDocument: true },
      { title: "Proof of identity of both spouses", isDocument: true },
      { title: "Birth certificates or declarations of age", isDocument: true },
    ],
    fees: [{ name: "Marriage registration fee", frequency: "per certificate" }],
    faqs: [
      { question: "Where do I register my marriage?", answer: "Marriage registration is done at NPC marriage registries. Requirements may vary by registry." },
    ],
    related: ["birth-certificate"],
    steps: [
      { title: "Complete the registration form", description: "Fill in the marriage registration form with both spouses' details." },
      { title: "Gather identity documents", description: "Collect identification, passport photographs and declarations of age for both spouses." },
      { title: "Visit the registry", description: "Attend an NPC marriage registry to complete the process." },
      { title: "Receive the certificate", description: "The marriage certificate is issued on the day of registration." },
    ],
  },
  {
    slug: "birth-certificate",
    name: "Birth Certificate Registration",
    category: "identity-civil-records",
    provider: "npc",
    jurisdiction: "FEDERAL",
    mode: "GUIDANCE",
    summary: "Register a birth and obtain a birth certificate.",
    description: "Birth registration with the National Population Commission issues a birth certificate, which is needed for school enrolment, passports and other identity processes.",
    eligibility: "Parents or guardians registering a child born in Nigeria.",
    estimatedTime: "Certificate is issued on registration",
    officialUrl: "https://nationalpopulation.gov.ng",
    requirements: [
      { title: "Completed birth registration form", isDocument: true },
      { title: "Hospital birth notification (where available)", isDocument: true },
      { title: "Parents' identification", isDocument: true },
    ],
    fees: [{ name: "Birth registration fee", frequency: "per certificate" }],
    faqs: [
      { question: "Can I register a birth late?", answer: "Yes — the NPC handles late registration, though additional documentation may be required." },
    ],
    related: ["nin-enrollment"],
    steps: [
      { title: "Obtain a birth notification", description: "Get the hospital or midwife birth notification where available." },
      { title: "Complete the registration form", description: "Fill in the birth registration form with the child's and parents' details." },
      { title: "Provide parents' identification", description: "Submit identification of the parents or guardians." },
      { title: "Receive the certificate", description: "The birth certificate is issued once registration is complete." },
    ],
  },
  {
    slug: "nafdac-product-registration",
    name: "NAFDAC Product Registration",
    category: "health",
    provider: "nafdac",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Register a regulated product with NAFDAC.",
    description: "Food, drugs, cosmetics and other regulated products must be registered with NAFDAC before sale in Nigeria.",
    eligibility: "Manufacturers and importers of regulated products.",
    estimatedTime: "Varies by product category",
    officialUrl: "https://www.nafdac.gov.ng",
    requirements: [
      { title: "Product information and dossier", isDocument: true },
      { title: "Certificate of registration of the company", isDocument: true },
      { title: "Evidence of good manufacturing practice where required", isDocument: true },
      { title: "Product samples for testing", isDocument: true },
    ],
    fees: [{ name: "NAFDAC registration fee", frequency: "per product" }],
    faqs: [
      { question: "Which products need NAFDAC registration?", answer: "Food, drugs, cosmetics, medical devices and similar regulated products generally require registration. Confirm your product category with NAFDAC." },
    ],
    related: ["pharmacy-premises-licence"],
    steps: [
      { title: "Prepare the product dossier", description: "Compile the product information, formulation and labelling details." },
      { title: "Confirm company registration", description: "Ensure your company is registered and recognised by NAFDAC." },
      { title: "Submit the application", description: "File the dossier through the NAFDAC e-portal." },
      { title: "Provide samples", description: "Submit product samples for laboratory testing." },
      { title: "Pay and receive registration", description: "Pay the registration fee and receive your product registration number." },
    ],
  },
  {
    slug: "pharmacy-premises-licence",
    name: "Pharmacy Premises Licence",
    category: "licences-permits",
    provider: "pcn",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Apply for a licence for a pharmacy or premises.",
    description: "The Pharmacists Council of Nigeria (PCN) licenses premises where pharmacy services and medicine sales take place.",
    eligibility: "Registered pharmacists and organisations operating pharmacy premises.",
    estimatedTime: "Varies by application type",
    officialUrl: "https://www.pcn.gov.ng",
    requirements: [
      { title: "Company or individual registration documents", isDocument: true },
      { title: "Certificate of registration as a pharmacist (where applicable)", isDocument: true },
      { title: "Premises address and layout details", isDocument: true },
    ],
    fees: [{ name: "Premises licensing fee", frequency: "per licence period" }],
    faqs: [
      { question: "Who needs a PCN premises licence?", answer: "Pharmacies, patent medicine stores and similar premises need PCN licences to operate legally." },
    ],
    related: ["nafdac-product-registration"],
    steps: [
      { title: "Confirm premises standards", description: "Make sure the premises meets PCN requirements for pharmacy operation." },
      { title: "Prepare premises details", description: "Gather address, layout and professional registration documents." },
      { title: "Submit the application", description: "Apply through the Pharmacists Council of Nigeria." },
      { title: "Pay the licensing fee", description: "Pay the applicable premises licensing fee." },
      { title: "Pass the inspection", description: "An inspection of the premises is carried out before the licence is issued." },
    ],
  },
  {
    slug: "jamb-utme-registration",
    name: "JAMB UTME Registration",
    category: "education",
    provider: "jamb",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Register for the JAMB Unified Tertiary Matriculation Examination.",
    description: "The UTME is the main university entrance examination in Nigeria. Candidates register online and sit the exam at accredited CBT centres.",
    eligibility: "Candidates meeting JAMB's entry requirements for tertiary study.",
    estimatedTime: "Registration closes on a set date each year",
    officialUrl: "https://www.jamb.gov.ng",
    requirements: [
      { title: "Personal and educational details", isDocument: true },
      { title: "Passport photograph", isDocument: true },
      { title: "Valid email address", isDocument: true },
      { title: "Payment of registration fee", description: UNVERIFIED_NOTE },
    ],
    fees: [{ name: "UTME registration fee", frequency: "per examination" }],
    faqs: [
      { question: "When does UTME registration open?", answer: "Registration dates are announced by JAMB each year. Check the JAMB portal for the current calendar." },
    ],
    related: ["nysc-registration"],
    steps: [
      { title: "Create a JAMB profile", description: "Register on the JAMB portal with a valid email address." },
      { title: "Complete the UTME form", description: "Fill in the registration form with your personal and educational details." },
      { title: "Pay the registration fee", description: "Pay the UTME registration fee at an approved bank or channel." },
      { title: "Get your examination slip", description: "Print your examination slip showing your CBT centre and date." },
      { title: "Sit the examination", description: "Attend your accredited CBT centre on the scheduled date." },
    ],
  },
  {
    slug: "nysc-registration",
    name: "NYSC Registration",
    category: "employment",
    provider: "nysc",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Register for the National Youth Service Corps.",
    description: "Graduates from approved institutions register on the NYSC portal for the one-year national service programme.",
    eligibility: "Graduates of approved tertiary institutions who are eligible for national service.",
    estimatedTime: "Registration follows the NYSC call-up schedule",
    officialUrl: "https://portal.nysc.org.ng",
    requirements: [
      { title: "Statement of result or certificate", isDocument: true },
      { title: "School identification / matriculation number", isDocument: true },
      { title: "Passport photograph", isDocument: true },
      { title: "Evidence of previous mobilisation (where applicable)", isDocument: true },
    ],
    fees: [{ name: "NYSC registration", note: "Registration is free; confirm on the portal" }],
    faqs: [
      { question: "Who is exempt from NYSC?", answer: "Exemptions apply in specific circumstances. Confirm eligibility with NYSC." },
    ],
    related: ["jamb-utme-registration"],
    steps: [
      { title: "Check your eligibility", description: "Confirm you meet NYSC eligibility requirements for mobilisation." },
      { title: "Complete the online registration", description: "Fill in the NYSC registration form on the portal." },
      { title: "Upload your documents", description: "Attach your statement of result and identification." },
      { title: "Wait for the call-up letter", description: "Your call-up letter is issued according to the NYSC schedule." },
      { title: "Report to camp", description: "Report to the orientation camp on the date in your call-up letter." },
    ],
  },
  {
    slug: "pension-registration",
    name: "Pension Registration (Contributory Pension Scheme)",
    category: "employment",
    provider: "pencom",
    jurisdiction: "FEDERAL",
    mode: "GUIDANCE",
    summary: "Understand how to register and manage a Retirement Savings Account (RSA).",
    description: "Under the contributory pension scheme, employees open a Retirement Savings Account (RSA) with a licensed Pension Fund Administrator. This guide explains the process.",
    eligibility: "Employees covered by the Contributory Pension Scheme.",
    estimatedTime: "RSA is opened shortly after you begin employment",
    officialUrl: "https://www.pencom.gov.ng",
    requirements: [
      { title: "Employment details and employer's pension registration", isDocument: true },
      { title: "Valid identification", isDocument: true },
      { title: "Passport photograph", isDocument: true },
    ],
    fees: [{ name: "RSA opening", note: "Opening an RSA is free; confirm with your PFA" }],
    faqs: [
      { question: "What is an RSA?", answer: "A Retirement Savings Account is a personal pension account opened with a licensed Pension Fund Administrator." },
    ],
    related: [],
    steps: [
      { title: "Confirm employer registration", description: "Check that your employer is registered with a licensed Pension Fund Administrator (PFA)." },
      { title: "Complete the RSA form", description: "Fill in the Retirement Savings Account application form." },
      { title: "Provide your details", description: "Submit identification and a passport photograph." },
      { title: "Receive your RSA details", description: "Your RSA number and details are issued once the account is opened." },
    ],
  },
  {
    slug: "cac-annual-returns",
    name: "CAC Annual Returns",
    category: "business-corporate",
    provider: "cac",
    jurisdiction: "FEDERAL",
    mode: "GUIDANCE",
    summary: "File annual returns for your registered company.",
    description: "Registered companies must file annual returns with the CAC each year. This guide explains what is involved and the consequences of not filing.",
    eligibility: "Registered companies in Nigeria.",
    estimatedTime: "Annual filing each year",
    officialUrl: "https://www.cac.gov.ng",
    requirements: [
      { title: "Company registration details", isDocument: true },
      { title: "Up-to-date financial statement (where required)", isDocument: true },
    ],
    fees: [{ name: "Annual returns filing fee", frequency: "annual" }],
    faqs: [
      { question: "What happens if I don't file annual returns?", answer: "Failure to file can lead to penalties and, in severe cases, striking the company off the register." },
    ],
    related: ["business-registration"],
    steps: [
      { title: "Prepare financial information", description: "Gather your company's details and any required financial statements." },
      { title: "Log in to the CAC portal", description: "Sign in to the CAC online portal with your company account." },
      { title: "File the annual returns", description: "Complete the annual returns form with the required information." },
      { title: "Pay the filing fee", description: "Pay the annual returns filing fee." },
      { title: "Keep your receipt", description: "Save the filing receipt as proof of compliance." },
    ],
  },
  {
    slug: "road-worthiness-certificate",
    name: "Roadworthiness Certificate (Lagos State)",
    category: "transport",
    provider: "lasg-vio",
    jurisdiction: "LAGOS",
    mode: "EXTERNAL",
    summary: "Obtain a roadworthiness certificate for your vehicle in Lagos State.",
    description: "Vehicle inspection and roadworthiness certification in Lagos State is handled by the Vehicle Inspection Service. The certificate is required to drive legally.",
    eligibility: "Vehicle owners operating in Lagos State.",
    estimatedTime: "Completed on inspection day",
    officialUrl: "https://motor-vehicle.lagosstate.gov.ng",
    requirements: [
      { title: "Vehicle particulars / registration document", isDocument: true },
      { title: "Insurance certificate", isDocument: true },
      { title: "The vehicle itself for inspection", isDocument: true },
    ],
    fees: [{ name: "Roadworthiness test fee", frequency: "per certificate" }],
    faqs: [
      { question: "How often do I need a roadworthiness certificate?", answer: "The certificate has a validity period; renew before it expires. Confirm the current period with the VIO." },
    ],
    related: ["vehicle-registration"],
    steps: [
      { title: "Book a vehicle inspection", description: "Schedule an inspection with the Vehicle Inspection Service." },
      { title: "Bring the vehicle and documents", description: "Take your vehicle, registration papers and insurance certificate to the inspection." },
      { title: "Pass the inspection", description: "The vehicle is checked for roadworthiness." },
      { title: "Pay and collect", description: "Pay the test fee and collect your roadworthiness certificate." },
    ],
  },
  {
    slug: "police-character-certificate",
    name: "Police Character Certificate",
    category: "legal-compliance",
    provider: "npf",
    jurisdiction: "FEDERAL",
    mode: "EXTERNAL",
    summary: "Apply for a police character certificate for employment or travel.",
    description: "The Nigeria Police Force issues character certificates used for employment, immigration and other formal purposes.",
    eligibility: "Individuals who need a formal character clearance.",
    estimatedTime: "Varies by state command",
    officialUrl: "https://npf.gov.ng",
    requirements: [
      { title: "Valid identification", isDocument: true },
      { title: "Passport photograph", isDocument: true },
      { title: "Fingerprint capture at the police office", description: UNVERIFIED_NOTE },
    ],
    fees: [{ name: "Character certificate processing fee", frequency: "per application" }],
    faqs: [
      { question: "Where do I apply?", answer: "Character certificates are issued at state police commands. Requirements can vary between commands." },
    ],
    related: ["national-passport"],
    steps: [
      { title: "Get a request letter", description: "Obtain a letter requesting the character certificate from an employer, institution or your local authority." },
      { title: "Visit the police command", description: "Go to your state police command or approved office." },
      { title: "Complete the application", description: "Fill in the application and complete fingerprint capture." },
      { title: "Pay the processing fee", description: "Pay the applicable processing fee." },
      { title: "Collect the certificate", description: "Return to collect the character certificate once it is ready." },
    ],
  },
  {
    slug: "agricultural-loan",
    name: "Agricultural Loan (Bank of Agriculture)",
    category: "agriculture",
    provider: "boa",
    jurisdiction: "FEDERAL",
    mode: "GUIDANCE",
    summary: "Understand how to apply for agricultural credit.",
    description: "The Bank of Agriculture provides credit to farmers and agricultural enterprises. This guide explains the typical application and what is usually required.",
    eligibility: "Farmers, cooperatives and agricultural enterprises.",
    estimatedTime: "Varies by loan product",
    officialUrl: "https://www.bankofagricultureng.com",
    requirements: [
      { title: "Completed loan application form", isDocument: true },
      { title: "Farm/business profile and plan", isDocument: true },
      { title: "Valid identification", isDocument: true },
      { title: "Guarantor or collateral depending on loan size", description: UNVERIFIED_NOTE },
    ],
    fees: [{ name: "Loan application/processing fees", frequency: "per application" }],
    faqs: [
      { question: "Who can apply for an agricultural loan?", answer: "The Bank of Agriculture serves individual farmers, cooperatives and agri-businesses. Confirm current eligibility with the bank." },
    ],
    related: [],
    steps: [
      { title: "Identify the right loan", description: "Review Bank of Agriculture loan products and pick the one that fits your farm." },
      { title: "Prepare a business plan", description: "Draft a farm or business profile and plan." },
      { title: "Complete the application", description: "Fill in the loan application form." },
      { title: "Provide documents", description: "Submit identification and any guarantor or collateral required for the loan size." },
      { title: "Submit and await review", description: "Submit the application and await the bank's assessment." },
    ],
  },
  {
    slug: "national-health-insurance",
    name: "National Health Insurance (NHIA)",
    category: "health",
    provider: "nhia",
    jurisdiction: "FEDERAL",
    mode: "GUIDANCE",
    summary: "Understand health insurance options under the NHIA.",
    description: "The National Health Insurance Authority oversees health insurance coverage in Nigeria. This guide explains the scheme and how to enrol.",
    eligibility: "Nigerians and legal residents seeking health coverage.",
    estimatedTime: "Enrolment follows the scheme's registration process",
    officialUrl: "https://www.nhis.gov.ng",
    requirements: [
      { title: "Completed enrolment form", isDocument: true },
      { title: "Valid identification", isDocument: true },
      { title: "Passport photograph", isDocument: true },
    ],
    fees: [{ name: "Health insurance premium", frequency: "per period" }],
    faqs: [
      { question: "Is health insurance mandatory?", answer: "Coverage requirements depend on the scheme and employer arrangements. Confirm current rules with NHIA." },
    ],
    related: [],
    steps: [
      { title: "Identify your scheme", description: "Confirm which NHIA scheme applies to you, based on your employment or status." },
      { title: "Complete the enrolment form", description: "Fill in the health insurance enrolment form." },
      { title: "Provide identification", description: "Submit identification and a passport photograph." },
      { title: "Submit your enrolment", description: "Lodge the enrolment through the authority or an accredited HMO." },
      { title: "Receive coverage details", description: "Your coverage and benefits are confirmed once enrolment is processed." },
    ],
  },
];
