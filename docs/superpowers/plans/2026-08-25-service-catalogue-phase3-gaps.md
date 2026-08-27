# Service Catalogue Phase 3 Gap-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three gaps between the existing Phase 3 service catalogue and the spec: a "Steps" section on the service page, intent-related services surfaced in search results, and a service-mode filter.

**Architecture:** The prior session already built the catalogue (schema, seed, search, detail page, save). This plan extends it: a new `ServiceStep` model + seed content + rendering; an intent-aware search outcome that resolves related services; and a mode dropdown wired into the existing search controls. All changes follow the existing modules/services patterns (Prisma + server-only service + RSC pages + client controls).

**Tech Stack:** Next.js 15 App Router, Prisma 6 + PostgreSQL 15, Zod, Vitest, Tailwind CSS v4, shadcn-style primitives.

## Global Constraints

- Do not rebuild existing functionality; only add the three gaps.
- Seed steps are demo content — no invented official fees. Reuse the existing disclaimer wording (`Demo information. Confirm current requirements with the official provider.`).
- Identity status must remain visible throughout (already satisfied; do not regress it).
- Every task ends with typecheck + lint + test green, and a commit.
- Follow existing conventions: `generateId("...")` prefixes, `@@map` snake_case tables, server-only service layer, `AppError`/`ActionResult` error handling.

---
### Task 1: Service steps (model, migration, seed, service layer, page, test)

**Files:**
- Modify: `prisma/schema.prisma` (add `ServiceStep` model + relation on `Service`)
- Create: `prisma/migrations/20260825000000_service_steps/migration.sql`
- Modify: `prisma/service-catalogue-data.ts` (add `steps` to `DemoServiceSeed`, add step arrays to all 22 services)
- Modify: `prisma/seed.ts` (upsert steps, include step text in `searchText`)
- Modify: `modules/services/service.ts` (add `steps` to `ServiceDetailView` + `getServiceBySlug`)
- Modify: `modules/services/components/service-detail.tsx` (render numbered Steps section)
- Modify: `tests/services-search.test.ts` (assert steps in the detail view)

**Interfaces:**
- Consumes: existing `ServiceDetailView`, `getServiceBySlug`, `DemoServiceSeed`, `generateId`.
- Produces: Prisma model `ServiceStep { id, serviceId, title, description, sortOrder }`; `ServiceDetailView.steps: Array<{ title: string; description: string }>`; `DemoServiceSeed.steps?: Array<{ title: string; description: string }>`.

- [x] **Step 1: Add the `ServiceStep` model to `prisma/schema.prisma`**

Add a relation on `Service` (after the `fees` line):

```prisma
  fees         ServiceFee[]
  steps        ServiceStep[]
```

Append the model at the end of the file (after `SavedService`):

```prisma
model ServiceStep {
  id          String   @id @db.VarChar(64)
  serviceId   String   @map("service_id") @db.VarChar(64)
  title       String   @db.VarChar(200)
  description String   @db.Text
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@index([serviceId])
  @@map("service_steps")
}
```

- [x] **Step 2: Generate the migration**

Run: `npx prisma migrate dev --name service_steps --create-only`
Then verify `prisma/migrations/<new>/migration.sql` contains a `CREATE TABLE "service_steps"` and an `ALTER TABLE "services" ADD COLUMN "steps"...` is NOT present (relation only). Apply it with `npx prisma migrate dev`.

- [x] **Step 3: Add steps to the seed type and data**

In `prisma/service-catalogue-data.ts`, extend `DemoServiceSeed` (after the `related` line):

```ts
  related: string[];
  steps?: Array<{ title: string; description: string }>;
```

Then add a `steps` array to each of the 22 demo services. Exact content is in the appendix (Appendix A). Each array has 3–6 step objects with `title` (short imperative phrase) and `description` (one sentence).

- [x] **Step 4: Seed steps + include them in `searchText`**

In `prisma/seed.ts`, build `searchText` with step titles appended:

```ts
    const searchText = [
      s.name,
      s.summary,
      s.description,
      category.name,
      provider.name,
      provider.abbreviation ?? "",
      s.eligibility,
      ...(s.steps ?? []).map((step) => step.title),
    ].join(" ");
```

After the FAQs block (before the closing of the service loop), delete + recreate steps:

```ts
    // Steps
    await prisma.serviceStep.deleteMany({ where: { serviceId: service.id } });
    for (const [index, step] of (s.steps ?? []).entries()) {
      await prisma.serviceStep.create({
        data: {
          id: generateId("sst"),
          serviceId: service.id,
          title: step.title,
          description: step.description,
          sortOrder: index,
        },
      });
    }
```

- [x] **Step 5: Extend the service layer**

In `modules/services/service.ts`:

- Add to `ServiceDetailView` interface:

```ts
  steps: Array<{ title: string; description: string }>;
```

- In `getServiceBySlug`, add to the select and the returned object:

```ts
      steps: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true } },
```

and

```ts
    steps: row.steps,
```

- [x] **Step 6: Render the Steps section in the detail page**

In `modules/services/components/service-detail.tsx`, import `ListOrdered` from `lucide-react`, then add a Steps card between the Requirements card and the Fees card:

```tsx
      {service.steps.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListOrdered className="size-4 text-secondary" aria-hidden="true" />
              Steps
            </CardTitle>
            <CardDescription>How the process typically works.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {service.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    {step.description ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
```

- [x] **Step 7: Extend the detail-view test**

In `tests/services-search.test.ts`, in the "returns the full detail view for a slug" test, add:

```ts
    expect(detail!.steps.length).toBeGreaterThan(0);
```

- [x] **Step 8: Run seed + tests + checks**

```bash
npm run db:seed
npm test
npm run typecheck
npm run lint
```

Expected: seed prints `22 demo services ready`; all tests pass (steps now asserted); typecheck/lint clean.

- [x] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/service-catalogue-data.ts prisma/seed.ts modules/services/service.ts modules/services/components/service-detail.tsx tests/services-search.test.ts
git commit -m "feat(services): add service steps to the catalogue"
```

---
### Task 2: Surface intent-related services in search results

**Files:**
- Modify: `modules/services/service.ts` (add `searchServicesWithIntent`)
- Modify: `app/(app)/find-a-service/page.tsx` (use the outcome, render a related section)
- Modify: `tests/services-search.test.ts` (test related outcomes)

**Interfaces:**
- Consumes: `searchServices`, `getRelatedBySlugs`, `matchIntent`, `ServiceCardView`, `SearchFilters`.
- Produces: `ServiceSearchOutcome { results: ServiceCardView[]; related: ServiceCardView[]; intentMatched: boolean }`; function `searchServicesWithIntent(filters: SearchFilters): Promise<ServiceSearchOutcome>`.

- [x] **Step 1: Write the failing test**

Append to `tests/services-search.test.ts`:

```ts
  it("surfaces intent-related services for 'I want to start a business'", async () => {
    const outcome = await searchServicesWithIntent({ query: "I want to start a business." });
    expect(outcome.intentMatched).toBe(true);
    expect(outcome.results.some((s) => s.slug === "business-registration")).toBe(true);
    expect(outcome.related.some((s) => s.slug === "tin-registration")).toBe(true);
  });

  it("returns no related services when no intent matches", async () => {
    const outcome = await searchServicesWithIntent({ query: "xyzzy" });
    expect(outcome.intentMatched).toBe(false);
    expect(outcome.related).toHaveLength(0);
  });
```

Update the import at the top of the file to include `searchServicesWithIntent`.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services-search.test.ts`
Expected: FAIL with "searchServicesWithIntent is not a function".

- [x] **Step 3: Implement `searchServicesWithIntent`**

In `modules/services/service.ts`, after `searchServices`, add:

```ts
export interface ServiceSearchOutcome {
  results: ServiceCardView[];
  related: ServiceCardView[];
  intentMatched: boolean;
}

export async function searchServicesWithIntent(
  filters: SearchFilters = {},
): Promise<ServiceSearchOutcome> {
  const results = await searchServices(filters);
  const query = filters.query?.trim() ?? "";
  const intent = query ? matchIntent(query) : null;

  let related: ServiceCardView[] = [];
  if (intent && intent.related.length > 0) {
    related = await getRelatedBySlugs(intent.related);
    const resultIds = new Set(results.map((r) => r.id));
    related = related.filter((r) => !resultIds.has(r.id));
  }

  return { results, related, intentMatched: Boolean(intent) };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/services-search.test.ts`
Expected: PASS.

- [x] **Step 5: Update the find-a-service page**

In `app/(app)/find-a-service/page.tsx`:
- Change the import: `import { searchServicesWithIntent, getServiceCategories, getJurisdictionOptions, getSavedServiceIds } from "@/modules/services/service";`
- Replace `searchServices(...)` in the `Promise.all` with `searchServicesWithIntent({ ... })`.
- Replace the results rendering block with:

```tsx
      {outcome.results.length === 0 ? (
        <ServiceResultsEmpty />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {outcome.results.map((service) => (
            <ServiceCard key={service.id} service={service} saved={savedIds.has(service.id)} />
          ))}
        </div>
      )}

      {outcome.related.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Related services
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {outcome.related.map((service) => (
              <ServiceCard key={service.id} service={service} saved={savedIds.has(service.id)} />
            ))}
          </div>
        </div>
      ) : null}
```

- [x] **Step 6: Run checks + commit**

```bash
npm test
npm run typecheck
npm run lint
git add modules/services/service.ts "app/(app)/find-a-service/page.tsx" tests/services-search.test.ts
git commit -m "feat(services): surface related services for intent searches"
```

---
### Task 3: Service-mode filter in find-a-service

**Files:**
- Modify: `modules/services/components/service-search-explorer.tsx` (add mode Select + update key)
- Modify: `app/(app)/find-a-service/page.tsx` (read `mode` param, pass to search)
- Modify: `tests/services-search.test.ts` (mode filter test)

**Interfaces:**
- Consumes: `SearchFilters.mode`, `searchServicesWithIntent`, `MODE_LABELS`.
- Produces: `mode` search param handled by the page; `ServiceSearchControls` accepts a `modes: Array<{ slug: string; name: string }>` prop.

- [x] **Step 1: Write the failing test**

Append to `tests/services-search.test.ts`:

```ts
  it("filters by service mode", async () => {
    const results = await searchServices({ mode: "EXTERNAL" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.mode).toBe("EXTERNAL");
    }
  });
```

- [x] **Step 2: Run test to verify it passes already (data-layer mode filter exists)**

Run: `npx vitest run tests/services-search.test.ts`
Expected: PASS — this confirms the data layer supports mode filtering.

- [x] **Step 3: Add the mode control**

In `modules/services/components/service-search-explorer.tsx`:
- Import `MODE_LABELS` from `./service-card`.
- Add a `modes` prop to `ServiceSearchControls`:

```tsx
export function ServiceSearchControls({
  categories,
  jurisdictions,
  modes,
}: {
  categories: Option[];
  jurisdictions: Option[];
  modes: Array<{ slug: string; name: string }>;
}) {
```

- Add `mode` to the read and to `update()`:

```tsx
  const mode = searchParams.get("mode") ?? "";
  ...
  const keys = ["q", "category", "jurisdiction", "mode"] as const;
```

- Add a Select after the jurisdiction Select:

```tsx
        <Select value={mode} onValueChange={(v) => update({ mode: v })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            {modes.map((m) => (
              <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
```

- Update the clear-filters condition to include `mode`.

- [x] **Step 4: Wire the mode param through the page**

In `app/(app)/find-a-service/page.tsx`:
- Add `mode?: string` to the `SearchParams` interface.
- Import `MODE_LABELS` from `@/modules/services/components/service-card`.
- Pass `mode` into the search call: `mode: params.mode === "all" ? undefined : (params.mode as "GUIDANCE" | "EXTERNAL" | "INTEGRATED" | undefined),`
- Pass a `modes` prop built from the enum:

```tsx
      <ServiceSearchControls
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        jurisdictions={jurisdictions.map((j) => ({ slug: j.code, name: j.name }))}
        modes={(["GUIDANCE", "EXTERNAL", "INTEGRATED"] as const).map((m) => ({ slug: m, name: MODE_LABELS[m] ?? m }))}
      />
```

- [x] **Step 5: Run checks + commit**

```bash
npm test
npm run typecheck
npm run lint
git add modules/services/components/service-search-explorer.tsx "app/(app)/find-a-service/page.tsx" tests/services-search.test.ts
git commit -m "feat(services): add service-mode filter to discovery"
```

---
## Self-Review

**Spec coverage:**
- Categories, jurisdictions (36 states + FCT + LGAs), modes, search, synonyms, intent, save, identity visibility — already implemented by the prior session (verified in audit); not rebuilt.
- "Steps" section on service page — Task 1.
- Intent search surfaces related services ("Result: Business Registration. Related: Tax registration, Local permit, Sector permit.") — Task 2.
- Filter (mode) — Task 3.
- Definition of done (search, discover, filter, view, save) — satisfied after Tasks 1–3.

**Placeholder scan:** No placeholders; all code and step content are in the plan.

**Type consistency:** `ServiceStep` model ↔ `ServiceDetailView.steps` ↔ seed `steps` field all use `{ title, description }` (+ `sortOrder` internally). `ServiceSearchOutcome` fields match Task 2 usage. `searchServicesWithIntent(filters)` and `SearchFilters.mode` match Task 3 usage.

---
## Appendix A: Step content for the 22 demo services

Add a `steps` array to each `DemoServiceSeed` entry. Place it after the `related` array in each object.

**business-registration**
```ts
    steps: [
      { title: "Reserve your company name", description: "Check name availability and reserve your preferred names on the CAC portal." },
      { title: "Prepare incorporation documents", description: "Draft the Memorandum and Articles of Association, often with the help of a lawyer or CAC-accredited agent." },
      { title: "Enter company details", description: "Provide directors' and shareholders' information, share structure and registered address." },
      { title: "Upload documents and pay", description: "Attach the required documents and pay the filing fees on the portal." },
      { title: "Submit and track", description: "Submit the application and monitor its status until the certificate is issued." },
    ],
```

**business-name-registration**
```ts
    steps: [
      { title: "Log in to the CAC portal", description: "Sign in or create an account on the CAC online portal." },
      { title: "Check name availability", description: "Search for your proposed business name and reserve it if it is available." },
      { title: "Enter business details", description: "Provide the business address, nature of business and proprietor or partner details." },
      { title: "Pay and submit", description: "Pay the registration fee and submit the application for processing." },
    ],
```

**tin-registration**
```ts
    steps: [
      { title: "Create an e-FIRS account", description: "Sign up on the FIRS e-FIRS portal." },
      { title: "Choose TIN registration", description: "Select the individual or business TIN registration option." },
      { title: "Provide identification", description: "Enter your identification details, such as your NIN." },
      { title: "Receive your TIN", description: "Your TIN is issued immediately after successful submission." },
    ],
```

**nin-enrollment**
```ts
    steps: [
      { title: "Book an appointment", description: "Schedule an enrolment slot at an approved NIMC enrolment centre." },
      { title: "Bring your documents", description: "Carry your birth certificate or declaration of age and proof of address." },
      { title: "Complete the form", description: "Fill in the enrolment form at the centre." },
      { title: "Capture biometrics", description: "Your facial image and fingerprints are captured." },
      { title: "Receive your NIN slip", description: "Your NIN is issued on enrolment; the card may take longer to arrive." },
    ],
```

**national-passport**
```ts
    steps: [
      { title: "Create a passport account", description: "Register on the Nigeria Immigration Service passport portal." },
      { title: "Complete the application form", description: "Fill in the online application and select your preferred passport office." },
      { title: "Pay the application fee", description: "Pay online and keep the payment receipt." },
      { title: "Book an appointment", description: "Choose a date to attend your passport office." },
      { title: "Attend the interview", description: "Present your documents and complete biometric capture at the office." },
      { title: "Collect your passport", description: "Return to collect your passport when the tracking status shows it is ready." },
    ],
```

**international-passport-renewal**
```ts
    steps: [
      { title: "Log in to the passport portal", description: "Sign in with your existing passport account." },
      { title: "Start a renewal", description: "Open a renewal application and verify your personal details." },
      { title: "Pay the renewal fee", description: "Pay online and save your receipt." },
      { title: "Book an appointment", description: "Schedule a visit to the passport office." },
      { title: "Attend and collect", description: "Complete capture at the office and collect the renewed passport when ready." },
    ],
```

**driver-licence**
```ts
    steps: [
      { title: "Complete the online application", description: "Fill in the licence application form on the FRSC portal." },
      { title: "Book biometric capture", description: "Schedule a capture appointment at an FRSC office or approved centre." },
      { title: "Pay the licence fee", description: "Pay online and keep the receipt." },
      { title: "Attend capture", description: "Complete your biometrics; new drivers also sit the required test." },
      { title: "Collect your licence", description: "The licence is produced within a few weeks and delivered to your chosen collection point." },
    ],
```

**vehicle-registration**
```ts
    steps: [
      { title: "Prepare vehicle documents", description: "Gather proof of purchase or import papers, identity and insurance." },
      { title: "Visit the FRSC office", description: "Go to an FRSC office or approved centre for the process." },
      { title: "Complete the registration form", description: "Submit the form with your vehicle details." },
      { title: "Pay the fees", description: "Pay the registration, number plate and licensing fees." },
      { title: "Collect your documents", description: "Receive the registration certificate and number plates." },
    ],
```

**certificate-of-occupancy**
```ts
    steps: [
      { title: "Gather your land documents", description: "Collect your sale agreement, deed and survey plan." },
      { title: "Verify the land", description: "Confirm the survey and land details with the land office." },
      { title: "Submit the application", description: "File your application with the relevant state land office." },
      { title: "Pay processing fees", description: "Pay the application and processing fees." },
      { title: "Await issuance", description: "The Certificate of Occupancy is issued once processing completes." },
    ],
```

**building-permit**
```ts
    steps: [
      { title: "Prepare your title documents", description: "Gather proof of ownership or title to the land." },
      { title: "Get plans approved", description: "Have building plans and structural drawings prepared by registered professionals." },
      { title: "Submit to the planning authority", description: "Lodge the plans with the state Ministry of Physical Planning." },
      { title: "Pay the permit fee", description: "Pay the permit processing fee for your project." },
      { title: "Collect the permit", description: "Receive the approved building permit once the review is complete." },
    ],
```

**marriage-registration**
```ts
    steps: [
      { title: "Complete the registration form", description: "Fill in the marriage registration form with both spouses' details." },
      { title: "Gather identity documents", description: "Collect identification, passport photographs and declarations of age for both spouses." },
      { title: "Visit the registry", description: "Attend an NPC marriage registry to complete the process." },
      { title: "Receive the certificate", description: "The marriage certificate is issued on the day of registration." },
    ],
```

**birth-certificate**
```ts
    steps: [
      { title: "Obtain a birth notification", description: "Get the hospital or midwife birth notification where available." },
      { title: "Complete the registration form", description: "Fill in the birth registration form with the child's and parents' details." },
      { title: "Provide parents' identification", description: "Submit identification of the parents or guardians." },
      { title: "Receive the certificate", description: "The birth certificate is issued once registration is complete." },
    ],
```

**nafdac-product-registration**
```ts
    steps: [
      { title: "Prepare the product dossier", description: "Compile the product information, formulation and labelling details." },
      { title: "Confirm company registration", description: "Ensure your company is registered and recognised by NAFDAC." },
      { title: "Submit the application", description: "File the dossier through the NAFDAC e-portal." },
      { title: "Provide samples", description: "Submit product samples for laboratory testing." },
      { title: "Pay and receive registration", description: "Pay the registration fee and receive your product registration number." },
    ],
```

**pharmacy-premises-licence**
```ts
    steps: [
      { title: "Confirm premises standards", description: "Make sure the premises meets PCN requirements for pharmacy operation." },
      { title: "Prepare premises details", description: "Gather address, layout and professional registration documents." },
      { title: "Submit the application", description: "Apply through the Pharmacists Council of Nigeria." },
      { title: "Pay the licensing fee", description: "Pay the applicable premises licensing fee." },
      { title: "Pass the inspection", description: "An inspection of the premises is carried out before the licence is issued." },
    ],
```

**jamb-utme-registration**
```ts
    steps: [
      { title: "Create a JAMB profile", description: "Register on the JAMB portal with a valid email address." },
      { title: "Complete the UTME form", description: "Fill in the registration form with your personal and educational details." },
      { title: "Pay the registration fee", description: "Pay the UTME registration fee at an approved bank or channel." },
      { title: "Get your examination slip", description: "Print your examination slip showing your CBT centre and date." },
      { title: "Sit the examination", description: "Attend your accredited CBT centre on the scheduled date." },
    ],
```

**nysc-registration**
```ts
    steps: [
      { title: "Check your eligibility", description: "Confirm you meet NYSC eligibility requirements for mobilisation." },
      { title: "Complete the online registration", description: "Fill in the NYSC registration form on the portal." },
      { title: "Upload your documents", description: "Attach your statement of result and identification." },
      { title: "Wait for the call-up letter", description: "Your call-up letter is issued according to the NYSC schedule." },
      { title: "Report to camp", description: "Report to the orientation camp on the date in your call-up letter." },
    ],
```

**pension-registration**
```ts
    steps: [
      { title: "Confirm employer registration", description: "Check that your employer is registered with a licensed Pension Fund Administrator (PFA)." },
      { title: "Complete the RSA form", description: "Fill in the Retirement Savings Account application form." },
      { title: "Provide your details", description: "Submit identification and a passport photograph." },
      { title: "Receive your RSA details", description: "Your RSA number and details are issued once the account is opened." },
    ],
```

**cac-annual-returns**
```ts
    steps: [
      { title: "Prepare financial information", description: "Gather your company's details and any required financial statements." },
      { title: "Log in to the CAC portal", description: "Sign in to the CAC online portal with your company account." },
      { title: "File the annual returns", description: "Complete the annual returns form with the required information." },
      { title: "Pay the filing fee", description: "Pay the annual returns filing fee." },
      { title: "Keep your receipt", description: "Save the filing receipt as proof of compliance." },
    ],
```

**road-worthiness-certificate**
```ts
    steps: [
      { title: "Book a vehicle inspection", description: "Schedule an inspection with the Vehicle Inspection Service." },
      { title: "Bring the vehicle and documents", description: "Take your vehicle, registration papers and insurance certificate to the inspection." },
      { title: "Pass the inspection", description: "The vehicle is checked for roadworthiness." },
      { title: "Pay and collect", description: "Pay the test fee and collect your roadworthiness certificate." },
    ],
```

**police-character-certificate**
```ts
    steps: [
      { title: "Get a request letter", description: "Obtain a letter requesting the character certificate from an employer, institution or your local authority." },
      { title: "Visit the police command", description: "Go to your state police command or approved office." },
      { title: "Complete the application", description: "Fill in the application and complete fingerprint capture." },
      { title: "Pay the processing fee", description: "Pay the applicable processing fee." },
      { title: "Collect the certificate", description: "Return to collect the character certificate once it is ready." },
    ],
```

**agricultural-loan**
```ts
    steps: [
      { title: "Identify the right loan", description: "Review Bank of Agriculture loan products and pick the one that fits your farm." },
      { title: "Prepare a business plan", description: "Draft a farm or business profile and plan." },
      { title: "Complete the application", description: "Fill in the loan application form." },
      { title: "Provide documents", description: "Submit identification and any guarantor or collateral required for the loan size." },
      { title: "Submit and await review", description: "Submit the application and await the bank's assessment." },
    ],
```

**national-health-insurance**
```ts
    steps: [
      { title: "Identify your scheme", description: "Confirm which NHIA scheme applies to you, based on your employment or status." },
      { title: "Complete the enrolment form", description: "Fill in the health insurance enrolment form." },
      { title: "Provide identification", description: "Submit identification and a passport photograph." },
      { title: "Submit your enrolment", description: "Lodge the enrolment through the authority or an accredited HMO." },
      { title: "Receive coverage details", description: "Your coverage and benefits are confirmed once enrolment is processed." },
    ],
```
