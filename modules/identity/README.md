# Identity module

Phase 2: mock NIN verification.

- Route: `/identity/verify` — verify your Nigerian identity using a demo NIN.
- Route: `/profile/identity` — identity status, verification history, masked NIN.
- DB: `IdentityProfile` (current status + verified fields), `IdentityCredential`
  (encrypted NIN), `IdentityVerification`, `IdentityVerificationAttempt`,
  `IdentityProvider`.
- Provider: `MockNINVerificationProvider` (mock). It NEVER contacts NIMC and
  only succeeds for the fictional demo identities in
  `providers/demo-identities.ts` (labelled DEMO DATA in the UI). Arbitrary
  real NINs always fail.
- NIN is encrypted at rest (AES-256-GCM via `server/encryption.ts`) and only
  ever displayed masked (`********1234`). Raw NIN access requires the
  `identity:read:full` permission.
- Security: identity access is RBAC-gated; every verification and identity
  access is recorded in the audit log (never the raw NIN).

## Phase 3+ (future)

- Authorised real identity providers (e.g. an official NIMC token endpoint)
- Manual review console for `REQUIRES_MANUAL_REVIEW`
- Identity re-verification and expiry
