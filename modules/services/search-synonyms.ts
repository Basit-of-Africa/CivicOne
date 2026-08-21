/**
 * Keyword synonyms and natural-language intents for service search.
 *
 * Search first expands the user's query with synonyms, then runs
 * PostgreSQL full-text search. Intents map natural phrasing to canonical
 * service terms (and related services) without any network call.
 */

export const SYNONYM_MAP: Record<string, string[]> = {
  company: ["business", "cac", "incorporate", "incorporation"],
  business: ["company", "enterprise", "firm", "startup"],
  registration: ["register", "enrolment", "enroll", "sign up"],
  register: ["registration"],
  tin: ["tax", "firs", "tax identification"],
  passport: ["travel document", "international passport", "nis"],
  licence: ["license", "permit", "licensing"],
  driver: ["driving", "frsc"],
  nin: ["national identification", "national id", "nimc", "identity number"],
  birth: ["born", "birth certificate"],
  marriage: ["wedding", "marriage certificate"],
  vehicle: ["car", "automobile", "number plate", "plate"],
  land: ["property", "certificate of occupancy", "c of o", "title"],
  building: ["construction", "physical planning", "permit"],
  pension: ["rsa", "retirement", "pencom"],
  loan: ["credit", "finance", "borrowing"],
  health: ["insurance", "nhia", "medical"],
  pharmacy: ["pcn", "pharmacist", "premises"],
  product: ["nafdac", "registration"],
  youth: ["nysc", "corps", "national service"],
  exam: ["jamb", "utme", "examination"],
};

export interface IntentMatch {
  canonicalTerms: string[];
  related: string[];
}

export const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  canonicalTerms: string[];
  related: string[];
}> = [
  {
    pattern: /(start|open|register|incorporate).{0,12}(business|company|enterprise|firm)/i,
    canonicalTerms: ["business", "company", "registration"],
    related: ["tin-registration", "building-permit", "nafdac-product-registration"],
  },
  {
    pattern: /(driver|driving).{0,8}(licence|license)/i,
    canonicalTerms: ["driver", "licence"],
    related: ["vehicle-registration", "road-worthiness-certificate"],
  },
  {
    pattern: /(apply for|renew|get).{0,8}(passport)/i,
    canonicalTerms: ["passport"],
    related: ["international-passport-renewal", "nin-enrollment"],
  },
  {
    pattern: /(get|register|apply for).{0,8}(nin|national id)/i,
    canonicalTerms: ["nin", "enrollment"],
    related: ["national-passport", "driver-licence"],
  },
  {
    pattern: /(file|do|complete).{0,8}(tax|tin)/i,
    canonicalTerms: ["tin", "tax"],
    related: ["business-registration"],
  },
];

function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Expand a raw query with synonym terms for full-text search. */
export function expandQuery(raw: string): string {
  const words = normalise(raw).split(" ");
  const expanded = new Set<string>(words);
  for (const word of words) {
    const synonyms = SYNONYM_MAP[word];
    if (synonyms) {
      for (const s of synonyms) expanded.add(s);
    }
  }
  return [...expanded].join(" ");
}

/** Match a raw query against known natural-language intents. */
export function matchIntent(raw: string): IntentMatch | null {
  for (const intent of INTENT_PATTERNS) {
    if (intent.pattern.test(raw)) {
      return { canonicalTerms: intent.canonicalTerms, related: intent.related };
    }
  }
  return null;
}
