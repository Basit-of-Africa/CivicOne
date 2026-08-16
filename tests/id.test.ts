import { describe, expect, it } from "vitest";
import { generateId, randomToken, randomUrlToken, ulid } from "@/lib/id";

describe("id generation", () => {
  it("prefixes ids with the domain", () => {
    expect(generateId("usr")).toMatch(/^usr_[A-Z0-9]+$/);
    expect(generateId("ses")).toMatch(/^ses_[A-Z0-9]+$/);
  });

  it("never uses emails, phones or integers as keys", () => {
    const id = generateId("usr");
    expect(id.length).toBeGreaterThan(20);
    expect(Number.isNaN(Number(id))).toBe(true);
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId("usr")));
    expect(ids.size).toBe(1000);
  });

  it("produces ULIDs of the expected length", () => {
    expect(ulid()).toHaveLength(26);
  });

  it("produces URL-safe random tokens", () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(randomUrlToken()).toMatch(/^[0-9a-f]+$/);
    expect(randomUrlToken()).toHaveLength(64);
    expect(randomUrlToken()).not.toBe(randomUrlToken());
  });
});
