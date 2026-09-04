# Build Studio NG Data API Integration Notes

Date: 2026-09-04

## Sources

- https://www.buildstudio.com.ng/apis/ng-data-api
- https://ngdata.udeh.ng/docs/
- https://ngdata.udeh.ng/public/docs.openapi
- https://ngdata.udeh.ng/terms-of-service
- https://ngdata.udeh.ng/privacy-policy

## What it provides

The NG Data API provides Nigerian administrative and demographic data through a REST API with bearer-token authentication. Documented resource families include states, state headquarters, local governments, LGA headquarters, cities/towns, and countries. Responses are paginated and may include identifiers, codes, postal data, coordinates, population, and selected economic fields.

The Build Studio listing advertises state, LGA, local council, ward, demographic data, REST/JSON responses, sandbox support, caching, rate limiting, and a freemium model. The official API site advertises a free allowance, while exact paid quotas and commercial terms should be confirmed before production use.

## CivicOne fit

- Strong fit for state/LGA selectors, address validation, profile normalization, and location-aware service discovery.
- Possible source for state capitals and LGA headquarters, but not a replacement for CivicOne's agency-specific office-location data.
- No documented ministry, provider, public-service catalogue, requirements, eligibility, workflow, NIN lookup, or identity-verification capability.

## Risks

- Do not send NIN, identity credentials, or other sensitive user data to this API.
- Live request-per-page usage would introduce API availability, quota, latency, and pagination dependencies.
- Public documentation has inconsistent administrative totals and response descriptions; validate identifiers and retain CivicOne's local fallback data.
- Terms do not clearly grant CivicOne permission to persist, redistribute, or commercially expose API data. Obtain written licensing, provenance, quota, pricing, update-cadence, and SLA confirmation.

## Recommendation

Do not make it a core runtime dependency yet. Run a small server-side pilot for non-critical administrative reference data, cache a reviewed snapshot in CivicOne, and keep the current seeded state/LGA data as fallback. The first useful integration would be better state/LGA autocomplete and normalization, not ministry or service integration.
