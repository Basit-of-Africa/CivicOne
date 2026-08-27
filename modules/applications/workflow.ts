import "server-only";
import { db } from "@/server/db";

export async function hasActiveWorkflow(serviceId: string): Promise<boolean> {
  const workflow = await db.serviceWorkflow.findUnique({ where: { serviceId } });
  return Boolean(workflow && workflow.isActive);
}
