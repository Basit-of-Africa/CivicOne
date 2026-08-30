import "server-only";
import { db } from "@/server/db";
import type { FormDefinition } from "./form-config";

export async function getFormDefinitionMap(): Promise<Record<string, FormDefinition>> {
  const rows = await db.serviceFormDefinition.findMany();
  const map: Record<string, FormDefinition> = {};
  for (const row of rows) {
    map[row.key] = row.config as unknown as FormDefinition;
  }
  return map;
}
