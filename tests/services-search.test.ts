import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

import { db } from "@/server/db";
import { searchServices, getServiceBySlug, getServiceCategories } from "@/modules/services/service";
import { expandQuery } from "@/modules/services/search-synonyms";

beforeAll(async () => {
  cookieJar.clear();
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});

describe("service search (real database)", () => {
  it("returns business registration for 'register company'", async () => {
    const results = await searchServices({ query: "register company" });
    expect(results.some((s) => s.slug === "business-registration")).toBe(true);
  });

  it("returns driver licence for 'driver licence'", async () => {
    const results = await searchServices({ query: "driver licence" });
    expect(results.some((s) => s.slug === "driver-licence")).toBe(true);
  });

  it("returns passport services for 'passport'", async () => {
    const results = await searchServices({ query: "passport" });
    expect(results.some((s) => s.slug === "national-passport")).toBe(true);
  });

  it("filters by category", async () => {
    const results = await searchServices({ category: "transport" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.categorySlug).toBe("transport");
    }
  });

  it("filters by jurisdiction code", async () => {
    const results = await searchServices({ jurisdiction: "LAGOS" });
    for (const r of results) {
      expect(r.jurisdictionCode).toBe("LAGOS");
    }
  });

  it("returns the full detail view for a slug", async () => {
    const detail = await getServiceBySlug("business-registration");
    expect(detail).not.toBeNull();
    expect(detail!.requirements.length).toBeGreaterThan(0);
    expect(detail!.fees.length).toBeGreaterThan(0);
    expect(detail!.faqs.length).toBeGreaterThan(0);
    expect(detail!.providerName).toBeTruthy();
  });

  it("lists all 13 categories", async () => {
    const categories = await getServiceCategories();
    expect(categories).toHaveLength(13);
  });
});
