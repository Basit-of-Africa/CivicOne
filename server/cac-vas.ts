import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { AppError } from "@/server/errors";

export type CacEntityType =
  | "COMPANY"
  | "BUSINESS_NAME"
  | "LIMITED_PARTNERSHIP"
  | "LIMITED_LIABILITY_PARTNERSHIP"
  | "INCORPORATED_TRUSTEE";

export interface CacCompany {
  rcNumber: string | null;
  entityName: string | null;
  entityType: string | null;
  status: string | null;
  registrationDate: string | null;
  address: string | null;
  tin: string | null;
  lineOfBusiness: string[];
  source: "CAC_VAS";
}

export interface CacVasClientOptions {
  fetchImpl?: typeof fetch;
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const envelopeSchema = z.object({
  statusCode: z.number().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
  success: z.boolean().optional(),
  error: z.string().optional(),
  errors: z.array(z.string()).nullable().optional(),
});

const companySchema = z.object({
  rc_number: z.string().nullable().optional(),
  rcNumber: z.string().nullable().optional(),
  entity_name: z.string().nullable().optional(),
  entityName: z.string().nullable().optional(),
  entity_type: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
  entity_status: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  registration_date: z.string().nullable().optional(),
  registrationDate: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  tin: z.string().nullable().optional(),
  line_of_business: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  lineOfBusiness: z.union([z.string(), z.array(z.string())]).nullable().optional(),
}).passthrough();

function normalizeLineOfBusiness(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeCompany(data: unknown): CacCompany {
  const parsed = companySchema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("CAC returned an unexpected company response.", {
      code: "INTERNAL",
      cause: parsed.error,
    });
  }
  const company = parsed.data;
  return {
    rcNumber: company.rc_number ?? company.rcNumber ?? null,
    entityName: company.entity_name ?? company.entityName ?? null,
    entityType: company.entity_type ?? company.entityType ?? null,
    status: company.entity_status ?? company.status ?? null,
    registrationDate: company.registration_date ?? company.registrationDate ?? null,
    address: company.address ?? null,
    tin: company.tin ?? null,
    lineOfBusiness: normalizeLineOfBusiness(company.line_of_business ?? company.lineOfBusiness),
    source: "CAC_VAS",
  };
}

function providerError(status: number, body: z.infer<typeof envelopeSchema>): AppError {
  if (status === 401) return new AppError("CAC VAS authentication failed.", { code: "INTERNAL", statusCode: 502 });
  if (status === 403) return new AppError("CAC VAS access is not permitted or has insufficient balance.", { code: "FORBIDDEN", statusCode: 502 });
  if (status === 400) return new AppError(body.error ?? body.message ?? "CAC rejected the validation request.", { code: "INVALID_INPUT", statusCode: 422 });
  return new AppError("CAC VAS is temporarily unavailable.", { code: "INTERNAL", statusCode: 502 });
}

export function createCacVasClient(options: CacVasClientOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const enabled = options.enabled ?? env.CAC_VAS_ENABLED;
  const apiKey = options.apiKey ?? env.CAC_VAS_API_KEY;
  const baseUrl = options.baseUrl ?? env.CAC_VAS_BASE_URL;
  const timeoutMs = options.timeoutMs ?? env.CAC_VAS_TIMEOUT_MS;

  async function request(path: string, body: Record<string, string>): Promise<unknown> {
    if (!enabled || !apiKey) {
      throw new AppError("CAC VAS integration is not enabled.", { code: "CONFLICT" });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          X_API_KEY: apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const parsedBody = envelopeSchema.safeParse(await response.json());
      const envelope = parsedBody.success ? parsedBody.data : {};
      if (!response.ok || envelope.success === false) throw providerError(response.status, envelope);
      return envelope.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("CAC VAS is temporarily unavailable.", {
        code: "INTERNAL",
        statusCode: 502,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    getCompanyByRc(rcNumber: string, entityType: CacEntityType): Promise<CacCompany> {
      return request("/api/vas/validation/company/rc", { rc_number: rcNumber, entity_type: entityType }).then(normalizeCompany);
    },
    getCompanyByName(rcNumber: string, entityName: string): Promise<CacCompany> {
      return request("/api/vas/validation/company/name", { rc_number: rcNumber, entity_name: entityName }).then(normalizeCompany);
    },
    getCompanyByTin(tin: string): Promise<CacCompany> {
      return request("/api/vas/validation/tin/company", { tin }).then(normalizeCompany);
    },
    getCompanyTin(rcNumber: string, entityType: CacEntityType): Promise<string | null> {
      return request("/api/vas/validation/tin", { rc_number: rcNumber, entity_type: entityType }).then((data) => {
        const parsed = z.object({ tin: z.string().nullable().optional() }).safeParse(data);
        return parsed.success ? parsed.data.tin ?? null : null;
      });
    },
  };
}

export const cacVas = createCacVasClient();