# CAC VAS API Integration Notes

Date: 2026-09-05

## Sources

- https://documenter.getpostman.com/view/54596520/2sBY4VJcUc
- https://vas.oasisproducts.ng/FAQs?activeIndex=0&section=Validation
- https://vas.oasisproducts.ng/
- https://vas.oasisproducts.ng/documentation-page

## Environments and authentication

- Staging: `https://vasapp.oasisproducts.ng`
- Production: `https://vasapp.cac.gov.ng`
- Every request requires a server-side `X_API_KEY` header.
- The documentation does not specify key issuance, pricing, rate limits, SLA, key rotation, IP allowlisting, or staging fixtures.
- A `403` can mean insufficient account balance or missing service permission.

## Endpoint inventory

### Public/company validation

- `POST /api/vas/validation/company` — company details by RC and entity type.
- `POST /api/vas/validation/company/name` — validate by RC and entity name.
- `POST /api/vas/validation/company/rc` — company by RC number.
- `POST /api/vas/validation/line-of-business` — business activities.
- `POST /api/vas/validation/tin` — retrieve entity TIN.
- `POST /api/vas/validation/tin/company` — company by TIN.
- `POST /api/vas/validation/tin/generate` — generate TIN using RC, entity, address, state, LGA, phone, and email.
- `POST /api/vas/validation/single-service` — premium comprehensive validation.
- `POST /api/vas/validation/certificate` — certificate download.
- `POST /api/vas/validation/status-report` — status-report download.

### VRC/consent-protected operations

- `POST /api/vas/validation/secure/company`
- `POST /api/vas/validation/secure/company-affiliates`
- `POST /api/vas/validation/secure/certificate`
- `POST /api/vas/validation/secure/share-capital`
- `POST /api/vas/validation/secure/shares-distribution`
- `POST /api/vas/validation/secure/assets`
- `POST /api/vas/validation/secure/wind-up`
- `POST /api/vas/validation/secure/status-report`

These use a one-use VRC generated through the VAS portal after company-email verification. VRC must be treated as consent-bearing and never persisted or logged.

### Open search

- `POST /api/vas/validation/open-search/company` — company full-text search with filters.
- `POST /api/vas/validation/open-search/affiliate` — affiliate/director search.
- `POST /api/vas/validation/open-search/affiliate/single` — narrow affiliate search.

## Contract and response concerns

- Typical responses use `statusCode`, `status`, `message`, `data`, `success`, and sometimes `count`.
- Field names vary, including `lineOfBusiness` versus `line_of_business` and `surname` versus `last_name`.
- Dates appear in inconsistent formats.
- Entity-type naming is inconsistent across examples (`BUSINESS NAME`, `BUSINESS_NAME`, `BUSINESS_NAME_FIRM`).
- The introduction lists fewer entity types than the validation error message.
- Some examples contain JavaScript comments and are not valid JSON as copied.
- Certificate/status-report response examples are incomplete.
- No documented retry, timeout, idempotency, pagination, rate-limit-header, or webhook contract was found.

## CivicOne integration fit

CivicOne currently has a mock CAC provider and application engine but no CAC HTTP adapter. Existing primitives that can support integration include application references/status history, `providerRef`, workflow steps, Paystack payment verification, audit logging, government API record source, and wallet documents.

Recommended first use cases:

1. Read-only RC/company validation before or during a business-registration application.
2. Company-name/RC prefill into application answers.
3. TIN lookup for an already-registered entity.
4. Optional line-of-business and status display.

## Supplied VAS price sheet mapping

The supplied CAC VAS pricing sheet maps directly to the current catalogue as follows:

- `Company Registration`: LLC REGISTER `NGN 7,300`, LLC NAME RESERVATION `NGN 1,200`, LLC STAMP DUTY `NGN 0`.
- `Business Name Registration`: BUSINESS NAME `NGN 27,000`, optional PRIORITY_SERVICE `NGN 500`.
- `CAC Annual Returns`: ANNUAL RETURN REGISTRATION `NGN 1,050`, ANNUAL RETURN FINANCIAL YEAR `NGN 500`, ANNUAL RETURN ACKNOWLEDGMENT LETTER `NGN 500`, and ANNUAL RETURN FILING YEARS `NGN 200` per year.

These are stored as fee estimates with an instruction to confirm current CAC charges before payment. They are not treated as CivicOne payment amounts or proof that a VAS operation is available to the current API key.

The following supplied products remain intentionally unmapped until their workflow, permissions, and API operation are confirmed: BN bulk registration/compliance, LLC affiliates/shares/PSC/assets, post-incorporation business-name services, premium validation, certificates/status reports, affiliate searches, VRC operations, and TIN generation.

Do not initially automate CAC registration submission unless CAC confirms a separate submission contract. The documented collection is primarily a VAS validation/retrieval API.

## Security and compliance

Potentially sensitive data includes directors, shareholders, dates of birth, phone numbers, addresses, nationality, gender, affiliates, share ownership, assets, banks, and winding-up information.

Rules for a CivicOne adapter:

- Keep `X_API_KEY` server-only.
- Never log API keys, VRCs, raw request bodies, or raw responses.
- Never persist raw VRC values.
- Require explicit user confirmation before private affiliate/shareholder queries.
- Normalize and retain only fields required for the user-requested purpose.
- Store provider endpoint, environment, retrieval time, result class, and a response checksum rather than an unbounded raw payload.
- Do not label public validation as proof of ownership or control.
- Do not mark every response `GOVERNMENT_VERIFIED` without recording whether it was public or VRC-protected.
- Obtain written CAC/Oasis terms, pricing, balance rules, data-retention terms, permitted use, artifact redistribution rights, and production SLA before launch.

## Phased recommendation

### Phase 0: onboarding and contract validation

Obtain staging credentials, confirm current request/response contracts, pricing, balance behavior, rate limits, production promotion, key rotation, retention, and certificate/status-report usage rights.

### Phase 1: read-only validation adapter

Build a server-only `CacVasClient` with strict Zod schemas, field/date normalization, timeout, bounded retry for safe reads, provider-error mapping, request correlation, and sanitized contract fixtures.

### Phase 2: application prefill

Use validated company data to prefill business-registration forms. Keep Paystack payment state separate from CAC/VAS consumption and provider success. Keep `MOCK_CAC` until staging tests pass.

### Phase 3: VRC workflow

Add instructions, explicit consent, one-use execution, restricted access, consent audit events, and retention rules for private company data.

### Phase 4: official artifacts

Add certificate/status-report ingestion with MIME validation, size limits, malware scanning, SHA-256 checksums, source metadata, and signed downloads. Use `GOVERNMENT_API` only after successful provider validation.

### Phase 5: production hardening

Add secret-manager storage, rotation, balance/rate monitoring, schema-drift alerts, provider health checks, replay protection, deletion workflows, and official-channel fallback.
