import { describe, expect, it } from "vitest";
import { maskNin } from "@/modules/identity/mask";

describe("maskNin", () => {
  it("masks all but the last four digits", () => {
    expect(maskNin("12345678901")).toBe("********8901");
  });

  it("strips non-digits before masking", () => {
    expect(maskNin("1234-5678-901")).toBe("********8901");
  });

  it("returns a fully masked string for short inputs", () => {
    expect(maskNin("123")).toBe("********");
    expect(maskNin("")).toBe("********");
  });

  it("never returns the raw NIN", () => {
    const nin = "98765432109";
    expect(maskNin(nin)).not.toContain(nin);
  });
});
