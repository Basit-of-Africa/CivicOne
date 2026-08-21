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
