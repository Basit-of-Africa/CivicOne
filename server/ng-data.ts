import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { JURISDICTIONS } from "@/prisma/service-catalogue-data";

export interface AdministrativeReference {
  id: string;
  code: string | null;
  name: string;
  parentCode: string | null;
  level: "STATE" | "LOCAL";
  latitude: number | null;
  longitude: number | null;
}

interface CacheEntry {
  expiresAt: number;
  states: AdministrativeReference[];
  lgasByState: Map<string, AdministrativeReference[]>;
}

const cacheKey = "ng-data-administrative-reference";
const globalForNgData = globalThis as typeof globalThis & {
  [cacheKey]?: CacheEntry;
};

const itemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  code: z.string().nullable().optional(),
  state_code: z.string().nullable().optional(),
  stateCode: z.string().nullable().optional(),
  latitude: z.coerce.number().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),
});

const responseSchema = z.union([
  z.array(itemSchema),
  z.object({ data: z.array(itemSchema) }),
  z.object({ results: z.array(itemSchema) }),
]);

function localFallback(): CacheEntry {
  const states = JURISDICTIONS
    .filter((item) => item.level === "STATE")
    .map((item) => ({
      id: item.code,
      code: item.code,
      name: item.name,
      parentCode: null,
      level: "STATE" as const,
      latitude: null,
      longitude: null,
    }));
  const lgasByState = new Map<string, AdministrativeReference[]>();
  for (const item of JURISDICTIONS.filter((entry) => entry.level === "LOCAL")) {
    const parentCode = item.parent ?? item.code.split("_")[0];
    const lga = {
      id: item.code,
      code: item.code,
      name: item.name,
      parentCode,
      level: "LOCAL" as const,
      latitude: null,
      longitude: null,
    };
    lgasByState.set(parentCode, [...(lgasByState.get(parentCode) ?? []), lga]);
  }
  return { expiresAt: 0, states, lgasByState };
}

function toReference(item: z.infer<typeof itemSchema>, level: AdministrativeReference["level"], parentCode: string | null): AdministrativeReference {
  return {
    id: item.id,
    code: item.code ?? null,
    name: item.name,
    parentCode: item.state_code ?? item.stateCode ?? parentCode,
    level,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
  };
}

async function fetchItems(path: string): Promise<z.infer<typeof itemSchema>[]> {
  if (!env.NG_DATA_API_KEY) throw new Error("NG_DATA_API_KEY is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${env.NG_DATA_API_URL.replace(/\/$/, "")}${path}`, {
      headers: { Authorization: `Bearer ${env.NG_DATA_API_KEY}`, Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`NG Data API returned ${response.status}`);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("NG Data API response did not match the expected shape");
    return Array.isArray(parsed.data) ? parsed.data : parsed.data.data ?? parsed.data.results;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadReference(): Promise<CacheEntry> {
  const existing = globalForNgData[cacheKey];
  if (existing && existing.expiresAt > Date.now()) return existing;

  const fallback = localFallback();
  if (!env.NG_DATA_API_KEY) return fallback;

  try {
    const stateItems = await fetchItems("/api/states");
    const states = stateItems.map((item) => toReference(item, "STATE", null));
    const lgaItems = await fetchItems("/api/local-governments");
    const lgasByState = new Map<string, AdministrativeReference[]>();
    for (const item of lgaItems) {
      const lga = toReference(item, "LOCAL", item.state_code ?? item.stateCode ?? null);
      if (!lga.parentCode) continue;
      lgasByState.set(lga.parentCode, [...(lgasByState.get(lga.parentCode) ?? []), lga]);
    }
    const entry = { states, lgasByState, expiresAt: Date.now() + env.NG_DATA_CACHE_TTL_SECONDS * 1000 };
    globalForNgData[cacheKey] = entry;
    return entry;
  } catch {
    return fallback;
  }
}

export async function getAdministrativeStates(): Promise<AdministrativeReference[]> {
  return (await loadReference()).states;
}

export async function getAdministrativeLgas(stateCode: string): Promise<AdministrativeReference[]> {
  return (await loadReference()).lgasByState.get(stateCode) ?? [];
}

export async function validateAdministrativeAddress(input: {
  stateCode: string;
  lgaCode?: string;
}): Promise<{ valid: boolean; state: AdministrativeReference | null; lga: AdministrativeReference | null }> {
  const reference = await loadReference();
  const state = reference.states.find((item) => item.code === input.stateCode) ?? null;
  if (!state) return { valid: false, state: null, lga: null };
  if (!input.lgaCode) return { valid: true, state, lga: null };
  const lga = reference.lgasByState.get(input.stateCode)?.find((item) => item.code === input.lgaCode) ?? null;
  return { valid: Boolean(lga), state, lga };
}