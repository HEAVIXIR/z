import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — Analytics / BI (P1-2)
   ------------------------------------------------------------
   Lightweight fire-and-forget event tracker. Every public flow
   (listing view, search, compare, offer, share, contact, etc.)
   calls `trackEvent` so the admin analytics dashboard can
   aggregate trends without coupling user flows to analytics.

   Design rules (NON-NEGOTIABLE):
     • Fire-and-forget — the caller never `await`s the persist.
     • Never throws — all errors are swallowed + console.warn'd.
     • Never blocks — the persist runs on a detached promise so
       the request lifecycle isn't lengthened.
     • Schema additive — only inserts rows into AnalyticsEvent.

   Event types (canonical set — see P1-2 spec):
     LISTING_VIEW | SEARCH | CLICK | FAVORITE | COMPARE |
     CONTACT | SHARE | REGISTER | LOGIN | LISTING_CREATE |
     OFFER_MAKE

   The module is server-only (imports Prisma).
   ============================================================ */

export const ANALYTICS_EVENT_TYPES = [
  "LISTING_VIEW",
  "SEARCH",
  "CLICK",
  "FAVORITE",
  "COMPARE",
  "CONTACT",
  "SHARE",
  "REGISTER",
  "LOGIN",
  "LISTING_CREATE",
  "OFFER_MAKE",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export interface TrackEventParams {
  eventType: string;
  userId?: string | null;
  listingId?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  query?: string | null;
  page?: string | null;
  referrer?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** Any JSON-serializable metadata. */
  metadata?: Record<string, unknown> | null;
}

/**
 * Persist a single AnalyticsEvent row.
 *
 * CONTRACT:
 *   • Fire-and-forget — returns `void` (not a Promise). The persist
 *     is detached so the caller never waits on it.
 *   • Never throws — all errors are swallowed + logged to
 *     `console.warn` so analytics can never crash the user flow.
 *   • Never blocks — runs on a separate microtask.
 *
 * Usage:
 *   trackEvent({ eventType: "LISTING_VIEW", listingId, ... });
 *   // (no await — fire and forget)
 */
export function trackEvent(params: TrackEventParams): void {
  // Detach the persist promise so the caller's microtask completes
  // before the DB write even starts. Errors are swallowed —
  // analytics MUST NEVER throw into the user flow.
  void persistEvent(params).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[analytics] trackEvent failed:", msg);
  });
}

async function persistEvent(params: TrackEventParams): Promise<void> {
  // Coerce + trim string fields so we never store bloated values.
  const eventType = String(params.eventType ?? "").trim().slice(0, 64);
  if (!eventType) return; // nothing to track

  const query =
    typeof params.query === "string" && params.query.trim()
      ? params.query.trim().slice(0, 500)
      : null;
  const page =
    typeof params.page === "string" && params.page.trim()
      ? params.page.trim().slice(0, 500)
      : null;
  const referrer =
    typeof params.referrer === "string" && params.referrer.trim()
      ? params.referrer.trim().slice(0, 500)
      : null;
  const ip =
    typeof params.ip === "string" && params.ip.trim()
      ? params.ip.trim().slice(0, 64)
      : null;
  const userAgent =
    typeof params.userAgent === "string" && params.userAgent.trim()
      ? params.userAgent.trim().slice(0, 500)
      : null;

  const metadata =
    params.metadata != null ? safeStringify(params.metadata) : null;

  await db.analyticsEvent.create({
    data: {
      eventType,
      userId: params.userId ?? null,
      listingId: params.listingId ?? null,
      categoryId: params.categoryId ?? null,
      brandId: params.brandId ?? null,
      query,
      page,
      referrer,
      ip,
      userAgent,
      metadata,
    },
  });
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return null;
    }
  }
}

/* ============================================================
   Aggregation helpers — used by /admin/analytics dashboard.
   All helpers are pure-read (no writes), server-only.
   ============================================================ */

export interface AnalyticsEventCount {
  eventType: string;
  count: number;
}

export interface TopListingView {
  listingId: string;
  title: string;
  slug: string;
  views: number;
}

export interface TopQueryRow {
  query: string;
  count: number;
}

export interface TopBrandRow {
  brandId: string;
  brandName: string;
  count: number;
}

export interface TopCategoryRow {
  categoryId: string;
  categoryName: string;
  count: number;
}

export interface DailyEventRow {
  day: string; // YYYY-MM-DD
  count: number;
}

export interface AnalyticsSummary {
  totalEvents: number;
  byType: AnalyticsEventCount[];
  topListings: TopListingView[];
  topQueries: TopQueryRow[];
  topBrands: TopBrandRow[];
  topCategories: TopCategoryRow[];
  dailyTimeline: DailyEventRow[];
}

/**
 * Compute a complete analytics summary for the last `days` days.
 *
 * Returns all the slices the /admin/analytics dashboard needs in
 * one trip so the page render stays snappy even when the event
 * stream grows into the 100k+ range.
 */
export async function getAnalyticsSummary(days: number): Promise<AnalyticsSummary> {
  const safeDays = Math.min(365, Math.max(1, Math.floor(days)));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  // Run the cheap counts in parallel — each is a single SQL pass.
  const [
    totalAgg,
    byTypeRaw,
    topListingsRaw,
    topQueriesRaw,
    topBrandsRaw,
    topCategoriesRaw,
    allRows,
  ] = await Promise.all([
    db.analyticsEvent.aggregate({
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.analyticsEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { eventType: "desc" } },
    }),
    // LISTING_VIEW grouped by listingId — top 10
    db.analyticsEvent.groupBy({
      by: ["listingId"],
      where: {
        createdAt: { gte: since },
        eventType: "LISTING_VIEW",
        listingId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { listingId: "desc" } },
      take: 10,
    }),
    db.analyticsEvent.groupBy({
      by: ["query"],
      where: {
        createdAt: { gte: since },
        eventType: "SEARCH",
        query: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
    db.analyticsEvent.groupBy({
      by: ["brandId"],
      where: {
        createdAt: { gte: since },
        brandId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { brandId: "desc" } },
      take: 10,
    }),
    db.analyticsEvent.groupBy({
      by: ["categoryId"],
      where: {
        createdAt: { gte: since },
        categoryId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 10,
    }),
    // Pull all events in the window so we can compute the daily
    // timeline in JS — SQLite has no DATE_TRUNC and the day bucket
    // is a simple `YYYY-MM-DD` slice of the ISO timestamp.
    db.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  // ── Resolve listing titles for top-listings table ──
  const topListingIds = topListingsRaw
    .map((r) => r.listingId)
    .filter((x): x is string => x !== null);
  const listingMeta =
    topListingIds.length > 0
      ? await db.listing.findMany({
          where: { id: { in: topListingIds } },
          select: { id: true, title: true, slug: true },
        })
      : [];
  const listingById = new Map(listingMeta.map((l) => [l.id, l]));

  const topListings: TopListingView[] = topListingsRaw
    .map((r) => {
      const meta = r.listingId ? listingById.get(r.listingId) : null;
      if (!meta) return null;
      return {
        listingId: meta.id,
        title: meta.title,
        slug: meta.slug,
        views: r._count._all,
      };
    })
    .filter((x): x is TopListingView => x !== null);

  // ── Resolve brand names ──
  const topBrandIds = topBrandsRaw
    .map((r) => r.brandId)
    .filter((x): x is string => x !== null);
  const brandMeta =
    topBrandIds.length > 0
      ? await db.brand.findMany({
          where: { id: { in: topBrandIds } },
          select: { id: true, name: true },
        })
      : [];
  const brandById = new Map(brandMeta.map((b) => [b.id, b.name]));
  const topBrands: TopBrandRow[] = topBrandsRaw
    .map((r) => {
      const id = r.brandId;
      if (!id) return null;
      return { brandId: id, brandName: brandById.get(id) ?? "—", count: r._count._all };
    })
    .filter((x): x is TopBrandRow => x !== null);

  // ── Resolve category names ──
  const topCategoryIds = topCategoriesRaw
    .map((r) => r.categoryId)
    .filter((x): x is string => x !== null);
  const categoryMeta =
    topCategoryIds.length > 0
      ? await db.category.findMany({
          where: { id: { in: topCategoryIds } },
          select: { id: true, name: true },
        })
      : [];
  const categoryById = new Map(categoryMeta.map((c) => [c.id, c.name]));
  const topCategories: TopCategoryRow[] = topCategoriesRaw
    .map((r) => {
      const id = r.categoryId;
      if (!id) return null;
      return {
        categoryId: id,
        categoryName: categoryById.get(id) ?? "—",
        count: r._count._all,
      };
    })
    .filter((x): x is TopCategoryRow => x !== null);

  // ── Daily timeline — JS-side bucket of createdAt ──
  const dailyMap = new Map<string, number>();
  for (const row of allRows) {
    const iso = row.createdAt.toISOString();
    const day = iso.slice(0, 10); // YYYY-MM-DD
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  // Fill gaps so the chart shows continuous days (zero on no-activity days).
  const dailyTimeline: DailyEventRow[] = [];
  const now = new Date();
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    dailyTimeline.push({ day, count: dailyMap.get(day) ?? 0 });
  }

  return {
    totalEvents: totalAgg._count._all,
    byType: byTypeRaw.map((r) => ({ eventType: r.eventType, count: r._count._all })),
    topListings,
    topQueries: topQueriesRaw
      .map((r) => ({ query: r.query ?? "", count: r._count._all }))
      .filter((r) => r.query.length > 0),
    topBrands,
    topCategories,
    dailyTimeline,
  };
}
