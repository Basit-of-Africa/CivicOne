# CivicOne Nigeria

CivicOne is an independent technology platform that helps Nigerians discover, initiate, manage and organise public and administrative services. It is **not a government agency** and is not affiliated with NIMC, CAC, FRSC, NIS, FIRS or any other government body.

This repository contains **Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5**: a production-grade foundation (architecture, database, authentication, roles, design system, app shell) extended by a mock NIN identity-verification layer, a **live service catalogue** (search, categories, detail pages, saved services), a **generic application engine** (configuration-driven forms, guided workflows, mock providers, application tracking) and a **persistent administrative record layer** (permanent service records, a private document wallet with signed URLs, and a personal timeline). Later phases extend it without a rewrite.

> **Trust disclaimer**: CivicOne is an independent technology platform. It is not a government agency. Government service names used here are for demonstration only.

## Stack

- **Framework**: Next.js 15 (App Router, RSC + Server Actions) + React 19
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS v4 (design tokens in `app/globals.css`), Inter Variable
- **Database**: PostgreSQL 15 + Prisma 6
- **Validation**: Zod + react-hook-form + `@hookform/resolvers`
- **Testing**: Vitest
- **UI components**: shadcn-style primitives in `components/ui` (lucide-react icons)

## Architecture

The app is organised into route groups and modular directories:

```
app/                     Next.js App Router
  (marketing)/           public site (/, /about, /terms)
  auth/                  /auth/login, /auth/register, /auth/forgot-password,
                         /auth/reset-password, /auth/verify-email
  (app)/                 signed-in shell (/dashboard, /profile, /services, …)
components/
  ui/                    design-system primitives (button, input, card, …)
  dashboard/ marketing/  composed components
modules/
  auth/ users/           feature modules (validators, service, actions, components)
  identity/ services/ applications/ records/ documents/ consent/ payments/
  notifications/ admin/ ai/   placeholder modules for later phases
lib/                     shared utilities (id, env, constants, navigation, format)
server/                  server-only infrastructure (db, auth/session, crypto,
                         password, rate-limit, rbac, audit, csrf, email)
prisma/                  schema, migrations, seed
tests/                   unit + integration tests
public/icons/            PWA icons
scripts/                 icon generation
```

Route groups `(marketing)` and `(app)` affect only file organisation; the `auth/` group is a real URL prefix (`/auth/login`, etc.).

### Data model

- `users` — opaque prefixed ULID-style IDs (`usr_…`), email/phone unique but never primary keys, bcrypt (cost 12) password hash, status `UNVERIFIED` on registration.
- `profiles` — personal/contact/security profile, one per user.
- `roles` / `user_roles` — scoped RBAC: `USER`, `PROFESSIONAL`, `SERVICE_ADMIN`, `CONTENT_ADMIN`, `IDENTITY_ADMIN`, `SUPER_ADMIN`.
- `sessions` — DB-backed; only a SHA-256 token hash is stored, browser holds an HTTP-only, SameSite=Lax cookie with sliding expiry.
- `email_verifications` / `password_resets` — single-use, hashed, expiring tokens.
- `audit_logs` — best-effort audit trail; never stores passwords, tokens or raw NIN.
- `identity_providers` — registered identity sources (currently the mock `MOCK_NIN` provider).
- `identity_profiles` — current verification status + government-verified fields (legal name, DOB, gender, nationality, state/LGA).
- `identity_credentials` — verified credentials (NIN); stores only a **masked value** and an **AES-256-GCM encrypted value**, never the raw NIN in plaintext.
- `identity_verifications` — successful verification records (provider, reference, date).
- `identity_verification_attempts` — every attempt (SUCCESS/FAILED/REQUIRES_REVIEW/UNAVAILABLE).
- `jurisdictions` / `service_categories` / `service_providers` — reference data for the service catalogue.
- `services` — catalogue entries (title, summary, requirements, fees, steps, documents, eligibility, turnaround); `services_search_alias` + `services_search_intent` power the synonym-aware search.
- `saved_services` — per-user bookmarks of catalogue services.
- `service_form_definitions` — configuration-driven forms (fields stored as JSON).
- `service_workflows` / `service_workflow_steps` — the guided application workflow per service (step types ELIGIBILITY…COMPLETION).
- `applications` — user applications with references `CO-<year>-<6-digit>`; never a NIN.
- `application_answers` / `application_status_history` / `application_documents` — answers, status timeline and uploaded files (bytes stored in DB for the demo).
- `application_counters` — per-year sequence counters for references.
- `government_service_records` — permanent records issued from approved applications (source CIVICONE, verification GOVERNMENT_VERIFIED in the demo).
- `wallet_documents` — private document wallet; files stored as bytes in the DB (object-storage stand-in for this demo), downloaded only via short-lived signed URLs.

**Identity verification (Phase 2)**: uses a **mock provider only**. It NEVER contacts NIMC or any real identity source, and only succeeds for the fictional demo NINs (`00000000001`–`00000000003`) labelled DEMO DATA in the UI. Any other NIN — including a real person's — always fails. Raw NIN access requires the `identity:read:full` permission; the UI only ever shows masked values.

**Service catalogue (Phase 2)**: a fully searchable, browsable directory of 22 demo public services across 13 categories (identity, business, tax, immigration, transport, education, health, property, employment, agriculture, licences, family/social, legal). Search understands natural phrasing and common Nigerian synonyms (e.g. "driving licence", "business registration", "travelling abroad"). Signed-in users can save services; saving requires the `services:save` permission.

**Applications (Phase 4)**: a generic, configuration-driven application engine. Users start applications on services that have an active workflow (demo: Business Registration, Nigerian Passport, Driver's Licence), complete dynamic forms, attach documents, review, submit and receive a `CO-2026-000001`-style reference. Identity-verified fields are pre-filled from the Phase 2 profile and locked. Three mock providers (CAC, Passport, Driver Licence) simulate submission, processing, approval and rejection. Applications are tracked under `/applications`.

**Service records & wallet (Phase 5)**: approved applications automatically produce a `GovernmentServiceRecord` (e.g. a Business Registration) plus a certificate PDF stored in the user's document wallet. `/services/my` groups records into Active / Expiring soon / Applications / Completed / Archived; `/records/[id]` shows the full record with linked documents and the originating application. The document wallet (`/documents`) accepts PDF/JPG/PNG/WEBP up to 5 MB, stored privately with per-file categories and metadata; files are only reachable through short-lived signed URLs. The `/timeline` page aggregates identity verification, application, record and document events. This completes the central CivicOne loop: verify identity → apply → approval → record created → document stored → record in My Services → record on the timeline.

**Not built yet** (reserved for Phase 6): real NIMC-backed verification, consent sharing, payments, admin consoles, real provider integrations, AI.

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

Required: `DATABASE_URL`. All other variables have safe defaults for local development. Secrets are never committed.

### 3. Database

```bash
# create the database (example for a local Postgres instance)
npm run db:migrate        # apply migrations
npm run db:seed           # seed roles + reference data + demo services (idempotent)
```

### 4. Run

```bash
npm run dev               # http://localhost:3000
```

### 5. Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `NG_DATA_API_URL` | `https://ngdata.udeh.ng` | Optional NG Data API base URL for cached administrative reference data |
| `NG_DATA_API_KEY` | — | Optional bearer token; without it CivicOne uses local state/LGA data |
| `NG_DATA_CACHE_TTL_SECONDS` | `86400` | Cache lifetime for NG Data API reference data |
| `CAC_VAS_ENABLED` | `false` | Enable the server-only CAC VAS read-only client |
| `CAC_VAS_BASE_URL` | `https://vasapp.oasisproducts.ng` | CAC VAS staging or production base URL |
| `CAC_VAS_API_KEY` | — | Server-only CAC VAS `X_API_KEY`; never expose to browser code |
| `CAC_VAS_TIMEOUT_MS` | `8000` | CAC VAS request timeout |
| `APP_URL` | `http://localhost:3000` | Base URL used in emails/links |
| `APP_NAME` | `CivicOne Nigeria` | Brand name |
| `EMAIL_FROM` | `no-reply@civicone.ng` | Sender address |
| `SESSION_COOKIE_NAME` | `civone_session` | Session cookie name |
| `SESSION_COOKIE_SECURE` | `false` | Send cookie over HTTPS only (set `true` in prod) |
| `SESSION_MAX_AGE_SECONDS` | `604800` | Session lifetime (7 days) |
| `EMAIL_VERIFICATION_TTL_SECONDS` | `86400` | Verification link lifetime |
| `PASSWORD_RESET_TTL_SECONDS` | `3600` | Reset link lifetime |
| `RATE_LIMIT_ENABLED` | `true` | Toggle rate limiting |
| `RATE_LIMIT_MAX_ATTEMPTS` | `5` | Max login attempts per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window |
| `IDENTITY_ENCRYPTION_KEY` | dev-only default | Key used to encrypt NIN values at rest (AES-256-GCM); set a ≥32-char value in prod |

Email delivery is a console stub (`server/email.ts`) so providers can be swapped in a later phase without touching domain logic.

## Authentication & security

- Register with **email or phone + password**; new accounts are `UNVERIFIED`.
- Login by email or phone + password; bcrypt verification with a dummy-hash comparison on unknown identifiers to prevent timing-based user enumeration.
- DB-backed sessions, SHA-256 token hashes at rest, HTTP-only `SameSite=Lax` cookie, sliding renewal at half-life.
- Changing your password revokes all other sessions; changing your email clears verification.
- Email verification and password-reset tokens are single-use, stored hashed, with TTLs.
- Zod validation on every server boundary; structured `AppError` / `ActionResult`; rate limiting abstraction; CSRF same-origin helper; scoped RBAC (no blanket admin access); audit logging.
- Identity: NIN verification via mock provider (never contacts NIMC), NIN encrypted at rest, masked in the UI, RBAC-gated access, every verification/access audited, rate-limited attempts.
- Services: RBAC-gated saving (`services:save`), Zod-validated server actions, synonym-aware search with rate limiting.
- Applications: every write runs through Zod-validated server actions (`AppError`/`ActionResult`); identity-verified fields are pre-filled and locked server-side; file uploads capped at 5 MB with an allowlist of MIME types; document downloads are auth-gated and served with `X-Content-Type-Options: nosniff`.
- Accessibility: semantic HTML, visible focus states, labelled inputs, accessible errors (WCAG 2.2 AA target). Mobile-first layout with a bottom tab bar on small screens.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Vitest suite (unit + integration) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:deploy` | Deploy migrations (prod) |
| `npm run db:seed` | Seed roles |
| `npm run db:studio` | Prisma Studio |
| `npm run generate-icons` | Regenerate PWA icons |

## Testing

Unit tests cover validators, crypto/password, encryption, rate limiting, RBAC, id generation, the mock NIN provider, search synonyms/intents, the service-search query logic, and the application engine (reference generator, form schema builder, mock providers, workflow seeding, core service flow and server actions). Integration tests exercise the real register → verify → login → logout → reset flow, the identity-verification flow (register → unknown NIN fails → demo NIN verifies → masked NIN displayed), the service-catalogue flow (search returns expected results, save/unsave round-trips) and the full application walkthrough (start → eligibility → form → documents → review → payment → submit → provider simulation) against the `civicone_test` database with `next/headers` mocked. Create it with:

```bash
su - postgres -c "psql -c \"CREATE DATABASE civicone_test;\""
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma db seed
```

## Deployment

- Build with `npm run build`; run `npm run db:deploy` and `npm run db:seed` on the target database (the seed is idempotent — re-running it upserts reference data and demo services).
- Set `SESSION_COOKIE_SECURE=true` and a real `APP_URL` in production.
- Wire `server/email.ts` to a real provider.
- Run behind TLS; the app sets no server-identifying headers (`poweredByHeader: false`).

## License

Proprietary. See the project owner for terms.
