import { describe, expect, it } from "vitest";
import {
  generateVerificationToken,
  verifyVerificationToken,
  getVerificationUrl,
} from "@/modules/records/qr-verification";

describe("QR Verification Token", () => {
  const recordId = "rec_01JTESTRECORD0000000000";
  const documentId = "wdc_01JTESTDOCUM00000000000";

  it("generates a token in the expected format", () => {
    const token = generateVerificationToken(recordId, documentId);
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("v1");
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("verifies a valid token and returns the payload", () => {
    const token = generateVerificationToken(recordId, documentId);
    const payload = verifyVerificationToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.r).toBe(recordId);
    expect(payload!.d).toBe(documentId);
    expect(typeof payload!.t).toBe("number");
    expect(payload!.t).toBeGreaterThan(0);
  });

  it("returns null for an invalid token", () => {
    expect(verifyVerificationToken("invalid-token")).toBeNull();
    expect(verifyVerificationToken("v1.abc.def")).toBeNull();
    expect(verifyVerificationToken("v2.abc.def")).toBeNull();
    expect(verifyVerificationToken("")).toBeNull();
  });

  it("returns null for a token with a tampered signature", () => {
    const token = generateVerificationToken(recordId, documentId);
    const parts = token.split(".");
    // Tamper with the signature
    const tampered = `${parts[0]}.${parts[1]}.tampered_signature`;
    expect(verifyVerificationToken(tampered)).toBeNull();
  });

  it("returns null for a token with a tampered payload", () => {
    const token = generateVerificationToken(recordId, documentId);
    const parts = token.split(".");
    // Decode, modify, re-encode the payload
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    payload.r = "rec_tampered";
    const newPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const tampered = `${parts[0]}.${newPayload}.${parts[2]}`;
    expect(verifyVerificationToken(tampered)).toBeNull();
  });

  it("generates a full verification URL", () => {
    const token = generateVerificationToken(recordId, documentId);
    const url = getVerificationUrl(token);
    expect(url).toContain("/verify/");
    expect(url).toContain(token);
    expect(url).toMatch(/^https?:\/\//);
  });

  it("generates unique tokens for different record IDs", () => {
    const token1 = generateVerificationToken("rec_001", documentId);
    const token2 = generateVerificationToken("rec_002", documentId);
    expect(token1).not.toBe(token2);
  });

  it("generates unique tokens for different document IDs", () => {
    const token1 = generateVerificationToken(recordId, "wdc_001");
    const token2 = generateVerificationToken(recordId, "wdc_002");
    expect(token1).not.toBe(token2);
  });
});
