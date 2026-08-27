import "server-only";
import { db } from "@/server/db";

/**
 * Allocate the next sequential application reference.
 *
 * References look like `CO-2026-000001`. Sequence allocation uses a single
 * atomic UPSERT on the per-year counter so concurrent starts cannot collide.
 */
export async function nextApplicationReference(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db.$queryRaw<Array<{ seq: number }>>`
    INSERT INTO "application_counters" ("year", "seq")
    VALUES (${year}, 1)
    ON CONFLICT ("year")
    DO UPDATE SET "seq" = "application_counters"."seq" + 1
    RETURNING "seq"
  `;
  const seq = rows[0]?.seq ?? 1;
  return `CO-${year}-${String(seq).padStart(6, "0")}`;
}
