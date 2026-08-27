import { describe, expect, it } from "vitest";
import {
  buildFormSchema,
  buildIdentityPrefill,
  applyIdentityAnswers,
  type FormDefinition,
} from "@/modules/applications/form-config";

const personalDetails: FormDefinition = {
  key: "personal-details",
  name: "Personal details",
  fields: [
    { key: "fullName", label: "Full name", type: "text", required: true, identityField: "legalName" },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "phone", label: "Phone", type: "phone", required: false },
    { key: "age", label: "Age", type: "number", required: false, min: 18, max: 120 },
    { key: "dob", label: "Date of birth", type: "date", required: false },
    { key: "nationality", label: "Nationality", type: "select", required: true, options: [{ label: "Nigeria", value: "nigeria" }, { label: "Other", value: "other" }] },
    { key: "newsletter", label: "Newsletter", type: "checkbox", required: false },
    { key: "doc", label: "Document", type: "file", required: false },
  ],
};

describe("buildFormSchema", () => {
  it("accepts valid answers", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({
      fullName: "Ada Obi",
      email: "ada@example.com",
      nationality: "nigeria",
      newsletter: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({ email: "ada@example.com" });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({
      fullName: "Ada Obi",
      email: "not-an-email",
      nationality: "nigeria",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects out-of-range numbers", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({
      fullName: "Ada Obi",
      email: "ada@example.com",
      nationality: "nigeria",
      age: 12,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an empty string for optional fields", () => {
    const schema = buildFormSchema(personalDetails);
    const parsed = schema.safeParse({
      fullName: "Ada Obi",
      email: "ada@example.com",
      nationality: "nigeria",
      phone: "",
      age: "",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("identity helpers", () => {
  const identity = { legalName: "Ada Obi", dateOfBirth: "1990-05-01", nationality: "Nigeria", gender: "Female" };

  it("builds a prefill map for verified fields only", () => {
    const prefill = buildIdentityPrefill(personalDetails.fields, identity);
    expect(prefill).toEqual({ fullName: "Ada Obi" });
  });

  it("returns an empty prefill when identity is not verified", () => {
    expect(buildIdentityPrefill(personalDetails.fields, null)).toEqual({});
  });

  it("overwrites submitted values with verified identity values", () => {
    const values = applyIdentityAnswers(personalDetails.fields, { fullName: "Wrong Name", email: "ada@example.com" }, identity);
    expect(values.fullName).toBe("Ada Obi");
    expect(values.email).toBe("ada@example.com");
  });
});
