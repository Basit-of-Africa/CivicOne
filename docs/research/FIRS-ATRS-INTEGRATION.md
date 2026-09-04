# FIRS ATRS Integration Notes

Date: 2026-09-04

## Sources

- https://atrs.firs.gov.ng/docs/category/api-documentation-for-devs/
- https://atrs.firs.gov.ng/docs/introduction/
- https://atrs.firs.gov.ng/docs/base-url/
- https://atrs.firs.gov.ng/docs/authentication/
- https://atrs.firs.gov.ng/docs/bills-reports/
- https://atrs.firs.gov.ng/docs/signing-the-data/
- https://api-dev.i-fis.com/doc

## What the API documents

- Development base URL: `https://api-dev.i-fis.com`
- Production base URL: `https://atrs-api.firs.gov.ng`
- Authentication uses OAuth 2.0 bearer tokens.
- The documented bill-reporting operation sends bill or receipt data to FIRS.
- Bill reporting requires business/POS context such as `vat_number`, `business_place`, `business_device`, bill number and time, total value, payment type, and an MD5 security code.
- The documentation links to a Swagger playground and lists FIRS support at `support@atrs.firs.gov.ng`.

## CivicOne fit

CivicOne already has FIRS as a service provider and has a TIN-registration catalogue service. The public ATRS documentation does not describe a TIN-application, TIN-lookup, or taxpayer-status API. Its strongest current fit is a controlled adapter for reporting authorized business bills or receipts, not automating citizen TIN issuance.

## Important risks

- FIRS credentials, registered business-place values, and business-device values are required.
- The documentation is dated and has an endpoint discrepancy: the page describes `/v1/bills/report`, while the Swagger surface may expose `/v1/bill/report`. Confirm the current contract with FIRS before implementation.
- MD5 is a legacy external protocol requirement. Isolate it inside the adapter and never use it as a general CivicOne security primitive.
- No documented webhook or callback was found, so retries, idempotency, and reconciliation would be required.
- An ATRS payment code must not be represented as a CivicOne government certificate, TIN, or government-issued record.

## Recommended plan

1. Obtain FIRS test credentials and confirm the current endpoint, request envelope, token lifecycle, rate limits, retries, and production onboarding.
2. Add a server-only FIRS adapter with OAuth token caching, strict schemas, timeouts, retries, idempotency, and audit events.
3. Pilot bill reporting only for an explicitly authorized workflow.
4. Keep TIN registration as an external service until FIRS supplies an approved TIN API and data-sharing agreement.
