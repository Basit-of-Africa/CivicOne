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
import {
  searchServices,
  searchServicesWithIntent,
  getServiceBySlug,
  getServiceCategories,
} from "@/modules/services/service";

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
    expect(detail!.steps.length).toBeGreaterThan(0);
    expect(detail!.providerName).toBeTruthy();
  });

  it("lists all 13 categories", async () => {
    const categories = await getServiceCategories();
    expect(categories).toHaveLength(13);
  });

  it("surfaces intent-related services for 'I want to start a business'", async () => {
    const outcome = await searchServicesWithIntent({ query: "I want to start a business." });
    expect(outcome.intentMatched).toBe(true);
    expect(outcome.results.some((s) => s.slug === "business-registration")).toBe(true);
    const surfaced = [...outcome.results, ...outcome.related].map((s) => s.slug);
    expect(surfaced).toContain("tin-registration");
    expect(outcome.related.length).toBeGreaterThan(0);
  });

  it("returns no related services when no intent matches", async () => {
    const outcome = await searchServicesWithIntent({ query: "xyzzy" });
    expect(outcome.intentMatched).toBe(false);
    expect(outcome.related).toHaveLength(0);
  });

  it("filters by service mode", async () => {
    const results = await searchServices({ mode: "EXTERNAL" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.mode).toBe("EXTERNAL");
    }
  });
});
