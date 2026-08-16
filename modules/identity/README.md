# Identity module

Phase 1 scope: placeholder only.

- Route: `/identity/verify` — reserved for identity verification (Phase 2).
- DB: `IdentityProfile` table exists (verification status only). **NIN is NOT
  stored in Phase 1.**
- No real NIN verification, no government identity integrations yet.

## Phase 2+ (future)

- NIN verification flow (real-time or tokenised)
- Identity document uploads
- Verification status lifecycle (UNVERIFIED → PENDING → VERIFIED / REJECTED)
- Consent-aware identity sharing
