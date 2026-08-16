import { describe, expect, it } from "vitest";
import {
  decryptSensitive,
  encryptSensitive,
} from "@/server/encryption";

describe("sensitive encryption", () => {
  it("round-trips a value", () => {
    const payload = encryptSensitive("12345678901");
    expect(decryptSensitive(payload)).toBe("12345678901");
  });

  it("does not store plaintext", () => {
    const payload = encryptSensitive("12345678901");
    expect(payload).not.toContain("12345678901");
  });

  it("produces a different ciphertext per call (fresh IV)", () => {
    const a = encryptSensitive("12345678901");
    const b = encryptSensitive("12345678901");
    expect(a).not.toBe(b);
    expect(decryptSensitive(a)).toBe(decryptSensitive(b));
  });

  it("rejects a tampered payload", () => {
    const payload = encryptSensitive("12345678901");
    const parts = payload.split(":");
    const tag = parts[2];
    const tamperedTag = tag[0] === "A" ? `B${tag.slice(1)}` : `A${tag.slice(1)}`;
    const tampered = [parts[0], parts[1], tamperedTag, parts[3]].join(":");
    expect(() => decryptSensitive(tampered)).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decryptSensitive("not-a-payload")).toThrow();
  });
});
