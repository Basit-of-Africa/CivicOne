import "server-only";
import { Prisma, type ServiceMode } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, toFieldErrors, validationError } from "@/server/errors";
import { expandQuery, matchIntent } from "./search-synonyms";
import { requireUser } from "@/server/auth/session";
import { assertPermission, PERMISSIONS } from "@/server/rbac";
import { logAudit } from "@/server/audit";
import { getRequestContext } from "@/server/request";
import { generateId } from "@/lib/id";
import { serviceIdSchema } from "./validators";

export interface ServiceCardView {
  id: string;
  slug: string;
  name: string;
  summary: string;
  mode: ServiceMode;
  isDemo: boolean;
  estimatedTime: string | null;
  categorySlug: string;
  categoryName: string;
  providerSlug: string;
  providerName: string;
  providerAbbreviation: string | null;
  jurisdictionCode: string;
  jurisdictionName: string;
  jurisdictionLevel: string;
}

export interface ServiceDetailView extends ServiceCardView {
  description: string;
  eligibility: string | null;
  officialUrl: string | null;
  requirements: Array<{
    title: string;
    description: string | null;
    isDocument: boolean;
    isVerified: boolean;
  }>;
  fees: Array<{ name: string; frequency: string | null; note: string | null }>;
  faqs: Array<{ question: string; answer: string }>;
  related: ServiceCardView[];
  steps: Array<{ title: string; description: string }>;
}

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  summary: true,
  mode: true,
  isDemo: true,
  estimatedTime: true,
  category: { select: { slug: true, name: true } },
  provider: { select: { slug: true, name: true, abbreviation: true } },
  jurisdiction: { select: { code: true, name: true, level: true } },
} satisfies Prisma.ServiceSelect;

function toCard(row: {
  id: string;
  slug: string;
  name: string;
  summary: string;
  mode: ServiceMode;
  isDemo: boolean;
  estimatedTime: string | null;
  category: { slug: string; name: string };
  provider: { slug: string; name: string; abbreviation: string | null };
  jurisdiction: { code: string; name: string; level: string };
}): ServiceCardView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    mode: row.mode,
    isDemo: row.isDemo,
    estimatedTime: row.estimatedTime,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    providerSlug: row.provider.slug,
    providerName: row.provider.name,
    providerAbbreviation: row.provider.abbreviation,
    jurisdictionCode: row.jurisdiction.code,
    jurisdictionName: row.jurisdiction.name,
    jurisdictionLevel: row.jurisdiction.level,
  };
}

export interface SearchFilters {
  query?: string;
  category?: string;
  jurisdiction?: string;
  mode?: ServiceMode;
}

export async function searchServices(
  filters: SearchFilters = {},
): Promise<ServiceCardView[]> {
  const where: Prisma.ServiceWhereInput = { isActive: true };

  if (filters.category) {
    where.category = { slug: filters.category };
  }
  if (filters.jurisdiction) {
    where.jurisdiction = { code: filters.jurisdiction };
  }
  if (filters.mode) {
    where.mode = filters.mode;
  }

  const query = filters.query?.trim();
  if (query) {
    const expanded = expandQuery(query);
    const intent = matchIntent(query);

    let ids: string[] | null = null;
    if (expanded) {
      const orQuery = expanded.split(" ").join(" OR ");
      const rows = await db.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id FROM services
          WHERE is_active = true
            AND search_vector @@ websearch_to_tsquery('english', ${orQuery})
          ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${orQuery})) DESC
          LIMIT 50
        `,
      );
      ids = rows.map((r) => r.id);
    }

    const candidateIds = intent
      ? await (async () => {
          const named = await db.service.findMany({
            where: {
              isActive: true,
              OR: [
                ...intent.canonicalTerms.map((t) => ({ name: { contains: t, mode: "insensitive" as const } })),
                ...intent.canonicalTerms.map((t) => ({ summary: { contains: t, mode: "insensitive" as const } })),
              ],
            },
            select: { id: true },
            take: 20,
          });
          return named.map((s) => s.id);
        })()
      : [];

    const merged = [...new Set([...(ids ?? []), ...candidateIds])];
    if (merged.length === 0) {
      where.id = { in: ["__none__"] };
    } else {
      where.id = { in: merged };
    }
  }

  const rows = await db.service.findMany({
    where,
    select: cardSelect,
    orderBy: [{ isDemo: "asc" }, { name: "asc" }],
    take: 50,
  });

  return rows.map(toCard);
}

export interface ServiceSearchOutcome {
  results: ServiceCardView[];
  related: ServiceCardView[];
  intentMatched: boolean;
}

export async function searchServicesWithIntent(
  filters: SearchFilters = {},
): Promise<ServiceSearchOutcome> {
  const results = await searchServices(filters);
  const query = filters.query?.trim() ?? "";
  const intent = query ? matchIntent(query) : null;

  let related: ServiceCardView[] = [];
  if (intent && intent.related.length > 0) {
    related = await getRelatedBySlugs(intent.related);
    const resultIds = new Set(results.map((r) => r.id));
    related = related.filter((r) => !resultIds.has(r.id));
  }

  return { results, related, intentMatched: Boolean(intent) };
}

export async function getServiceCategories() {
  return db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getJurisdictionOptions() {
  return db.jurisdiction.findMany({
    where: { level: { in: ["FEDERAL", "STATE"] } },
    orderBy: { name: "asc" },
  });
}

export async function getServiceBySlug(
  slug: string,
): Promise<ServiceDetailView | null> {
  const row = await db.service.findUnique({
    where: { slug, isActive: true },
    select: {
      ...cardSelect,
      description: true,
      eligibility: true,
      officialUrl: true,
      requirements: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true, isDocument: true, isVerified: true } },
      fees: { orderBy: { sortOrder: "asc" }, select: { name: true, frequency: true, note: true } },
      faqs: { orderBy: { sortOrder: "asc" }, select: { question: true, answer: true } },
      steps: { orderBy: { sortOrder: "asc" }, select: { title: true, description: true } },
      relatedFrom: {
        select: { related: { select: cardSelect } },
      },
    },
  });

  if (!row) return null;

  return {
    ...toCard(row),
    description: row.description,
    eligibility: row.eligibility,
    officialUrl: row.officialUrl,
    requirements: row.requirements,
    fees: row.fees,
    faqs: row.faqs,
    steps: row.steps,
    related: row.relatedFrom.map((r) => toCard(r.related)),
  };
}

export async function getRelatedBySlugs(slugs: string[]): Promise<ServiceCardView[]> {
  if (slugs.length === 0) return [];
  const rows = await db.service.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: cardSelect,
  });
  return rows.map(toCard);
}

export function getServiceSearchTermsForSlug(slug: string): string[] {
  const query = slug.replace(/-/g, " ");
  return query.split(" ").filter(Boolean);
}

export async function saveService(serviceId: string): Promise<{ saved: boolean }> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.SERVICES_SAVE);

  const parsed = serviceIdSchema.safeParse({ serviceId });
  if (!parsed.success) {
    throw validationError(toFieldErrors(parsed.error));
  }

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    throw new AppError("Service not found.", { code: "NOT_FOUND" });
  }

  const ctx = await getRequestContext();
  await db.savedService.upsert({
    where: { userId_serviceId: { userId: user.id, serviceId } },
    create: { id: generateId("svs"), userId: user.id, serviceId },
    update: {},
  });

  await logAudit({
    actorId: user.id,
    action: "services.saved",
    resourceType: "service",
    resourceId: serviceId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { saved: true };
}

export async function unsaveService(serviceId: string): Promise<{ saved: false }> {
  const user = await requireUser();
  assertPermission(user.roleNames, PERMISSIONS.SERVICES_SAVE);

  const ctx = await getRequestContext();
  await db.savedService.deleteMany({ where: { userId: user.id, serviceId } });

  await logAudit({
    actorId: user.id,
    action: "services.unsaved",
    resourceType: "service",
    resourceId: serviceId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { saved: false };
}

export async function getSavedServiceIds(): Promise<Set<string>> {
  const user = await requireUser();
  const rows = await db.savedService.findMany({
    where: { userId: user.id },
    select: { serviceId: true },
  });
  return new Set(rows.map((r) => r.serviceId));
}

export async function getSavedServices(): Promise<ServiceCardView[]> {
  const user = await requireUser();
  const rows = await db.savedService.findMany({
    where: { userId: user.id },
    select: { service: { select: cardSelect } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toCard(r.service));
}
