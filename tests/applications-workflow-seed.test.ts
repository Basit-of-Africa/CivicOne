import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { hasActiveWorkflow } from "@/modules/applications/workflow";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});

describe("seeded workflows", () => {
  it("provides active workflows for the three demo services", async () => {
    for (const slug of ["business-registration", "national-passport", "driver-licence"]) {
      const service = await db.service.findUnique({ where: { slug } });
      expect(service).not.toBeNull();
      expect(await hasActiveWorkflow(service!.id)).toBe(true);
    }
  });

  it("seeds form definitions referenced by workflow steps", async () => {
    const forms = await db.serviceFormDefinition.findMany();
    const keys = new Set(forms.map((f) => f.key));
    expect(keys.has("personal-details")).toBe(true);
    expect(keys.has("company-details")).toBe(true);
    expect(keys.has("passport-details")).toBe(true);
    expect(keys.has("driver-details")).toBe(true);
  });

  it("orders workflow steps correctly", async () => {
    const service = await db.service.findUnique({ where: { slug: "business-registration" } });
    const workflow = await db.serviceWorkflow.findUnique({
      where: { serviceId: service!.id },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    const types = workflow!.steps.map((s) => s.type);
    expect(types[0]).toBe("ELIGIBILITY");
    expect(types[types.length - 1]).toBe("COMPLETION");
  });
});
