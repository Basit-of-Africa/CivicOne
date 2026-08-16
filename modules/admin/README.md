# Admin module

Phase 1 scope: none — directory reserved.

## Future scope

- Role-scoped admin consoles (SERVICE_ADMIN, CONTENT_ADMIN, IDENTITY_ADMIN, SUPER_ADMIN)
- RBAC is already established in `server/rbac.ts` with a permission matrix —
  admin roles are scoped and never gain unrestricted access by default.
- Audit log review (IDENTITY_ADMIN / SUPER_ADMIN only)
