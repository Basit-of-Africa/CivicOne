# CivicOne Nigeria

CivicOne is an independent technology platform that helps Nigerians discover, initiate, manage and organise public and administrative services. It is **not a government agency** and is not affiliated with NIMC, CAC, FRSC, NIS, FIRS or any other government body.

This repository contains **Phase 1**: a production-grade foundation (architecture, database, authentication, roles, design system, app shell) that later phases extend without a rewrite.

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

### Data model (Phase 1)

- `users` — opaque prefixed ULID-style IDs (`usr_…`), email/phone unique but never primary keys, bcrypt (cost 12) password hash, status `UNVERIFIED` on registration.
- `profiles` — personal/contact/security profile, one per user.
- `roles` / `user_roles` — scoped RBAC: `USER`, `PROFESSIONAL`, `SERVICE_ADMIN`, `CONTENT_ADMIN`, `IDENTITY_ADMIN`, `SUPER_ADMIN`.
- `sessions` — DB-backed; only a SHA-256 token hash is stored, browser holds an HTTP-only, SameSite=Lax cookie with sliding expiry.
- `email_verifications` / `password_resets` — single-use, hashed, expiring tokens.
- `audit_logs` — best-effort audit trail; never stores passwords, tokens or NIN.
- `identity_profiles` — placeholder for Phase 2 NIN verification (no NIN data stored in Phase 1).

**Not built in Phase 1** (reserved for later phases): real NIN verification, service catalogue/workflows, applications, document wallet, notifications/records, consent sharing, payments, admin consoles, AI.

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
npm run db:seed           # seed the six roles (idempotent)
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

Email delivery is a console stub (`server/email.ts`) so providers can be swapped in a later phase without touching domain logic.

## Authentication & security

- Register with **email or phone + password**; new accounts are `UNVERIFIED`.
- Login by email or phone + password; bcrypt verification with a dummy-hash comparison on unknown identifiers to prevent timing-based user enumeration.
- DB-backed sessions, SHA-256 token hashes at rest, HTTP-only `SameSite=Lax` cookie, sliding renewal at half-life.
- Changing your password revokes all other sessions; changing your email clears verification.
- Email verification and password-reset tokens are single-use, stored hashed, with TTLs.
- Zod validation on every server boundary; structured `AppError` / `ActionResult`; rate limiting abstraction; CSRF same-origin helper; scoped RBAC (no blanket admin access); audit logging.
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

Unit tests cover validators, crypto/password, rate limiting, RBAC and id generation. The auth integration test (`tests/auth-flow.test.ts`) exercises the real register → verify → login → logout → reset flow against the `civicone_test` database with `next/headers` mocked. Create it with:

```bash
su - postgres -c "psql -c \"CREATE DATABASE civicone_test;\""
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicone_test" npx prisma db seed
```

## Deployment

- Build with `npm run build`; run `npm run db:deploy` and `npm run db:seed` on the target database.
- Set `SESSION_COOKIE_SECURE=true` and a real `APP_URL` in production.
- Wire `server/email.ts` to a real provider.
- Run behind TLS; the app sets no server-identifying headers (`poweredByHeader: false`).

## License

Proprietary. See the project owner for terms.
