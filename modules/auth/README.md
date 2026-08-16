# Auth module

Phase 1 implementation — secure registration, login, sessions, email
verification and password reset.

See `app/(auth)` for routes and `modules/auth/components` for forms.

## Security notes

- Passwords: bcrypt (work factor 12), never stored in plaintext.
- Sessions: server-side, opaque tokens stored SHA-256 hashed in DB;
  browser holds only the HTTP-only cookie.
- Rate limiting on register / login / reset (in-memory sliding window).
- Timing-safe credential checks prevent user enumeration.
- CSRF: Next.js origin checks for server actions + `assertSameOrigin` for
  route handlers.
- Audit events are written on every sensitive action.

Email delivery is stubbed to the server console (`server/email.ts`); a real
provider plugs in behind that interface in a later phase.
