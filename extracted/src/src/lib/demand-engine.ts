import { db } from "@/lib/db";
import { normalizeSearchQuery } from "@/lib/search";

/* ============================================================
   HEAVIX — Demand Engine (P2-23)
   ------------------------------------------------------------
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-23

   Tracks search queries (with zero results + popular searches)
   and computes demand signals per category/brand.

   Public contract:
     logSearchQuery({...}) — fire-and-forget persist of a search.
       Normalizes the query (Persian normalization), detects
       hasResults from resultCount, and resolves categorySlug /
       brandSlug when supplied.
     getZeroResultQueries(days, limit) — top searches returning 0
       results.
     getPopularQueries(days, limit) — top searches overall, with
       a 7-day vs previous-7-day trend indicator.
     getDemandByCategory(days) — demand (search count) vs supply
       (PUBLISHED listing count) per category, plus a 0-100
       demandScore (searches / (searches + supply), scaled).
     getDemandByBrand(days) — same shape per brand.

   Notes:
     • logSearchQuery is safe to call fire-and-forget — wrap calls
       in try/catch at the call site so logging failures never
       block the user response.
     • SQLite has no GROUP BY DATE_TRUNC; we compute the time
       window with a JS `Date` and pass it as a Prisma `gte`.
     • The "trend" indicator in getPopularQueries is a simple
       ratio: this-period count / previous-period count. > 1 is
       trending up, < 1 is trending down, NaN is "new" (no
       previous period data).

   The module is intentionally server-only (imports Prisma).
   ============================================================ */

export interface LogSearchParams {
  query: string;
  resultCount: number;
  userId?: string | null;
  ip?: string | null;
  categorySlug?: string | null;
  brandSlug?: string | null;
}

export interface ZeroResultQuery {
  query: string;
  normalizedQuery: string;
  count: number;
  lastSeen: string; // ISO
}

export interface PopularQuery {
  query: string;
  normalizedQuery: string;
  count: number;
  trend: number | null; // ratio (this/prev); null when no previous data
}

export interface CategoryDemand {
  category: { id: string; name: string; slug: string } | null;
  searchCount: number;
  listingCount: number;
  demandScore: number; // 0-100, higher = more demand relative to supply
}

export interface BrandDemand {
  brand: { id: string; name: string; slug: string } | null;
  searchCount: number;
  listingCount: number;
  demandScore: number;
}

/* ─────────── Private helpers ─────────── */

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/* ─────────── Public API ─────────── */

/**
 * Persist a SearchQuery row. Normalizes the query so future
 * aggregations can group by the normalized form. Detects
 * hasResults from resultCount > 0.
 *
 * Fire-and-forget — caller should not `await` this in the
 * critical path. Wrap calls in try/catch at the call site.
 */
export async function logSearchQuery(
  params: LogSearchParams,
): Promise<void> {
  const raw = (params.query ?? "").toString().slice(0, 500);
  if (!raw.trim()) return;
  const normalized = normalizeSearchQuery(raw);
  if (!normalized) return;

  await db.searchQuery.create({
    data: {
      query: raw,
      normalizedQuery: normalized,
      resultCount: Math.max(0, Math.floor(Number(params.resultCount) || 0)),
      userId: params.userId ?? null,
      ip: params.ip ?? null,
      categorySlug: params.categorySlug ?? null,
      brandSlug: params.brandSlug ?? null,
      hasResults: (Number(params.resultCount) || 0) > 0,
    },
  });
}

/**
 * Top searches returning zero results in the last `days` days.
 *
 * Grouped by normalizedQuery, sorted by frequency desc.
 */
export async function getZeroResultQueries(params: {
  days?: number;
  limit?: number;
}): Promise<ZeroResultQuery[]> {
  const days = Math.min(365, Math.max(1, params.days ?? 30));
  const limit = Math.min(200, Math.max(1, params.limit ?? 50));
  const since = daysAgo(days);

  // SQLite has no GROUP BY + ORDER BY _count sugar in Prisma that
  // works cleanly with the max(createdAt) we also need; pull rows
  // in and aggregate in JS. The dataset is bounded (searches per
  // 30 days) so this is fine.
  const rows = await db.searchQuery.findMany({
    where: { hasResults: false, createdAt: { gte: since } },
    select: { normalizedQuery: true, query: true, createdAt: true },
  });

  const map = new Map<string, { query: string; count: number; lastSeen: Date }>();
  for (const r of rows) {
    const existing = map.get(r.normalizedQuery);
    if (existing) {
      existing.count++;
      if (r.createdAt > existing.lastSeen) {
        existing.lastSeen = r.createdAt;
        existing.query = r.query; // keep most-recent raw form
      }
    } else {
      map.set(r.normalizedQuery, {
        query: r.query,
        count: 1,
        lastSeen: r.createdAt,
      });
    }
  }

  return Array.from(map.entries())
    .map(([normalizedQuery, v]) => ({
      query: v.query,
      normalizedQuery,
      count: v.count,
      lastSeen: v.lastSeen.toISOString(),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Top searches overall in the last `days` days.
 *
 * `trend` is the ratio of (this period count) / (previous period
 * count). The previous period is the same length as `days`. null
 * means no previous-period data (i.e. a brand-new query).
 */
export async function getPopularQueries(params: {
  days?: number;
  limit?: number;
}): Promise<PopularQuery[]> {
  const days = Math.min(365, Math.max(1, params.days ?? 30));
  const limit = Math.min(200, Math.max(1, params.limit ?? 50));
  const since = daysAgo(days);
  const prevSince = daysAgo(days * 2);

  const [currentRows, prevRows] = await Promise.all([
    db.searchQuery.findMany({
      where: { createdAt: { gte: since } },
      select: { normalizedQuery: true, query: true },
    }),
    db.searchQuery.findMany({
      where: { createdAt: { gte: prevSince, lt: since } },
      select: { normalizedQuery: true },
    }),
  ]);

  const current = new Map<string, { query: string; count: number }>();
  for (const r of currentRows) {
    const ex = current.get(r.normalizedQuery);
    if (ex) {
      ex.count++;
    } else {
      current.set(r.normalizedQuery, { query: r.query, count: 1 });
    }
  }

  const prev = new Map<string, number>();
  for (const r of prevRows) {
    prev.set(r.normalizedQuery, (prev.get(r.normalizedQuery) ?? 0) + 1);
  }

  return Array.from(current.entries())
    .map(([normalizedQuery, v]) => {
      const prevCount = prev.get(normalizedQuery) ?? 0;
      return {
        query: v.query,
        normalizedQuery,
        count: v.count,
        trend: prevCount > 0 ? v.count / prevCount : null,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Demand vs supply per category.
 *
 * Demand = number of SearchQuery rows in the period (with OR
 *   without results) that carry a `categorySlug`.
 * Supply = number of PUBLISHED listings under that category.
 * demandScore = searches / (searches + supply) * 100, rounded.
 *
 * Categories with 0 searches AND 0 supply are omitted.
 */
export async function getDemandByCategory(
  days?: number,
): Promise<CategoryDemand[]> {
  const d = Math.min(365, Math.max(1, days ?? 30));
  const since = daysAgo(d);

  const [searchRows, categories] = await Promise.all([
    db.searchQuery.findMany({
      where: { createdAt: { gte: since }, categorySlug: { not: null } },
      select: { categorySlug: true },
    }),
    db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
      },
    }),
  ]);

  const searchBySlug = new Map<string, number>();
  for (const r of searchRows) {
    if (!r.categorySlug) continue;
    searchBySlug.set(r.categorySlug, (searchBySlug.get(r.categorySlug) ?? 0) + 1);
  }

  const catBySlug = new Map(
    categories.map((c) => [c.slug, c]),
  );

  // Include categories that have either searches or supply
  const allSlugs = new Set<string>([
    ...searchBySlug.keys(),
    ...categories.map((c) => c.slug),
  ]);

  const out: CategoryDemand[] = [];
  for (const slug of allSlugs) {
    const cat = catBySlug.get(slug);
    const searchCount = searchBySlug.get(slug) ?? 0;
    const listingCount = cat?._count.listings ?? 0;
    if (searchCount === 0 && listingCount === 0) continue;
    const denom = searchCount + listingCount;
    const demandScore = denom > 0 ? Math.round((searchCount / denom) * 100) : 0;
    out.push({
      category: cat
        ? { id: cat.id, name: cat.name, slug: cat.slug }
        : null,
      searchCount,
      listingCount,
      demandScore,
    });
  }
  out.sort((a, b) => b.searchCount - a.searchCount);
  return out;
}

/**
 * Demand vs supply per brand. Same shape + scoring as
 * getDemandByCategory but keyed by brandSlug.
 */
export async function getDemandByBrand(
  days?: number,
): Promise<BrandDemand[]> {
  const d = Math.min(365, Math.max(1, days ?? 30));
  const since = daysAgo(d);

  const [searchRows, brands] = await Promise.all([
    db.searchQuery.findMany({
      where: { createdAt: { gte: since }, brandSlug: { not: null } },
      select: { brandSlug: true },
    }),
    db.brand.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
      },
    }),
  ]);

  const searchBySlug = new Map<string, number>();
  for (const r of searchRows) {
    if (!r.brandSlug) continue;
    searchBySlug.set(r.brandSlug, (searchBySlug.get(r.brandSlug) ?? 0) + 1);
  }

  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
  const allSlugs = new Set<string>([
    ...searchBySlug.keys(),
    ...brands.map((b) => b.slug),
  ]);

  const out: BrandDemand[] = [];
  for (const slug of allSlugs) {
    const brand = brandBySlug.get(slug);
    const searchCount = searchBySlug.get(slug) ?? 0;
    const listingCount = brand?._count.listings ?? 0;
    if (searchCount === 0 && listingCount === 0) continue;
    const denom = searchCount + listingCount;
    const demandScore = denom > 0 ? Math.round((searchCount / denom) * 100) : 0;
    out.push({
      brand: brand
        ? { id: brand.id, name: brand.name, slug: brand.slug }
        : null,
      searchCount,
      listingCount,
      demandScore,
    });
  }
  out.sort((a, b) => b.searchCount - a.searchCount);
  return out;
}
