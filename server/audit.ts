import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { generateId } from "@/lib/id";

/**
 * Audit log abstraction.
 *
 * Structured, append-only audit trail. Callers must NEVER pass passwords,
 * tokens or future NIN data here — only action names, opaque resource ids
 * and non-sensitive metadata.
 */

export interface AuditLogInput {
  actorId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        id: generateId("aud"),
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: (input.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    // Audit logging must never break the primary request flow.
    console.error("[audit] failed to write audit log", error);
  }
}
