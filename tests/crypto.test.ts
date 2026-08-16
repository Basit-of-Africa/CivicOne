import { describe, expect, it } from "vitest";
import { sha256, timingSafeEqualStrings } from "@/server/crypto";

describe("crypto helpers", () => {
  it("produces a stable sha256 hex digest", () => {
    expect(sha256("abc")).toHaveLength(64);
    expect(sha256("abc")).toBe(sha256("abc"));
    expect(sha256("abc")).not.toBe(sha256("abd"));
  });

  it("never reveals the plaintext in the digest", () => {
    const token = "secret-token-123";
    const digest = sha256(token);
    expect(digest).not.toContain(token);
  });

  it("compares strings in constant time", () => {
    expect(timingSafeEqualStrings("same", "same")).toBe(true);
    expect(timingSafeEqualStrings("same", "diff")).toBe(false);
    expect(timingSafeEqualStrings("", "")).toBe(true);
  });
});
