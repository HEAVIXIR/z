import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { Opportunity } from "@prisma/client";

/* ============================================================
   HEAVIX — Opportunity Engine (P2-27)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-27
   ------------------------------------------------------------
   Persisted opportunities surfaced by periodic scans. Each
   opportunity carries a 0..1 score and a workflow status
   (NEW → SEEN → ACTED_ON / DISMISSED).

   Detectors:
     • detectUnderpricedListings() — listings priced significantly
       below category/brand average (uses PriceRecord if
       available, else live aggregate).
     • detectHighDemandLowSupply() — categories with high search
       count but low listing count (uses SearchQuery + Listing).
     • detectTrendingBrands() — brands whose search count over
       the last 7 days exceeds the previous 7 days by a margin.
     • detectPriceDrops() — listings whose current price is
       lower than the most-recent prior PriceRecord (>=10% drop).

   runOpportunityScan() runs all 4 detectors, saves NEW
   opportunities (deduped by type+entityId+status=NEW), and
   returns the total count.

   Server-only — no client imports.
   ============================================================ */

export type OpportunityType =
  | "UNDERPRICED_LISTING"
  | "HIGH_DEMAND_LOW_SUPPLY"
  | "TRENDING_BRAND"
  | "PRICE_DROP"
  | "NEW_TREND";

const UNDERPRICED_THRESHOLD = 0.7; // < 70% of average
const PRICE_DROP_THRESHOLD = 0.9; // < 90% of previous record
const TRENDING_MIN_BASELINE = 3; // need at least 3 searches in prior window
const TRENDING_MIN_GROWTH_RATIO = 1.5; // recent / prior >= 1.5

export type GetOpportunitiesParams = {
  type?: string;
  status?: string;
  limit?: number;
};

export async function getOpportunities(
  params: GetOpportunitiesParams = {},
): Promise<Opportunity[]> {
  const where: Record<string, unknown> = {};
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  const limit =
    typeof params.limit === "number" && params.limit > 0
      ? Math.min(500, params.limit)
      : 100;
  return db.opportunity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/* ────────────────────────────────────────────────────────────
   Detector 1 — UNDERPRICED_LISTING
   ──────────────────────────────────────────────────────────── */
export async function detectUnderpricedListings(): Promise<
  NewOpportunityInput[]
> {
  // Get every PUBLISHED listing with a price, grouped by category+brand
  // so we can compute peer averages. We do this in JS to avoid SQLite
  // window-function limitations.
  const listings = await db.listing.findMany({
    where: {
      status: "PUBLISHED",
      price: { not: null },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      categoryId: true,
      brandId: true,
      province: true,
    },
    take: 2000,
  });

  if (listings.length === 0) return [];

  // Build peer groups keyed by `${categoryId}|${brandId}` (null-safe).
  const groups = new Map<string, typeof listings>();
  for (const l of listings) {
    const key = `${l.categoryId ?? "null"}|${l.brandId ?? "null"}`;
    const arr = groups.get(key) ?? [];
    arr.push(l);
    groups.set(key, arr);
  }

  const out: NewOpportunityInput[] = [];
  for (const [key, group] of groups) {
    if (group.length < 3) continue; // need a meaningful peer set
    const prices = group
      .map((l) => Number(l.price))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (prices.length < 3) continue;
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    if (avg <= 0) continue;

    for (const l of group) {
      const p = Number(l.price);
      if (!p || p <= 0) continue;
      const ratio = p / avg;
      if (ratio >= UNDERPRICED_THRESHOLD) continue;
      // Score: deeper discount → higher score, capped at 1.
      const score = Math.min(1, (1 - ratio) / (1 - UNDERPRICED_THRESHOLD));
      const discountPct = Math.round((1 - ratio) * 100);
      out.push({
        type: "UNDERPRICED_LISTING",
        entityType: "Listing",
        entityId: l.id,
        title: `آگهی زیر قیمت بازار: ${l.title}`,
        description: `قیمت این آگهی ${discountPct}٪ کمتر از میانگین هم‌گروه‌هایش است. میانگین گروه: ${Math.round(avg).toLocaleString("fa-IR")} تومان.`,
        score: Math.round(score * 100) / 100,
        metadata: JSON.stringify({
          listingSlug: l.slug,
          price: p,
          avg,
          ratio,
          discountPct,
          groupKey: key,
          province: l.province ?? null,
        }),
      });
    }
  }

  // Cap to keep the scan output bounded.
  return out.sort((a, b) => b.score - a.score).slice(0, 50);
}

/* ────────────────────────────────────────────────────────────
   Detector 2 — HIGH_DEMAND_LOW_SUPPLY
   ──────────────────────────────────────────────────────────── */
export async function detectHighDemandLowSupply(): Promise<
  NewOpportunityInput[]
> {
  // Count searches per category (last 30 days) using SearchQuery.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const searches = await db.searchQuery.findMany({
    where: { createdAt: { gte: since }, categorySlug: { not: null } },
    select: { categorySlug: true },
    take: 5000,
  });

  if (searches.length === 0) return [];

  const demandBySlug = new Map<string, number>();
  for (const s of searches) {
    const slug = s.categorySlug!;
    demandBySlug.set(slug, (demandBySlug.get(slug) ?? 0) + 1);
  }

  // Get listing counts per category slug.
  const cats = await db.category.findMany({
    where: { active: true, slug: { in: Array.from(demandBySlug.keys()) } },
    select: { id: true, name: true, slug: true, _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
  });

  const out: NewOpportunityInput[] = [];
  for (const c of cats) {
    const demand = demandBySlug.get(c.slug) ?? 0;
    if (demand < 5) continue; // need meaningful demand
    const supply = c._count.listings;
    if (supply >= 10) continue; // supply is sufficient
    // Opportunity score: high demand / low supply → high score.
    const ratio = supply > 0 ? demand / supply : demand;
    const score = Math.min(1, ratio / 20); // 20+ demand-per-listing → max score
    out.push({
      type: "HIGH_DEMAND_LOW_SUPPLY",
      entityType: "Category",
      entityId: c.id,
      title: `تقاضای بالا، عرضهٔ کم: ${c.name}`,
      description: `در ۳۰ روز گذشته ${demand.toLocaleString("fa-IR")} جستجو برای این دسته انجام شده اما فقط ${supply.toLocaleString("fa-IR")} آگهی فعال موجود است.`,
      score: Math.round(score * 100) / 100,
      metadata: JSON.stringify({
        categorySlug: c.slug,
        demand,
        supply,
        ratio,
      }),
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 30);
}

/* ────────────────────────────────────────────────────────────
   Detector 3 — TRENDING_BRAND
   ──────────────────────────────────────────────────────────── */
export async function detectTrendingBrands(): Promise<NewOpportunityInput[]> {
  const now = Date.now();
  const recentStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const priorStart = new Date(now - 14 * 24 * 60 * 60 * 1000);

  // Get all brand-related searches in the last 14 days.
  const searches = await db.searchQuery.findMany({
    where: {
      createdAt: { gte: priorStart },
      brandSlug: { not: null },
    },
    select: { brandSlug: true, createdAt: true },
    take: 5000,
  });

  if (searches.length === 0) return [];

  const recent = new Map<string, number>();
  const prior = new Map<string, number>();
  for (const s of searches) {
    const slug = s.brandSlug!;
    if (s.createdAt >= recentStart) {
      recent.set(slug, (recent.get(slug) ?? 0) + 1);
    } else {
      prior.set(slug, (prior.get(slug) ?? 0) + 1);
    }
  }

  const brands = await db.brand.findMany({
    where: { active: true, slug: { in: Array.from(recent.keys()) } },
    select: { id: true, name: true, slug: true },
  });

  const out: NewOpportunityInput[] = [];
  for (const b of brands) {
    const r = recent.get(b.slug) ?? 0;
    const p = prior.get(b.slug) ?? 0;
    if (r < TRENDING_MIN_BASELINE) continue;
    if (p < TRENDING_MIN_BASELINE) {
      // Only count as trending if there's actual growth, not just
      // first-time appearance.
      if (r < TRENDING_MIN_BASELINE * 2) continue;
    }
    const ratio = p > 0 ? r / p : r / TRENDING_MIN_BASELINE;
    if (ratio < TRENDING_MIN_GROWTH_RATIO) continue;
    const score = Math.min(1, ratio / 5); // 5x growth → max score
    out.push({
      type: "TRENDING_BRAND",
      entityType: "Brand",
      entityId: b.id,
      title: `برند در حال صعود: ${b.name}`,
      description: `جستجوی این برند در ۷ روز گذشته ${r.toLocaleString("fa-IR")} بار ثبت شده در مقابل ${p.toLocaleString("fa-IR")} بار در ۷ روز قبلی — رشد ${Math.round(ratio * 100).toLocaleString("fa-IR")}٪.`,
      score: Math.round(score * 100) / 100,
      metadata: JSON.stringify({
        brandSlug: b.slug,
        recent: r,
        prior: p,
        ratio,
      }),
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 30);
}

/* ────────────────────────────────────────────────────────────
   Detector 4 — PRICE_DROP
   ──────────────────────────────────────────────────────────── */
export async function detectPriceDrops(): Promise<NewOpportunityInput[]> {
  // Find listings that have at least 2 PriceRecord entries — the
  // current price and a prior record — where current < prior * 0.9.
  const listingsWithRecords = await db.listing.findMany({
    where: {
      status: "PUBLISHED",
      price: { not: null },
      priceRecords: { some: {} },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      priceRecords: {
        orderBy: { recordedAt: "desc" },
        take: 5,
        select: { id: true, price: true, recordedAt: true },
      },
    },
    take: 500,
  });

  const out: NewOpportunityInput[] = [];
  for (const l of listingsWithRecords) {
    if (l.priceRecords.length < 2) continue;
    const current = Number(l.price);
    if (!current || current <= 0) continue;
    // priceRecords are ordered desc — [0] is the latest, [1] is the prior.
    const prior = l.priceRecords[1].price;
    if (!prior || prior <= 0) continue;
    const ratio = current / prior;
    if (ratio >= PRICE_DROP_THRESHOLD) continue;
    const dropPct = Math.round((1 - ratio) * 100);
    const score = Math.min(1, (1 - ratio) / (1 - PRICE_DROP_THRESHOLD));
    out.push({
      type: "PRICE_DROP",
      entityType: "Listing",
      entityId: l.id,
      title: `کاهش قیمت: ${l.title}`,
      description: `قیمت این آگهی ${dropPct}٪ کاهش یافته — از ${Math.round(prior).toLocaleString("fa-IR")} به ${current.toLocaleString("fa-IR")} تومان.`,
      score: Math.round(score * 100) / 100,
      metadata: JSON.stringify({
        listingSlug: l.slug,
        currentPrice: current,
        priorPrice: prior,
        ratio,
        dropPct,
        priorRecordedAt: l.priceRecords[1].recordedAt,
      }),
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 50);
}

/* ────────────────────────────────────────────────────────────
   Scanner — runs all detectors + dedupes + persists.
   ──────────────────────────────────────────────────────────── */
export type NewOpportunityInput = {
  type: string;
  entityType: string;
  entityId: string | null;
  title: string;
  description?: string | null;
  score: number;
  metadata?: string | null;
};

export async function runOpportunityScan(): Promise<{ found: number }> {
  const [underpriced, highDemand, trending, priceDrops] = await Promise.all([
    detectUnderpricedListings().catch((e) => {
      console.error("[opportunity-engine] underpriced detector failed:", e);
      return [] as NewOpportunityInput[];
    }),
    detectHighDemandLowSupply().catch((e) => {
      console.error("[opportunity-engine] high-demand detector failed:", e);
      return [] as NewOpportunityInput[];
    }),
    detectTrendingBrands().catch((e) => {
      console.error("[opportunity-engine] trending detector failed:", e);
      return [] as NewOpportunityInput[];
    }),
    detectPriceDrops().catch((e) => {
      console.error("[opportunity-engine] price-drop detector failed:", e);
      return [] as NewOpportunityInput[];
    }),
  ]);

  const all = [...underpriced, ...highDemand, ...trending, ...priceDrops];

  // Find existing NEW opportunities with the same (type, entityId) so
  // we don't create duplicates on every scan. We re-surface existing
  // NEW rows by updating their score/description instead of duplicating.
  let created = 0;
  let updated = 0;
  for (const op of all) {
    const existing = await db.opportunity.findFirst({
      where: {
        type: op.type,
        entityId: op.entityId ?? null,
        status: "NEW",
      },
      select: { id: true },
    });
    if (existing) {
      await db.opportunity.update({
        where: { id: existing.id },
        data: {
          title: op.title,
          description: op.description ?? null,
          score: op.score,
          metadata: op.metadata ?? null,
        },
      });
      updated++;
    } else {
      await db.opportunity.create({
        data: {
          type: op.type,
          entityType: op.entityType,
          entityId: op.entityId ?? null,
          title: op.title,
          description: op.description ?? null,
          score: op.score,
          metadata: op.metadata ?? null,
          status: "NEW",
        },
      });
      created++;
    }
  }

  await logAudit({
    actorId: null,
    actorType: "SYSTEM",
    action: "opportunity.scan",
    entityType: "Opportunity",
    entityId: null,
    after: {
      totalDetected: all.length,
      created,
      updated,
      byType: {
        UNDERPRICED_LISTING: underpriced.length,
        HIGH_DEMAND_LOW_SUPPLY: highDemand.length,
        TRENDING_BRAND: trending.length,
        PRICE_DROP: priceDrops.length,
      },
    },
    reason: `اسکن موتور فرصت‌ها — ${created} فرصت جدید، ${updated} فرصت به‌روز شد`,
  });

  return { found: created };
}

/* ────────────────────────────────────────────────────────────
   Status update helper — used by the PATCH endpoint.
   ──────────────────────────────────────────────────────────── */
export async function updateOpportunityStatus(
  id: string,
  status: "NEW" | "SEEN" | "ACTED_ON" | "DISMISSED",
): Promise<Opportunity | null> {
  try {
    return await db.opportunity.update({
      where: { id },
      data: { status },
    });
  } catch {
    return null;
  }
}
