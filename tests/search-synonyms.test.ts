import { describe, expect, it } from "vitest";
import { expandQuery, matchIntent } from "@/modules/services/search-synonyms";

describe("search synonyms", () => {
  it("maps 'register company' to business registration terms", () => {
    const expanded = expandQuery("register company");
    expect(expanded).toContain("company");
    expect(expanded).toContain("business");
    expect(expanded).toContain("registration");
  });

  it("maps 'driver licence' to licence terms", () => {
    expect(expandQuery("driver licence")).toMatch(/driver/);
  });

  it("keeps plain queries intact", () => {
    expect(expandQuery("passport")).toContain("passport");
  });
});

describe("intent matching", () => {
  it("matches 'I want to start a business'", () => {
    const intent = matchIntent("I want to start a business");
    expect(intent).not.toBeNull();
    expect(intent?.canonicalTerms.join(" ")).toMatch(/business/);
    expect(intent?.related.length).toBeGreaterThan(0);
  });

  it("matches 'register company'", () => {
    const intent = matchIntent("register company");
    expect(intent?.canonicalTerms.join(" ")).toMatch(/business/);
  });

  it("returns null for unrelated queries", () => {
    expect(matchIntent("what time is it")).toBeNull();
  });
});
