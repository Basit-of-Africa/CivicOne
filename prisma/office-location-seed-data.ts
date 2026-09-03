/**
 * Phase 6A — Office Location Seed Data
 * Representative government office locations across Nigeria.
 * These are real, publicly known office addresses.
 */

export interface OfficeLocationSeed {
  agency: string;
  name: string;
  state: string;
  lga?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  hours?: string;
  isHeadquarters: boolean;
}

export const OFFICE_LOCATIONS: OfficeLocationSeed[] = [
  // ---- CAC (Corporate Affairs Commission) ----
  {
    agency: "CAC",
    name: "CAC National Headquarters",
    state: "FCT",
    lga: "Garki",
    address: "17 Abubakar Tafawa Balewa Way, Area 11, Garki, Abuja",
    latitude: 9.0579,
    longitude: 7.4891,
    phone: "+234 9 460 3780",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: true,
  },
  {
    agency: "CAC",
    name: "CAC Lagos Office",
    state: "LAGOS",
    lga: "Lagos Island",
    address: "213 Muritala Mohammed Way, Yaba, Lagos",
    latitude: 6.5158,
    longitude: 3.3896,
    phone: "+234 1 271 4257",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },
  {
    agency: "CAC",
    name: "CAC Kano Office",
    state: "KANO",
    lga: "Kano Municipal",
    address: "124 Murtala Mohammed Way, Kano",
    latitude: 12.0022,
    longitude: 8.5920,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },
  {
    agency: "CAC",
    name: "CAC Port Harcourt Office",
    state: "RIVERS",
    lga: "Port Harcourt",
    address: "21 Aggrey Road, Port Harcourt",
    latitude: 4.8156,
    longitude: 7.0498,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },

  // ---- NIMC (National Identity Management Commission) ----
  {
    agency: "NIMC",
    name: "NIMC National Headquarters",
    state: "FCT",
    lga: "Garki",
    address: "Plot 1403, Shehu Shagari Way, CBD, Abuja",
    latitude: 9.0579,
    longitude: 7.4951,
    phone: "08000616462",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: true,
  },
  {
    agency: "NIMC",
    name: "NIMC Lagos State Office",
    state: "LAGOS",
    lga: "Ikeja",
    address: "202, Obafemi Awolowo Way, Ikeja, Lagos",
    latitude: 6.6000,
    longitude: 3.3500,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },
  {
    agency: "NIMC",
    name: "NIMC Enugu Office",
    state: "ENUGU",
    lga: "Enugu South",
    address: "2 P.O.S.I Road, GRA, Enugu",
    latitude: 6.4413,
    longitude: 7.4988,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },
  {
    agency: "NIMC",
    name: "NIMC Kano Office",
    state: "KANO",
    lga: "Kano Municipal",
    address: "11 Club Road, Kano",
    latitude: 12.0022,
    longitude: 8.5920,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },

  // ---- FRSC (Federal Road Safety Corps) ----
  {
    agency: "FRSC",
    name: "FRSC National Headquarters",
    state: "FCT",
    lga: "Garki",
    address: "Plot 527, Umaru Musa Yar'Adua Expressway, Garki Area 11, Abuja",
    latitude: 9.0579,
    longitude: 7.4891,
    phone: "+234 9 460 4660",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: true,
  },
  {
    agency: "FRSC",
    name: "FRSC Lagos State Command",
    state: "LAGOS",
    lga: "Ikeja",
    address: "Ojodu Berger, Lagos-Ibadan Expressway, Lagos",
    latitude: 6.5750,
    longitude: 3.3550,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },
  {
    agency: "FRSC",
    name: "FRSC Oyo State Command",
    state: "OYO",
    lga: "Ibadan North",
    address: "Old Garage Area, Ibadan, Oyo State",
    latitude: 7.3775,
    longitude: 3.9470,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },

  // ---- NIS (Nigeria Immigration Service) ----
  {
    agency: "NIS",
    name: "NIS National Headquarters",
    state: "FCT",
    lga: "Garki",
    address: "NIS Headquarters, 10 Independent Avenue, Abuja",
    latitude: 9.0600,
    longitude: 7.4900,
    phone: "+234 9 523 8000",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: true,
  },
  {
    agency: "NIS",
    name: "NIS Lagos Command",
    state: "LAGOS",
    lga: "Lagos Island",
    address: "129 Awolowo Road, Ikoyi, Lagos",
    latitude: 6.4541,
    longitude: 3.3947,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },
  {
    agency: "NIS",
    name: "NIS Murtala Muhammed International Airport",
    state: "LAGOS",
    lga: "Ikeja",
    address: "Murtala Muhammed International Airport, Ikeja, Lagos",
    latitude: 6.5774,
    longitude: 3.3214,
    hours: "Mon-Sun 24 hours",
    isHeadquarters: false,
  },

  // ---- FIRS (Federal Inland Revenue Service) ----
  {
    agency: "FIRS",
    name: "FIRS National Headquarters",
    state: "FCT",
    lga: "Garki",
    address: "Revenue House, 15 Lagos Street, Area 10, Garki, Abuja",
    latitude: 9.0579,
    longitude: 7.4891,
    phone: "+234 9 460 4291",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: true,
  },
  {
    agency: "FIRS",
    name: "FIRS Lagos Office",
    state: "LAGOS",
    lga: "Lagos Island",
    address: "9 Marcel Owonbiyi Street, Victoria Island, Lagos",
    latitude: 6.4281,
    longitude: 3.4219,
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: false,
  },

  // ---- NPC (National Population Commission) ----
  {
    agency: "NPC",
    name: "NPC National Headquarters",
    state: "FCT",
    lga: "Garki",
    address: "POPNET Building, 4271 Street, Area 11, Garki, Abuja",
    latitude: 9.0579,
    longitude: 7.4891,
    phone: "+234 9 460 3355",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: true,
  },

  // ---- NYSC (National Youth Service Corps) ----
  {
    agency: "NYSC",
    name: "NYSC National Directorate Headquarters",
    state: "FCT",
    lga: "Garki",
    address: "NYSC Permanent Orientation Camp, Kubwa, Abuja",
    latitude: 9.1200,
    longitude: 7.3700,
    phone: "+234 9 234 1132",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: true,
  },

  // ---- JAMB (Joint Admissions and Matriculation Board) ----
  {
    agency: "JAMB",
    name: "JAMB National Headquarters",
    state: "FCT",
    lga: "Bwari",
    address: "JAMB National Headquarters, Bwari, Abuja",
    latitude: 9.2800,
    longitude: 7.3800,
    phone: "+234 9 225 0001",
    hours: "Mon-Fri 8am-4pm",
    isHeadquarters: true,
  },
];
