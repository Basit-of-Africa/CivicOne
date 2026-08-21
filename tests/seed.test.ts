import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { JURISDICTIONS, SERVICE_CATEGORIES_SEED, SERVICE_PROVIDERS_SEED } from "../prisma/service-catalogue-data";

beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});

describe("service catalogue seed data", () => {
  it("defines all 13 categories", () => {
    expect(SERVICE_CATEGORIES_SEED).toHaveLength(13);
    const slugs = SERVICE_CATEGORIES_SEED.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(13);
  });

  it("defines the 36 states plus FCT", () => {
    const states = JURISDICTIONS.filter((j) => j.level === "STATE");
    expect(states).toHaveLength(37);
    expect(JURISDICTIONS.some((j) => j.code === "FEDERAL" && j.level === "FEDERAL")).toBe(true);
  });

  it("places every LGA under a state parent", () => {
    const local = JURISDICTIONS.filter((j) => j.level === "LOCAL");
    expect(local.length).toBeGreaterThan(0);
    const stateCodes = new Set(JURISDICTIONS.filter((j) => j.level === "STATE").map((j) => j.code));
    for (const lga of local) {
      expect(stateCodes.has(lga.parent!)).toBe(true);
    }
  });

  it("defines every provider with a slug and official URL", () => {
    expect(SERVICE_PROVIDERS_SEED.length).toBeGreaterThanOrEqual(15);
    for (const p of SERVICE_PROVIDERS_SEED) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.officialUrl).toMatch(/^https:\/\//);
    }
  });
});
