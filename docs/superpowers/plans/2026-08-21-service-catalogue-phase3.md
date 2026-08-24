# Phase 3 Service Catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Nigerian public-service discovery layer so users can answer "What do I need to do?" — search, discover, filter, view and save services without needing to know which agency provides them.

**Architecture:** A `modules/services` feature module (following the `modules/identity` pattern: validators → service → actions → components) backed by new Prisma tables (`ServiceCategory`, `ServiceProvider`, `Service`, `ServiceRequirement`, `ServiceFAQ`, `ServiceFee`, `Jurisdiction`, `ServiceRelated`, `SavedService`). Search combines PostgreSQL full-text search over a generated `tsvector` column with a code-level synonym/intent map. All catalogue content is seeded demo data, clearly labelled.

**Tech Stack:** Next.js 15 App Router (RSC + Server Actions), Prisma 6 + PostgreSQL 15, Zod, Vitest, existing `components/ui/*` primitives. No new dependencies.

## Global Constraints

- Never claim real, verified fees or requirements. Use "Verify current fee with official provider." for all fee amounts and "Demo information. Confirm current requirements with the official provider." for unverified requirements.
- Every service page and list keeps the trust line "CivicOne is an independent technology platform. It is not a government agency." nearby.
- Do NOT build service applications. CTA for `INTEGRATED` mode is a disabled "Coming soon" button.
- Service slugs are kebab-case (`business-registration`). Service id prefix `srv_`, category `sc_`, provider `spv_`, jurisdiction `jsd_`, requirement `srq_`, faq `sfq_`, fee `sfee_`, saved `svs_`.
- Identity verification status must remain visible throughout the signed-in shell (Task 10).
- Follow Phase 1/2 conventions: `"use server"` actions → `withActionResult`, `server-only` services, `generateId("<prefix>")`, Zod server-side validation, existing design tokens, existing `@/components/ui/*` primitives.
- No new dependencies.

---

### Task 1: Prisma schema for the service catalogue

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260821000000_services_phase3/migration.sql`
- Modify: `tests/seed.test.ts` (new)

**Interfaces:**
- Produces: Prisma models `ServiceCategory`, `ServiceProvider`, `Jurisdiction`, `Service`, `ServiceRequirement`, `ServiceFAQ`, `ServiceFee`, `ServiceRelated`, `SavedService`; enums `ServiceMode { GUIDANCE EXTERNAL INTEGRATED }`, `JurisdictionLevel { FEDERAL STATE LOCAL }`. `Service.searchText` is a plain `String` column; the `search_vector tsvector` is generated in SQL.

- [ ] **Step 1: Add models to `prisma/schema.prisma`**

Append after the identity section:

```prisma
// ---------------------------------------------------------------------------
// Service catalogue (Phase 3)
// ---------------------------------------------------------------------------

enum ServiceMode {
  GUIDANCE // CivicOne explains the process
  EXTERNAL // CivicOne prepares the user and sends them to the official provider
  INTEGRATED // Future authorised API integration (not built yet)
}

enum JurisdictionLevel {
  FEDERAL
  STATE
  LOCAL
}

model ServiceCategory {
  id          String   @id @db.VarChar(64)
  slug        String   @unique @db.VarChar(80)
  name        String   @db.VarChar(120)
  description String?  @db.VarChar(255)
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  services Service[]

  @@map("service_categories")
}

model ServiceProvider {
  id          String   @id @db.VarChar(64)
  slug        String   @unique @db.VarChar(80)
  name        String   @db.VarChar(160)
  abbreviation String? @db.VarChar(40)
  description String?  @db.Text
  officialUrl String?  @map("official_url") @db.VarChar(512)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  services Service[]

  @@map("service_providers")
}

model Jurisdiction {
  id          String            @id @db.VarChar(64)
  code        String            @unique @db.VarChar(40) // e.g. FEDERAL, LAGOS, LAGOS_ISLAND
  name        String            @db.VarChar(120)
  level       JurisdictionLevel
  parentId    String?           @map("parent_id") @db.VarChar(64)
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  parent   Jurisdiction?  @relation("JurisdictionHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children Jurisdiction[] @relation("JurisdictionHierarchy")

  @@index([parentId])
  @@map("jurisdictions")
}

model Service {
  id               String      @id @db.VarChar(64)
  slug             String      @unique @db.VarChar(120)
  categoryId       String      @map("category_id") @db.VarChar(64)
  providerId       String      @map("provider_id") @db.VarChar(64)
  jurisdictionId   String      @map("jurisdiction_id") @db.VarChar(64)
  mode             ServiceMode
  name             String      @db.VarChar(200)
  summary          String      @db.VarChar(300)
  description      String      @db.Text
  eligibility      String?     @db.Text
  estimatedTime    String?     @map("estimated_time") @db.VarChar(120)
  officialUrl      String?     @map("official_url") @db.VarChar(512)
  searchText       String      @default("") @map("search_text") @db.Text
  isDemo           Boolean     @default(true) @map("is_demo")
  isActive         Boolean     @default(true) @map("is_active")
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")

  category     ServiceCategory     @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  provider     ServiceProvider     @relation(fields: [providerId], references: [id], onDelete: Restrict)
  jurisdiction Jurisdiction        @relation(fields: [jurisdictionId], references: [id], onDelete: Restrict)
  requirements ServiceRequirement[]
  faqs         ServiceFAQ[]
  fees         ServiceFee[]
  relatedFrom  ServiceRelated[]    @relation("ServiceRelatedFrom")
  relatedTo    ServiceRelated[]    @relation("ServiceRelatedTo")
  savedBy      SavedService[]

  @@index([categoryId])
  @@index([providerId])
  @@index([jurisdictionId])
  @@index([isActive])
  @@map("services")
}

model ServiceRequirement {
  id          String   @id @db.VarChar(64)
  serviceId   String   @map("service_id") @db.VarChar(64)
  title       String   @db.VarChar(200)
  description String?  @db.Text
  isDocument  Boolean  @default(false) @map("is_document")
  isVerified  Boolean  @default(false) @map("is_verified")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@index([serviceId])
  @@map("service_requirements")
}

model ServiceFAQ {
  id        String   @id @db.VarChar(64)
  serviceId String   @map("service_id") @db.VarChar(64)
  question  String   @db.VarChar(300)
  answer    String   @db.Text
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@index([serviceId])
  @@map("service_faqs")
}

model ServiceFee {
  id        String   @id @db.VarChar(64)
  serviceId String   @map("service_id") @db.VarChar(64)
  name      String   @db.VarChar(200)
  amount    Decimal? @db.Decimal(14, 2)
  currency  String   @default("NGN") @db.VarChar(3)
  frequency String?  @db.VarChar(40) // one-off, annual, per-application...
  note      String?  @db.VarChar(255)
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@index([serviceId])
  @@map("service_fees")
}

model ServiceRelated {
  id             String   @id @db.VarChar(64)
  serviceId      String   @map("service_id") @db.VarChar(64)
  relatedId      String   @map("related_id") @db.VarChar(64)
  createdAt      DateTime @default(now()) @map("created_at")

  service  Service @relation("ServiceRelatedFrom", fields: [serviceId], references: [id], onDelete: Cascade)
  related  Service @relation("ServiceRelatedTo", fields: [relatedId], references: [id], onDelete: Cascade)

  @@unique([serviceId, relatedId])
  @@index([relatedId])
  @@map("service_related")
}

model SavedService {
  id        String   @id @db.VarChar(64)
  userId    String   @map("user_id") @db.VarChar(64)
  serviceId String   @map("service_id") @db.VarChar(64)
  createdAt DateTime @default(now()) @map("created_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([userId, serviceId])
  @@index([serviceId])
  @@map("saved_services")
}
```

- [ ] **Step 2: Add `savedServices` to the `User` model**

In `prisma/schema.prisma`, in `model User`, add to the relation list:

```prisma
  savedServices      SavedService[]
```

- [ ] **Step 3: Generate the migration SQL (non-interactive)**

```bash
mkdir -p prisma/migrations/20260821000000_services_phase3
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "postgresql://postgres:postgres@localhost:5432/civicone_shadow" \
  --script > prisma/migrations/20260821000000_services_phase3/migration.sql
```

- [ ] **Step 4: Append search-column SQL to the generated migration**

The `migrate diff` output will create the tables but NOT the generated tsvector column. Append to `prisma/migrations/20260821000000_services_phase3/migration.sql`:

```sql
-- Full-text search support (generated tsvector over denormalised search text)
ALTER TABLE services ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', search_text)) STORED;
CREATE INDEX services_search_vector_idx ON services USING GIN (search_vector);
```

- [ ] **Step 5: Apply migration to dev and test DBs**

```bash
npm run db:deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
npx prisma generate
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260821000000_services_phase3/migration.sql
git commit -m "feat(services): add service catalogue schema and migration"
```

---

### Task 2: Seed jurisdictions (Federal + 36 states + FCT + LGAs), categories, providers

**Files:**
- Create: `prisma/service-catalogue-data.ts`
- Modify: `prisma/seed.ts`
- Create: `tests/seed.test.ts`

**Interfaces:**
- Produces: seeded rows for `jurisdictions` (code `FEDERAL`, codes like `LAGOS`, `LAGOS_LAGOS_ISLAND`), `service_categories` (13), `service_providers` (16), and all 22 demo services (Task 3 fills services; this task fills jurisdictions, categories, providers only).
- Consumes: `generateId` from `lib/id`.

- [ ] **Step 1: Create `prisma/service-catalogue-data.ts` (part 1 — jurisdictions)**

```ts
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
```

- [ ] **Step 2: Add categories and providers to `prisma/service-catalogue-data.ts`**

```ts
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
```

- [ ] **Step 3: Write the failing test `tests/seed.test.ts`**

```ts
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { JURISDICTIONS, SERVICE_CATEGORIES_SEED, SERVICE_PROVIDERS_SEED } from "../prisma/service-catalogue-data";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});

describe("service catalogue seed data", () => {
  it("defines all 13 categories", () => {
    expect(SERVICE_CATEGORIES_SEED).toHaveLength(13);
    const slugs = SERVICE_CATEGORIES_SEED.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(13);
  });

  it("defines the 36 states plus FCT", () => {
    const states = JURISDICTIONS.filter((j) => j.level === "STATE");
    expect(states).toHaveLength(37);
    expect(JURISDICTIONS.some((j) => j.code === "FEDERAL" && j.level === "FEDERAL")).toBe(true);
  });

  it("places every LGA under a state parent", () => {
    const local = JURISDICTIONS.filter((j) => j.level === "LOCAL");
    expect(local.length).toBeGreaterThan(0);
    const stateCodes = new Set(JURISDICTIONS.filter((j) => j.level === "STATE").map((j) => j.code));
    for (const lga of local) {
      expect(stateCodes.has(lga.parent!)).toBe(true);
    }
  });

  it("defines every provider with a slug and official URL", () => {
    expect(SERVICE_PROVIDERS_SEED.length).toBeGreaterThanOrEqual(15);
    for (const p of SERVICE_PROVIDERS_SEED) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.officialUrl).toMatch(/^https:\/\//);
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/seed.test.ts`
Expected: FAIL — module `../prisma/service-catalogue-data` not found.

- [ ] **Step 5: Update `prisma/seed.ts` to seed jurisdictions, categories and providers**

Add imports at the top of `prisma/seed.ts`:

```ts
import {
  JURISDICTIONS,
  SERVICE_CATEGORIES_SEED,
  SERVICE_PROVIDERS_SEED,
} from "./service-catalogue-data";
```

Append inside `main()`, after the identity-provider section:

```ts
  console.log("Seeding jurisdictions...");
  for (const j of JURISDICTIONS) {
    const parent = j.parent
      ? { connect: { code: j.parent } }
      : undefined;
    await prisma.jurisdiction.upsert({
      where: { code: j.code },
      update: { name: j.name, level: j.level, ...(parent ? { parentId: undefined } : {}) },
      create: {
        id: generateId("jsd"),
        code: j.code,
        name: j.name,
        level: j.level,
        ...(parent ? { parent: parent as never } : {}),
      },
    });
  }
  console.log(`Done. ${await prisma.jurisdiction.count()} jurisdictions ready.`);

  console.log("Seeding service categories...");
  for (const [index, c] of SERVICE_CATEGORIES_SEED.entries()) {
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, sortOrder: index },
      create: {
        id: generateId("sc"),
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: index,
      },
    });
  }
  console.log(`Done. ${await prisma.serviceCategory.count()} categories ready.`);

  console.log("Seeding service providers...");
  for (const p of SERVICE_PROVIDERS_SEED) {
    await prisma.serviceProvider.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        abbreviation: p.abbreviation,
        description: p.description,
        officialUrl: p.officialUrl,
      },
      create: {
        id: generateId("spv"),
        slug: p.slug,
        name: p.name,
        abbreviation: p.abbreviation,
        description: p.description,
        officialUrl: p.officialUrl,
      },
    });
  }
  console.log(`Done. ${await prisma.serviceProvider.count()} providers ready.`);
```

Note: keep the `parent` connection handled inside `create` only so a re-seed does not break the `@@unique` constraint path.

- [ ] **Step 6: Run test to verify it passes**

Run: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma db seed && npx vitest run tests/seed.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add prisma/service-catalogue-data.ts prisma/seed.ts tests/seed.test.ts
git commit -m "feat(services): seed jurisdictions, categories and providers"
```

---

### Task 3: Seed the 22 demo services

**Files:**
- Modify: `prisma/service-catalogue-data.ts`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `JurisdictionSeed` structures from Task 2.
- Produces: `DEMO_SERVICES_SEED` — structured demo services (name, slug, category, provider, jurisdiction, mode, summary, description, eligibility, estimatedTime, officialUrl, requirements with `isVerified`, fees with `amount: null`, faqs, related slugs). Service search text built from name + summary + description + provider name + category name.

- [ ] **Step 1: Add the demo services data to `prisma/service-catalogue-data.ts`**

```ts
export interface RequirementSeed {
  title: string;
  description?: string;
  isDocument?: boolean;
  isVerified?: boolean;
}

export interface FeeSeed {
  name: string;
  frequency?: string;
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
  },
];
```

Note: fee amounts are intentionally omitted (`amount: null`) — the UI always shows "Verify current fee with official provider." Never invent an amount.

- [ ] **Step 2: Extend `prisma/seed.ts` to seed services**

Add imports:

```ts
import { DEMO_SERVICES_SEED } from "./service-catalogue-data";
```

Append inside `main()`:

```ts
  console.log("Seeding demo services...");
  for (const s of DEMO_SERVICES_SEED) {
    const category = await prisma.serviceCategory.findUnique({ where: { slug: s.category } });
    const provider = await prisma.serviceProvider.findUnique({ where: { slug: s.provider } });
    const jurisdiction = await prisma.jurisdiction.findUnique({ where: { code: s.jurisdiction } });
    if (!category || !provider || !jurisdiction) {
      throw new Error(`Seed error: service ${s.slug} references missing ${s.category}/${s.provider}/${s.jurisdiction}`);
    }
    const searchText = [
      s.name,
      s.summary,
      s.description,
      category.name,
      provider.name,
      provider.abbreviation ?? "",
      s.eligibility,
    ].join(" ");

    const service = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        categoryId: category.id,
        providerId: provider.id,
        jurisdictionId: jurisdiction.id,
        mode: s.mode,
        name: s.name,
        summary: s.summary,
        description: s.description,
        eligibility: s.eligibility,
        estimatedTime: s.estimatedTime ?? null,
        officialUrl: s.officialUrl,
        searchText,
        isDemo: true,
        isActive: true,
      },
      create: {
        id: generateId("srv"),
        slug: s.slug,
        categoryId: category.id,
        providerId: provider.id,
        jurisdictionId: jurisdiction.id,
        mode: s.mode,
        name: s.name,
        summary: s.summary,
        description: s.description,
        eligibility: s.eligibility,
        estimatedTime: s.estimatedTime ?? null,
        officialUrl: s.officialUrl,
        searchText,
        isDemo: true,
        isActive: true,
      },
    });

    // Requirements
    await prisma.serviceRequirement.deleteMany({ where: { serviceId: service.id } });
    for (const [index, r] of s.requirements.entries()) {
      await prisma.serviceRequirement.create({
        data: {
          id: generateId("srq"),
          serviceId: service.id,
          title: r.title,
          description: r.description ?? null,
          isDocument: r.isDocument ?? false,
          isVerified: r.isVerified ?? false,
          sortOrder: index,
        },
      });
    }

    // Fees
    await prisma.serviceFee.deleteMany({ where: { serviceId: service.id } });
    for (const [index, f] of s.fees.entries()) {
      await prisma.serviceFee.create({
        data: {
          id: generateId("sfee"),
          serviceId: service.id,
          name: f.name,
          amount: null,
          frequency: f.frequency ?? null,
          note: f.note ?? null,
          sortOrder: index,
        },
      });
    }

    // FAQs
    await prisma.serviceFAQ.deleteMany({ where: { serviceId: service.id } });
    for (const [index, faq] of s.faqs.entries()) {
      await prisma.serviceFAQ.create({
        data: {
          id: generateId("sfq"),
          serviceId: service.id,
          question: faq.question,
          answer: faq.answer,
          sortOrder: index,
        },
      });
    }
  }

  // Related services (second pass, after all services exist)
  for (const s of DEMO_SERVICES_SEED) {
    const service = await prisma.service.findUnique({ where: { slug: s.slug } });
    if (!service) continue;
    await prisma.serviceRelated.deleteMany({ where: { serviceId: service.id } });
    for (const relatedSlug of s.related) {
      const related = await prisma.service.findUnique({ where: { slug: relatedSlug } });
      if (related) {
        await prisma.serviceRelated.create({
          data: { id: generateId("srl"), serviceId: service.id, relatedId: related.id },
        });
      }
    }
  }
  console.log(`Done. ${await prisma.service.count()} demo services ready.`);
```

- [ ] **Step 3: Run the seed and verify counts**

```bash
npm run db:seed
psql postgresql://postgres:postgres@localhost:5432/civicone -c "SELECT mode, count(*) FROM services GROUP BY mode;"
psql postgresql://postgres:postgres@localhost:5432/civicone -c "SELECT count(*) FROM services WHERE is_demo = true;"
```

Expected: `count(*)` for services ≥ 20; every category has ≥1 service (check with `SELECT c.name, count(s.id) FROM service_categories c LEFT JOIN services s ON s.category_id = c.id GROUP BY c.name;`).

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/seed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/service-catalogue-data.ts prisma/seed.ts
git commit -m "feat(services): seed demo service catalogue"
```

---

### Task 4: Search synonyms and intent mapping

**Files:**
- Create: `modules/services/search-synonyms.ts`
- Create: `tests/search-synonyms.test.ts`

**Interfaces:**
- Produces: `SYNONYM_MAP: Record<string, string[]>` (canonical term → alternative terms), `INTENT_PATTERNS: Array<{ pattern: RegExp; canonicalTerms: string[]; related: string[] }>`, `expandQuery(raw: string): string` (normalises + appends synonym terms), `matchIntent(raw: string): { canonicalTerms: string[]; related: string[] } | null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { expandQuery, matchIntent } from "@/modules/services/search-synonyms";

describe("search synonyms", () => {
  it("maps 'register company' to business registration terms", () => {
    const expanded = expandQuery("register company");
    expect(expanded).toContain("company");
    expect(expanded).toContain("business");
    expect(expanded).toContain("registration");
  });

  it("maps 'driver licence' to licence terms", () => {
    expect(expandQuery("driver licence")).toMatch(/driver/);
  });

  it("keeps plain queries intact", () => {
    expect(expandQuery("passport")).toContain("passport");
  });
});

describe("intent matching", () => {
  it("matches 'I want to start a business'", () => {
    const intent = matchIntent("I want to start a business");
    expect(intent).not.toBeNull();
    expect(intent?.canonicalTerms.join(" ")).toMatch(/business/);
    expect(intent?.related.length).toBeGreaterThan(0);
  });

  it("matches 'register company'", () => {
    const intent = matchIntent("register company");
    expect(intent?.canonicalTerms.join(" ")).toMatch(/business/);
  });

  it("returns null for unrelated queries", () => {
    expect(matchIntent("what time is it")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/search-synonyms.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `modules/services/search-synonyms.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/search-synonyms.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/services/search-synonyms.ts tests/search-synonyms.test.ts
git commit -m "feat(services): add search synonym and intent mapping"
```

---

### Task 5: Service search service (FTS + intent) and view types

**Files:**
- Create: `modules/services/service.ts`
- Create: `tests/services-search.test.ts`

**Interfaces:**
- Consumes: `expandQuery`, `matchIntent` (Task 4).
- Produces: `ServiceCardView`, `ServiceDetailView`, `searchServices({ query?, category?, jurisdiction?, mode? })`, `getServiceBySlug(slug)`, `getServiceCategories()`, `getJurisdictionOptions()`, `getServiceSearchTermsForSlug(slug)`.

- [ ] **Step 1: Write the failing test**

```ts
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

import { db } from "@/server/db";
import { searchServices, getServiceBySlug, getServiceCategories } from "@/modules/services/service";
import { expandQuery } from "@/modules/services/search-synonyms";

beforeAll(async () => {
  cookieJar.clear();
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});

describe("service search (real database)", () => {
  it("returns business registration for 'register company'", async () => {
    const results = await searchServices({ query: "register company" });
    expect(results.some((s) => s.slug === "business-registration")).toBe(true);
  });

  it("returns driver licence for 'driver licence'", async () => {
    const results = await searchServices({ query: "driver licence" });
    expect(results.some((s) => s.slug === "driver-licence")).toBe(true);
  });

  it("returns passport services for 'passport'", async () => {
    const results = await searchServices({ query: "passport" });
    expect(results.some((s) => s.slug === "national-passport")).toBe(true);
  });

  it("filters by category", async () => {
    const results = await searchServices({ category: "transport" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.categorySlug).toBe("transport");
    }
  });

  it("filters by jurisdiction code", async () => {
    const results = await searchServices({ jurisdiction: "LAGOS" });
    for (const r of results) {
      expect(r.jurisdictionCode).toBe("LAGOS");
    }
  });

  it("returns the full detail view for a slug", async () => {
    const detail = await getServiceBySlug("business-registration");
    expect(detail).not.toBeNull();
    expect(detail!.requirements.length).toBeGreaterThan(0);
    expect(detail!.fees.length).toBeGreaterThan(0);
    expect(detail!.faqs.length).toBeGreaterThan(0);
    expect(detail!.provider.name).toBeTruthy();
  });

  it("lists all 13 categories", async () => {
    const categories = await getServiceCategories();
    expect(categories).toHaveLength(13);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services-search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `modules/services/service.ts`**

```ts
import "server-only";
import type { Prisma, ServiceMode } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { expandQuery, matchIntent } from "./search-synonyms";

export interface ServiceCardView {
  id: string;
  slug: string;
  name: string;
  summary: string;
  mode: ServiceMode;
  isDemo: boolean;
  estimatedTime: string | null;
  categorySlug: string;
  categoryName: string;
  providerSlug: string;
  providerName: string;
  providerAbbreviation: string | null;
  jurisdictionCode: string;
  jurisdictionName: string;
  jurisdictionLevel: string;
}

export interface ServiceDetailView extends ServiceCardView {
  description: string;
  eligibility: string | null;
  officialUrl: string | null;
  requirements: Array<{
    title: string;
    description: string | null;
    isDocument: boolean;
    isVerified: boolean;
  }>;
  fees: Array<{ name: string; frequency: string | null; note: string | null }>;
  faqs: Array<{ question: string; answer: string }>;
  related: ServiceCardView[];
}

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  summary: true,
  mode: true,
  isDemo: true,
  estimatedTime: true,
  category: { select: { slug: true, name: true } },
  provider: { select: { slug: true, name: true, abbreviation: true } },
  jurisdiction: { select: { code: true, name: true, level: true } },
} satisfies Prisma.ServiceSelect;

function toCard(row: {
  id: string;
  slug: string;
  name: string;
  summary: string;
  mode: ServiceMode;
  isDemo: boolean;
  estimatedTime: string | null;
  category: { slug: string; name: string };
  provider: { slug: string; name: string; abbreviation: string | null };
  jurisdiction: { code: string; name: string; level: string };
}): ServiceCardView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    mode: row.mode,
    isDemo: row.isDemo,
    estimatedTime: row.estimatedTime,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    providerSlug: row.provider.slug,
    providerName: row.provider.name,
    providerAbbreviation: row.provider.abbreviation,
    jurisdictionCode: row.jurisdiction.code,
    jurisdictionName: row.jurisdiction.name,
    jurisdictionLevel: row.jurisdiction.level,
  };
}

export interface SearchFilters {
  query?: string;
  category?: string;
  jurisdiction?: string;
  mode?: ServiceMode;
}

export async function searchServices(
  filters: SearchFilters = {},
): Promise<ServiceCardView[]> {
  const where: Prisma.ServiceWhereInput = { isActive: true };

  if (filters.category) {
    where.category = { slug: filters.category };
  }
  if (filters.jurisdiction) {
    where.jurisdiction = { code: filters.jurisdiction };
  }
  if (filters.mode) {
    where.mode = filters.mode;
  }

  const query = filters.query?.trim();
  if (query) {
    const expanded = expandQuery(query);
    const intent = matchIntent(query);

    let ids: string[] | null = null;
    if (expanded) {
      const rows = await db.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id FROM services
          WHERE is_active = true
            AND search_vector @@ websearch_to_tsquery('english', ${expanded})
          ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${expanded})) DESC
          LIMIT 50
        `,
      );
      ids = rows.map((r) => r.id);
    }

    const candidateIds = intent
      ? await (async () => {
          const named = await db.service.findMany({
            where: {
              isActive: true,
              OR: [
                { name: { search: intent.canonicalTerms.join(" ") } },
                ...intent.canonicalTerms.map((t) => ({ summary: { contains: t, mode: "insensitive" as const } })),
              ],
            },
            select: { id: true },
            take: 20,
          });
          return named.map((s) => s.id);
        })()
      : [];

    const merged = [...new Set([...(ids ?? []), ...candidateIds])];
    if (merged.length === 0) {
      where.id = { in: ["__none__"] };
    } else {
      where.id = { in: merged };
    }
  }

  const rows = await db.service.findMany({
    where,
    select: cardSelect,
    orderBy: [{ isDemo: "asc" }, { name: "asc" }],
    take: 50,
  });

  return rows.map(toCard);
}

export async function getServiceCategories() {
  return db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getJurisdictionOptions() {
  return db.jurisdiction.findMany({
    where: { level: { in: ["FEDERAL", "STATE"] } },
    orderBy: { name: "asc" },
  });
}

export async function getServiceBySlug(
  slug: string,
): Promise<ServiceDetailView | null> {
  const row = await db.service.findUnique({
    where: { slug, isActive: true },
    select: {
      ...cardSelect,
      description: true,
      eligibility: true,
      officialUrl: true,
      requirements: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true, isDocument: true, isVerified: true } },
      fees: { orderBy: { sortOrder: "asc" }, select: { name: true, frequency: true, note: true } },
      faqs: { orderBy: { sortOrder: "asc" }, select: { question: true, answer: true } },
      relatedFrom: {
        select: { related: { select: cardSelect } },
      },
    },
  });

  if (!row) return null;

  return {
    ...toCard(row),
    description: row.description,
    eligibility: row.eligibility,
    officialUrl: row.officialUrl,
    requirements: row.requirements,
    fees: row.fees,
    faqs: row.faqs,
    related: row.relatedFrom.map((r) => toCard(r.related)),
  };
}

export async function getRelatedBySlugs(slugs: string[]): Promise<ServiceCardView[]> {
  if (slugs.length === 0) return [];
  const rows = await db.service.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: cardSelect,
  });
  return rows.map(toCard);
}

export function getServiceSearchTermsForSlug(slug: string): string[] {
  const query = slug.replace(/-/g, " ");
  return query.split(" ").filter(Boolean);
}
```

Note: `getServiceSearchTermsForSlug` is a small helper used by search/UX for slug-derived terms; it is intentionally pure so later tasks can reference it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/services-search.test.ts`
Expected: PASS (7 tests). If `db.$queryRaw` fails on the raw SQL, confirm the `services_search_vector_idx` index exists (Task 1, Step 4) and re-run `npm run db:deploy`.

- [ ] **Step 5: Commit**

```bash
git add modules/services/service.ts tests/services-search.test.ts
git commit -m "feat(services): add full-text and intent search"
```

---

### Task 6: RBAC permission + validators + save/unsave service

**Files:**
- Modify: `server/rbac.ts`
- Create: `modules/services/validators.ts`
- Modify: `modules/services/service.ts`
- Create: `modules/services/actions.ts`
- Modify: `tests/rbac.test.ts`
- Create: `tests/services-save.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `assertPermission`, `withActionResult`, `generateId`, `logAudit`, `getRequestContext`.
- Produces: `PERMISSIONS.SERVICES_SAVE = "services:save"` (granted to USER, PROFESSIONAL, SERVICE_ADMIN, CONTENT_ADMIN); `saveServiceAction(serviceId)`, `unsaveServiceAction(serviceId)`; `getSavedServices()`, `getSavedServiceIds()`.

- [ ] **Step 1: Add the permission to `server/rbac.ts`**

Add to `PERMISSIONS`:

```ts
  SERVICES_SAVE: "services:save",
```

Add `PERMISSIONS.SERVICES_SAVE` to USER, PROFESSIONAL, SERVICE_ADMIN and CONTENT_ADMIN role arrays and to `SUPER_ADMIN_OVERRIDES`.

- [ ] **Step 2: Update `tests/rbac.test.ts`**

Add a test:

```ts
  it("grants services:save to USER, PROFESSIONAL, SERVICE_ADMIN and CONTENT_ADMIN", () => {
    expect(hasPermission(["USER"], PERMISSIONS.SERVICES_SAVE)).toBe(true);
    expect(hasPermission(["PROFESSIONAL"], PERMISSIONS.SERVICES_SAVE)).toBe(true);
    expect(hasPermission(["SERVICE_ADMIN"], PERMISSIONS.SERVICES_SAVE)).toBe(true);
    expect(hasPermission(["CONTENT_ADMIN"], PERMISSIONS.SERVICES_SAVE)).toBe(true);
    expect(hasPermission(["IDENTITY_ADMIN"], PERMISSIONS.SERVICES_SAVE)).toBe(false);
  });
```

- [ ] **Step 3: Create `modules/services/validators.ts`**

```ts
import { z } from "zod";

export const serviceIdSchema = z.object({
  serviceId: z
    .string()
    .trim()
    .min(1, "Service is required")
    .regex(/^srv_[A-Z0-9]+$/, "Invalid service identifier"),
});

export type ServiceIdInput = z.infer<typeof serviceIdSchema>;
```

- [ ] **Step 4: Add save/unsave functions to `modules/services/service.ts`**

Append:

```ts
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { AppError, toFieldErrors, validationError } from "@/server/errors";
import { logAudit } from "@/server/audit";
import { getRequestContext } from "@/server/request";
import { generateId } from "@/lib/id";
import { serviceIdSchema } from "./validators";

export async function saveService(serviceId: string): Promise<{ saved: boolean }> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.SERVICES_SAVE);

  const parsed = serviceIdSchema.safeParse({ serviceId });
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    throw new AppError("Service not found.", { code: "NOT_FOUND" });
  }

  const ctx = await getRequestContext();
  let created = false;
  await db.savedService.upsert({
    where: { userId_serviceId: { userId: user.id, serviceId } },
    create: { id: generateId("svs"), userId: user.id, serviceId },
    update: {},
  });
  created = true;

  await logAudit({
    actorId: user.id,
    action: "services.saved",
    resourceType: "service",
    resourceId: serviceId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { saved: created };
}

export async function unsaveService(serviceId: string): Promise<{ saved: false }> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.SERVICES_SAVE);

  const ctx = await getRequestContext();
  await db.savedService.deleteMany({ where: { userId: user.id, serviceId } });

  await logAudit({
    actorId: user.id,
    action: "services.unsaved",
    resourceType: "service",
    resourceId: serviceId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { saved: false };
}

export async function getSavedServiceIds(): Promise<Set<string>> {
  const user = await requireUser();
  const rows = await db.savedService.findMany({
    where: { userId: user.id },
    select: { serviceId: true },
  });
  return new Set(rows.map((r) => r.serviceId));
}

export async function getSavedServices(): Promise<ServiceCardView[]> {
  const user = await requireUser();
  const rows = await db.savedService.findMany({
    where: { userId: user.id },
    select: { service: { select: cardSelect } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toCard(r.service));
}
```

- [ ] **Step 5: Create `modules/services/actions.ts`**

```ts
"use server";

import { withActionResult } from "@/server/errors";
import { saveService, unsaveService } from "./service";

export async function saveServiceAction(serviceId: string) {
  return withActionResult(() => saveService(serviceId));
}

export async function unsaveServiceAction(serviceId: string) {
  return withActionResult(() => unsaveService(serviceId));
}
```

- [ ] **Step 6: Write the failing save test**

```ts
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));
vi.mock("@/server/email", () => ({ sendEmail: async () => {} }));

import { db } from "@/server/db";
import * as auth from "@/modules/auth/service";
import { saveService, unsaveService, getSavedServiceIds, getSavedServices } from "@/modules/services/service";

const email = `svc_${Date.now()}@example.com`;
let userId: string;

beforeAll(async () => {
  cookieJar.clear();
  await db.$connect();
  const reg = await auth.register({ identifier: email, password: "CivicOne2024!", confirmPassword: "CivicOne2024!", agreeTerms: true });
  userId = reg.userId;
});
afterAll(async () => {
  await db.user.delete({ where: { id: userId } }).catch(() => {});
  await db.$disconnect();
});

describe("save/unsave service (real database)", () => {
  it("saves a service and lists it", async () => {
    const svc = await db.service.findUnique({ where: { slug: "business-registration" } });
    expect(svc).toBeTruthy();
    await saveService(svc!.id);
    expect(await getSavedServiceIds()).toEqual(new Set([svc!.id]));
    const saved = await getSavedServices();
    expect(saved.some((s) => s.slug === "business-registration")).toBe(true);
  });

  it("unsaves a service", async () => {
    const svc = await db.service.findUnique({ where: { slug: "business-registration" } });
    await unsaveService(svc!.id);
    expect(await getSavedServiceIds()).toEqual(new Set());
  });

  it("rejects saving an unknown service", async () => {
    await expect(saveService("srv_00000000000000000000")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run tests/rbac.test.ts tests/services-save.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/rbac.ts modules/services/validators.ts modules/services/service.ts modules/services/actions.ts tests/rbac.test.ts tests/services-save.test.ts
git commit -m "feat(services): add save/unsave service actions"
```

---

### Task 7: Service search page `/find-a-service`

**Files:**
- Modify: `app/(app)/find-a-service/page.tsx`
- Create: `modules/services/components/service-search-explorer.tsx`
- Create: `modules/services/components/service-card.tsx`
- Create: `modules/services/components/save-service-button.tsx`

**Interfaces:**
- Consumes: `searchServices`, `getServiceCategories`, `getJurisdictionOptions`, `getSavedServiceIds` (Tasks 5-6); `saveServiceAction`, `unsaveServiceAction`.
- Produces: `/find-a-service?q=&category=&jurisdiction=&mode=` page showing search box, filters, result grid, per-result save buttons, and an identity-aware "browse" empty state.

- [ ] **Step 1: Create `modules/services/components/save-service-button.tsx`**

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { saveServiceAction, unsaveServiceAction } from "@/modules/services/actions";

export function SaveServiceButton({
  serviceId,
  saved,
}: {
  serviceId: string;
  saved: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(saved);

  async function toggle() {
    setPending(true);
    try {
      if (isSaved) {
        const result = await unsaveServiceAction(serviceId);
        if (result.ok) {
          setIsSaved(false);
          router.refresh();
        } else {
          toast.error(result.error?.message ?? "Unable to unsave this service.");
        }
      } else {
        const result = await saveServiceAction(serviceId);
        if (result.ok) {
          setIsSaved(true);
          toast.success("Service saved.");
          router.refresh();
        } else {
          toast.error(result.error?.message ?? "Unable to save this service.");
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={isSaved ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={toggle}
      aria-pressed={isSaved}
    >
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Bookmark aria-hidden="true" className={isSaved ? "fill-current" : undefined} />
      )}
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
```

- [ ] **Step 2: Create `modules/services/components/service-card.tsx`**

```tsx
import Link from "next/link";
import { ArrowRight, Clock, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ServiceCardView } from "@/modules/services/service";
import { SaveServiceButton } from "./save-service-button";

export const MODE_LABELS: Record<string, string> = {
  GUIDANCE: "Guidance",
  EXTERNAL: "External",
  INTEGRATED: "Integrated",
};

export function ServiceCard({
  service,
  saved,
}: {
  service: ServiceCardView;
  saved: boolean;
}) {
  return (
    <Card className="transition-colors hover:border-foreground/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {service.categoryName}
            </p>
            <h3 className="text-base font-semibold text-foreground">
              <Link href={`/services/${service.slug}`} className="hover:underline">
                {service.name}
              </Link>
            </h3>
          </div>
          <SaveServiceButton serviceId={service.id} saved={saved} />
        </div>

        <p className="text-sm text-muted-foreground">{service.summary}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Landmark className="size-3" aria-hidden="true" />
            {service.providerAbbreviation ?? service.providerName}
          </Badge>
          <Badge variant="neutral">{MODE_LABELS[service.mode] ?? service.mode}</Badge>
          <Badge variant="neutral">
            <Clock className="size-3" aria-hidden="true" />
            {service.estimatedTime ?? "Varies"}
          </Badge>
          <span className={cn("text-xs font-medium", service.jurisdictionLevel === "FEDERAL" ? "text-foreground" : "text-muted-foreground")}>
            {service.jurisdictionName}
          </span>
        </div>

        <Link
          href={`/services/${service.slug}`}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View service
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create `modules/services/components/service-search-explorer.tsx`**

```tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SearchBox } from "@/components/ui/search-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Option {
  slug: string;
  name: string;
}

export function ServiceSearchControls({
  categories,
  jurisdictions,
}: {
  categories: Option[];
  jurisdictions: Option[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const jurisdiction = searchParams.get("jurisdiction") ?? "";

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    const keys = ["q", "category", "jurisdiction"] as const;
    for (const key of keys) {
      const value = next[key];
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/find-a-service?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <SearchBox
        size="lg"
        placeholder="Search services, e.g. register a business, renew a licence…"
        defaultValue={q}
        onSearch={(value) => update({ q: value })}
        aria-label="Search services"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onValueChange={(v) => update({ category: v })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={jurisdiction} onValueChange={(v) => update({ jurisdiction: v })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All jurisdictions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jurisdictions</SelectItem>
            {jurisdictions.map((j) => (
              <SelectItem key={j.slug} value={j.slug}>{j.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {q || category || jurisdiction ? (
          <Badge
            variant="outline"
            className="cursor-pointer px-3 py-1"
            onClick={() => router.push("/find-a-service")}
          >
            Clear filters
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

export function ServiceResultsEmpty() {
  return (
    <EmptyState
      icon={<Search className="size-5" aria-hidden="true" />}
      title="No services matched your search."
      description="Try different keywords, clear your filters, or browse all services by category."
    />
  );
}
```

- [ ] **Step 4: Rewrite `app/(app)/find-a-service/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import {
  searchServices,
  getServiceCategories,
  getJurisdictionOptions,
  getSavedServiceIds,
} from "@/modules/services/service";
import { ServiceCard } from "@/modules/services/components/service-card";
import {
  ServiceSearchControls,
  ServiceResultsEmpty,
} from "@/modules/services/components/service-search-explorer";

export const metadata: Metadata = {
  title: "Find a Service",
};

interface SearchParams {
  q?: string;
  category?: string;
  jurisdiction?: string;
}

export default async function FindServicePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const savedIds = await getSavedServiceIds();

  const [categories, jurisdictions, results] = await Promise.all([
    getServiceCategories(),
    getJurisdictionOptions(),
    searchServices({
      query: params.q,
      category: params.category === "all" ? undefined : params.category,
      jurisdiction: params.jurisdiction === "all" ? undefined : params.jurisdiction,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a Service"
        description="Tell us what you need to do — we'll show you which public service handles it."
        breadcrumbs={[{ label: "Find a Service" }]}
      />

      <ServiceSearchControls
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        jurisdictions={jurisdictions.map((j) => ({ slug: j.code, name: j.name }))}
      />

      {results.length === 0 ? (
        <ServiceResultsEmpty />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              saved={savedIds.has(service.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: the page calls `getSavedServiceIds()` which requires a session. `/(app)` already redirects unauthenticated users, so this is safe.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/find-a-service/page.tsx" modules/services/components
git commit -m "feat(services): build real service search and discovery page"
```

---

### Task 8: Service detail page `/services/[slug]`

**Files:**
- Create: `app/(app)/services/[slug]/page.tsx`
- Create: `modules/services/components/service-detail.tsx`
- Create: `modules/services/components/service-faq.tsx`
- Create: `app/(app)/services/page.tsx` (saved list — Task 9 file, do NOT create here)

**Interfaces:**
- Consumes: `getServiceBySlug`, `getSavedServiceIds` (Tasks 5-6).
- Produces: `/services/[slug]` route with provider card, requirements/documents, fees (never invented), steps, FAQs, official source, related services, mode-specific CTA, save button.

- [ ] **Step 1: Create `modules/services/components/service-faq.tsx`**

```tsx
export function ServiceFaq({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <details
          key={`${faq.question}-${index}`}
          className="group rounded-md border border-border bg-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
            {faq.question}
            <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="px-4 pb-4 text-sm text-muted-foreground">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `modules/services/components/service-detail.tsx`**

```tsx
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  FileText,
  Fingerprint,
  Landmark,
  ListChecks,
  ScrollText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ServiceDetailView } from "@/modules/services/service";
import { SaveServiceButton } from "./save-service-button";
import { ServiceFaq } from "./service-faq";
import { MODE_LABELS } from "./service-card";
import { TRUST_DISCLAIMER } from "@/lib/constants";

const DEMO_NOTE = "Demo information. Confirm current requirements with the official provider.";
const FEE_NOTE = "Verify current fee with official provider.";

export function ServiceDetail({
  service,
  saved,
}: {
  service: ServiceDetailView;
  saved: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{service.categoryName}</Badge>
            <Badge variant="neutral">{MODE_LABELS[service.mode] ?? service.mode}</Badge>
            <Badge variant="neutral">{service.jurisdictionName}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{service.name}</h1>
          <p className="max-w-2xl text-muted-foreground">{service.summary}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <SaveServiceButton serviceId={service.id} saved={saved} />
          {service.mode === "EXTERNAL" && service.officialUrl ? (
            <Button asChild>
              <a href={service.officialUrl} target="_blank" rel="noreferrer">
                Go to official site
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          ) : null}
          {service.mode === "INTEGRATED" ? (
            <Button disabled>
              Start application
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      {service.mode === "GUIDANCE" ? (
        <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/40 px-4 py-3">
          <ScrollText className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            CivicOne explains this process for you. Use the steps below as a guide and confirm
            details with the official provider before acting.
          </p>
        </div>
      ) : null}

      {service.isDemo ? (
        <p className="rounded-md border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-muted-foreground">
          Demo information. This service is a demo entry — confirm current requirements with
          the official provider.
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary">
              <Landmark className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{service.providerName}</h2>
              {service.providerAbbreviation ? (
                <p className="text-sm text-muted-foreground">{service.providerAbbreviation}</p>
              ) : null}
            </div>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{service.description}</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated time</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                {service.estimatedTime ?? "Varies"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jurisdiction</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{service.jurisdictionName}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {service.eligibility ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who can apply</CardTitle>
            <CardDescription>Eligibility and basic requirements.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{service.eligibility}</p>
          </CardContent>
        </Card>
      ) : null}

      {service.requirements.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-secondary" aria-hidden="true" />
              Requirements & documents
            </CardTitle>
            <CardDescription>What you will typically need to provide.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {service.requirements.map((req, index) => (
                <div key={index} className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {req.title}
                      {req.isDocument ? (
                        <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Document
                        </span>
                      ) : null}
                    </p>
                    {req.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{req.description}</p>
                    ) : null}
                    {!req.isVerified ? (
                      <p className="mt-1 text-xs font-medium text-warning">{DEMO_NOTE}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {service.fees.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fees</CardTitle>
            <CardDescription>Fees are not fixed here — always confirm with the provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {service.fees.map((fee, index) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{fee.name}</p>
                  {fee.frequency ? (
                    <p className="text-xs text-muted-foreground">{fee.frequency}</p>
                  ) : null}
                </div>
                <p className="text-xs font-medium text-warning">{FEE_NOTE}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="size-4 text-secondary" aria-hidden="true" />
            Official source
          </CardTitle>
        </CardHeader>
        <CardContent>
          {service.officialUrl ? (
            <a
              href={service.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {service.officialUrl}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Check the official provider for the authoritative source.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">{TRUST_DISCLAIMER}</p>
        </CardContent>
      </Card>

      {service.faqs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Frequently asked questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceFaq faqs={service.faqs} />
          </CardContent>
        </Card>
      ) : null}

      {service.related.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Related services</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {service.related.map((related) => (
              <Link
                key={related.id}
                href={`/services/${related.slug}`}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/25"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                  {related.categoryName}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground group-hover:underline">
                  {related.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{related.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

Note: `cn` import is present to keep parity with the codebase; it is unused in this version and may be removed if lint flags it. The `<a href>` for the official site uses target="_blank" only for the EXTERNAL CTA button and the official-source link.

- [ ] **Step 3: Create `app/(app)/services/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { getServiceBySlug, getSavedServiceIds } from "@/modules/services/service";
import { ServiceDetail } from "@/modules/services/components/service-detail";

export const metadata: Metadata = {
  title: "Service",
};

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const savedIds = await getSavedServiceIds();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Find a Service", href: "/find-a-service" },
          { label: service.categoryName },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/find-a-service">
              <ArrowLeft aria-hidden="true" />
              Back to search
            </Link>
          </Button>
        }
      />
      <ServiceDetail service={service} saved={savedIds.has(service.id)} />
    </div>
  );
}
```

Note: `PageHeader` requires a `title` prop — pass `title={service.name}` instead of relying on breadcrumbs only. Adjust:

```tsx
      <PageHeader
        title={service.name}
        breadcrumbs={[
          { label: "Find a Service", href: "/find-a-service" },
          { label: service.categoryName },
        ]}
        actions={...}
      />
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/services/[slug]/page.tsx" modules/services/components/service-detail.tsx modules/services/components/service-faq.tsx
git commit -m "feat(services): build service detail page"
```

---

### Task 9: Saved services page `/services`

**Files:**
- Modify: `app/(app)/services/page.tsx`
- Create: `modules/services/components/saved-services-list.tsx`

**Interfaces:**
- Consumes: `getSavedServices` (Task 6), `ServiceCard` (Task 7).
- Produces: `/services` ("My Services") listing saved services with unsave control and empty state.

- [ ] **Step 1: Create `modules/services/components/saved-services-list.tsx`**

```tsx
import Link from "next/link";
import { Files, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { ServiceCardView } from "@/modules/services/service";
import { ServiceCard } from "./service-card";

export function SavedServicesList({
  services,
}: {
  services: ServiceCardView[];
}) {
  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Files className="size-5" aria-hidden="true" />}
        title="You haven't saved any services yet."
        description="Save services you're interested in to find them here later."
        action={
          <Button asChild>
            <Link href="/find-a-service">
              <Search aria-hidden="true" />
              Find a service
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} saved />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/(app)/services/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { getSavedServices } from "@/modules/services/service";
import { SavedServicesList } from "@/modules/services/components/saved-services-list";

export const metadata: Metadata = {
  title: "My Services",
};

export default async function ServicesPage() {
  const saved = await getSavedServices();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Services"
        description="Public services you've saved for later."
        breadcrumbs={[{ label: "My Services" }]}
      />
      <SavedServicesList services={saved} />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/services/page.tsx" modules/services/components/saved-services-list.tsx
git commit -m "feat(services): add saved services page"
```

---

### Task 10: Identity status visible throughout the shell

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/shell/desktop-sidebar.tsx`
- Modify: `components/shell/mobile-header.tsx`
- Create: `components/shell/identity-status-indicator.tsx`

**Interfaces:**
- Consumes: `getIdentityStatus` (`modules/identity/service`).
- Produces: a compact identity status badge visible on desktop sidebar and mobile header in the signed-in shell.

- [ ] **Step 1: Create `components/shell/identity-status-indicator.tsx`**

```tsx
import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IdentityStatusView } from "@/modules/identity/service";

export function IdentityStatusIndicator({
  status,
}: {
  status: IdentityStatusView;
}) {
  const verified = status.status === "VERIFIED";
  return (
    <Link
      href="/profile/identity"
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
        verified
          ? "border-border bg-card text-foreground hover:bg-muted"
          : "border-warning/30 bg-warning/5 text-foreground hover:bg-warning/10",
      )}
      title={verified ? "Identity verified" : "Identity not verified"}
    >
      <Fingerprint
        className={cn("size-4 shrink-0", verified ? "text-secondary" : "text-warning")}
        aria-hidden="true"
      />
      <span className="truncate font-medium">
        {verified ? "Identity verified" : "Identity not verified"}
      </span>
    </Link>
  );
}
```

- [ ] **Step 2: Wire into the shell**

In `app/(app)/layout.tsx`, add:

```tsx
import { getIdentityStatus } from "@/modules/identity/service";
import { IdentityStatusIndicator } from "@/components/shell/identity-status-indicator";
```

And pass the status to both sidebar and header. Add a prop `identityStatus` to `DesktopSidebar` and `MobileHeader` (type `IdentityStatusView`), and render `<IdentityStatusIndicator status={identityStatus} />` inside the sidebar nav (`NavList` area, above the account section) and inside the mobile drawer (below `NavList`).

`app/(app)/layout.tsx` becomes:

```tsx
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const [identityStatus] = await Promise.all([getIdentityStatus()]);

  return (
    <div className="min-h-svh bg-background">
      <DesktopSidebar firstName={user.firstName} lastName={user.lastName} email={user.email} identityStatus={identityStatus} />
      <MobileHeader firstName={user.firstName} lastName={user.lastName} email={user.email} identityStatus={identityStatus} />
      <main id="main-content" className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
}
```

Update `desktop-sidebar.tsx` to render the indicator in the `NavList` bottom or between `NavList` and `UserMenu`:

```tsx
      <NavList />
      <div className="border-t border-border p-3 space-y-2">
        <IdentityStatusIndicator status={props.identityStatus} />
        <UserMenu {...props} />
      </div>
```

Update `mobile-header.tsx` drawer body:

```tsx
            <div className="flex-1 overflow-y-auto py-4">
              <NavList onNavigate={() => setNavOpen(false)} />
              <div className="px-3 pb-2">
                <IdentityStatusIndicator status={props.identityStatus} />
              </div>
            </div>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean. Confirm the indicator renders on `/dashboard` and `/find-a-service` (identity status visible throughout).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/layout.tsx" components/shell/identity-status-indicator.tsx components/shell/desktop-sidebar.tsx components/shell/mobile-header.tsx
git commit -m "feat(services): keep identity status visible in the app shell"
```

---

### Task 11: Marketing copy updates (Phase 3 references)

**Files:**
- Modify: `app/(marketing)/page.tsx`
- Modify: `lib/constants.ts`

**Interfaces:**
- Consumes: `SERVICE_CATEGORIES` (kept) but updated category links point at real `/find-a-service?category=<slug>` values matching the seeded categories.
- Produces: updated marketing copy that no longer says "Phase 2".

- [ ] **Step 1: Update `lib/constants.ts`**

Replace `SERVICE_CATEGORIES` with the 13 seeded category slugs/labels:

```ts
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
```

- [ ] **Step 2: Update `app/(marketing)/page.tsx` copy**

- In the feature card "Discover public services", change the description to reflect that the catalogue is live.
- Change the "Service catalogue" section paragraph from "Detailed service information lands in Phase 2" to "Browse the live catalogue and see what each service needs."
- Remove the FEATURES entry that still says "Identity verification arrives in Phase 2" (identity is live since Phase 2) and update the identity card description.
- Update the final CTA paragraph "Identity verification, services and records arrive in the phases ahead" → "Services and records are live — verify your identity, discover services and keep track of what matters."

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/page.tsx" lib/constants.ts
git commit -m "docs(services): update marketing copy for the live catalogue"
```

---

### Task 12: README, full verification, smoke tests, push + handoff

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Update `README.md`**

- Update the intro to mention Phase 3 (service catalogue).
- Update the Data model section with the new tables: `service_categories`, `service_providers`, `jurisdictions`, `services`, `service_requirements`, `service_faqs`, `service_fees`, `service_related`, `saved_services`.
- Update the modules tree to show `services/` as built (not placeholder).
- Add a "Service catalogue (Phase 3)" section describing: 13 categories, 22 demo services, FTS search + synonyms/intents, fees/requirements labelled demo (never invented fees), modes (GUIDANCE/EXTERNAL/INTEGRATED), no applications yet.

- [ ] **Step 2: Apply migration + seed to test DB**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma db seed
```

- [ ] **Step 3: Full checks**

Run: `npm run typecheck` then `npm run lint` then `npm test` then `npm run build`.
Expected: all clean; tests pass.

- [ ] **Step 4: HTTP smoke tests (dev server)**

With the dev server running (background terminal), verify:
- `/find-a-service` returns 200 for a signed-in session and shows the search box + result cards; `?q=register+company` surfaces `Company Registration`.
- `/services/business-registration` returns 200 and shows provider "Corporate Affairs Commission", the demo note, fees with "Verify current fee with official provider.", and related services.
- `/services` shows the saved-services empty state; after saving a service, it lists it.
- `/dashboard` and `/find-a-service` both show the "Identity verified / not verified" indicator in the shell.
- Anonymous `/services/business-registration` redirects to `/auth/login` (307).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document Phase 3 service catalogue"
```

- [ ] **Step 6: Push the feature branch and hand off**

```bash
git checkout -b 260821-feat-service-catalogue-phase3
git push -u origin 260821-feat-service-catalogue-phase3
```

Then use the `finishing-a-development-branch` skill to present merge options.
