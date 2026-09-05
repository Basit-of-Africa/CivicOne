import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/errors";
import { createCacVasClient } from "@/server/cac-vas";

process.env.CAC_VAS_ENABLED = "true";
process.env.CAC_VAS_API_KEY = "test-cac-key";
process.env.CAC_VAS_BASE_URL = "https://staging.example.test";
process.env.CAC_VAS_TIMEOUT_MS = "1000";

describe("CAC VAS client", () => {
  it("normalizes a company response and sends the server API key", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          success: true,
          data: {
            rc_number: "RC123456",
            entity_name: "CivicOne Nigeria Ltd",
            entity_type: "COMPANY",
            entity_status: "ACTIVE",
            registration_date: "2024-01-02",
            line_of_business: "Software",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = createCacVasClient({ fetchImpl, enabled: true, apiKey: "test-cac-key", baseUrl: "https://staging.example.test", timeoutMs: 1000 });

    await expect(client.getCompanyByRc("RC123456", "COMPANY")).resolves.toMatchObject({
      rcNumber: "RC123456",
      entityName: "CivicOne Nigeria Ltd",
      status: "ACTIVE",
      lineOfBusiness: ["Software"],
      source: "CAC_VAS",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://staging.example.test/api/vas/validation/company/rc",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ X_API_KEY: "test-cac-key" }),
        body: JSON.stringify({ rc_number: "RC123456", entity_type: "COMPANY" }),
      }),
    );
  });

  it("maps CAC validation errors without exposing the API key", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          success: false,
          error: "company not found",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = createCacVasClient({ fetchImpl, enabled: true, apiKey: "test-cac-key", baseUrl: "https://staging.example.test", timeoutMs: 1000 });

    const error = await client.getCompanyByRc("RC404", "COMPANY").catch((value) => value);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: "INVALID_INPUT", statusCode: 422 });
    expect((error as Error).message).not.toContain("test-cac-key");
  });

  it("refuses calls when the integration is disabled", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const client = createCacVasClient({ fetchImpl, enabled: false, apiKey: "" });

    await expect(client.getCompanyTin("RC123456", "COMPANY")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("searches companies by name and returns normalized results", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          success: true,
          data: [
            { rc_number: "RC111111", entity_name: "CivicOne Tech Ltd", entity_type: "COMPANY", entity_status: "ACTIVE" },
            { rc_number: "RC222222", entity_name: "CivicOne Services", entity_type: "BUSINESS_NAME", entity_status: "ACTIVE" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = createCacVasClient({ fetchImpl, enabled: true, apiKey: "test-cac-key", baseUrl: "https://staging.example.test", timeoutMs: 1000 });

    const results = await client.searchCompaniesByName("CivicOne");
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ rcNumber: "RC111111", entityName: "CivicOne Tech Ltd" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://staging.example.test/api/vas/validation/open-search/company",
      expect.objectContaining({ body: JSON.stringify({ company_name: "CivicOne" }) }),
    );
  });
});
