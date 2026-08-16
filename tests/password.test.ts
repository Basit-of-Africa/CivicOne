import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/password";

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("CivicOne2024!");
    expect(hash).toBeTruthy();
    expect(hash).not.toContain("CivicOne2024!");
    expect(await verifyPassword("CivicOne2024!", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("CivicOne2024!");
    expect(await verifyPassword("Wrong2024!", hash)).toBe(false);
  });

  it("returns false for a missing hash", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", undefined)).toBe(false);
  });

  it("produces distinct hashes for the same password", async () => {
    const hashA = await hashPassword("CivicOne2024!");
    const hashB = await hashPassword("CivicOne2024!");
    expect(hashA).not.toBe(hashB);
  });
});
