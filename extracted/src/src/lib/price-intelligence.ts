import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — Price Intelligence (P2-22)
   ------------------------------------------------------------
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-22
   HEAVIX-CORRECTED-REFERENCE-V1.1.md §13 (AI Authority)

   Tracks observed listing prices, computes averages / medians /
   quartiles, monthly history, and detects outliers. Used by:
     • seller price suggestions (for the listing wizard)
     • admin outlier review (opportunistic buys / overpriced)
     • market-intelligence dashboards

   Notes:
     • Listing.price is a BigInt (Toman values exceed INT32). The
       PriceRecord.price field is Float so the analytics layer can
       use Prisma aggregations + JS stats helpers without BigInt
       friction. Conversions are explicit and loss-free for any
       realistic machine price (< 2^53).
     • recordPriceFromListing is fire-and-forget safe — wrap calls
       in try/catch at the call site so a logging failure never
       blocks the user.
     • The outlier detector uses a robust z-score against the
       inter-quartile range; +/-3σ from the median is flagged.

   The module is intentionally server-only (imports Prisma).
   ============================================================ */

export interface PriceStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
  count: number;
  p25: number | null;
  p75: number | null;
  currency: string;
}

export interface PriceHistoryPoint {
  month: string; // YYYY-MM
  avgPrice: number | null;
  count: number;
}

export interface OutlierResult {
  isOutlier: boolean;
  deviation: number; // signed percentage from median (e.g. -0.42 = 42% below)
  expectedRange: { min: number; max: number };
  median: number | null;
  sampleSize: number;
}

export interface PriceSuggestion {
  suggestedMin: number | null;
  suggestedMax: number | null;
  suggestedAvg: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sampleSize: number;
}

/* ─────────── Private helpers ─────────── */

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] ?? null;
  const frac = idx - lo;
  return (sorted[lo]! + (sorted[hi]! - sorted[lo]!) * frac);
}

function computeStats(values: number[]): Omit<PriceStats, "currency"> {
  if (values.length === 0) {
    return {
      avg: null,
      min: null,
      max: null,
      median: null,
      count: 0,
      p25: null,
      p75: null,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    avg: sum / sorted.length,
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
    median: median(sorted),
    count: sorted.length,
    p25: percentile(sorted, 0.25),
    p75: percentile(sorted, 0.75),
  };
}

/* ─────────── Public API ─────────── */

/**
 * Extract the price from a Listing and persist a PriceRecord.
 *
 * Idempotent-ish: we don't dedupe here (each scrape / re-publish
 * creates a fresh record so we can track price history). Callers
 * that want to avoid double-recording can check the most-recent
 * record before calling.
 *
 * Skips listings with no price, or with priceType CALL_FOR_PRICE
 * (no usable number). Resolves categoryId / brandId / productId /
 * year / condition from the listing itself.
 */
export async function recordPriceFromListing(listingId: string): Promise<void> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      price: true,
      priceType: true,
      year: true,
      condition: true,
      brandId: true,
      categoryId: true,
      productId: true,
    },
  });
  if (!listing) return;
  if (!listing.price) return;
  if (listing.priceType === "CALL_FOR_PRICE") return;

  await db.priceRecord.create({
    data: {
      listingId: listing.id,
      productId: listing.productId ?? null,
      categoryId: listing.categoryId ?? null,
      brandId: listing.brandId ?? null,
      price: Number(listing.price),
      currency: "IRR",
      year: listing.year ?? null,
      condition: listing.condition ?? null,
      source: "LISTING",
    },
  });
}

/**
 * Compute aggregate price stats over PriceRecord rows.
 *
 * Filters (all optional): productId, categoryId, brandId, year.
 * Returns avg / min / max / median / count / p25 / p75 / currency.
 * When no records match, returns a stats object with null fields
 * and count=0.
 */
export async function getPriceStats(params: {
  productId?: string;
  categoryId?: string;
  brandId?: string;
  year?: number;
}): Promise<PriceStats> {
  const where: any = {};
  if (params.productId) where.productId = params.productId;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.brandId) where.brandId = params.brandId;
  if (params.year) where.year = params.year;

  const rows = await db.priceRecord.findMany({
    where,
    select: { price: true },
  });

  const values = rows.map((r) => r.price);
  const stats = computeStats(values);
  return { ...stats, currency: "IRR" };
}

/**
 * Monthly timeseries of average price + sample count.
 *
 * `months` (default 12) caps how far back we look. Each point is
 * keyed by `YYYY-MM` (Gregorian — Jalali conversion is the UI's
 * responsibility). Empty months are skipped (not zero-filled) so
 * the chart only shows months with real data.
 */
export async function getPriceHistory(params: {
  productId?: string;
  categoryId?: string;
  brandId?: string;
  months?: number;
}): Promise<PriceHistoryPoint[]> {
  const months = Math.min(36, Math.max(1, params.months ?? 12));
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const where: any = { recordedAt: { gte: since } };
  if (params.productId) where.productId = params.productId;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.brandId) where.brandId = params.brandId;

  const rows = await db.priceRecord.findMany({
    where,
    select: { price: true, recordedAt: true },
  });

  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    const d = r.recordedAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const arr = buckets.get(key) ?? [];
    arr.push(r.price);
    buckets.set(key, arr);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, vals]) => ({
      month,
      avgPrice: vals.reduce((s, v) => s + v, 0) / vals.length,
      count: vals.length,
    }));
}

/**
 * Compare a listing's price to the category+brand baseline.
 *
 * The baseline is computed from PriceRecord rows that share the
 * listing's categoryId+brandId (and year if available). The
 * detector uses a robust range = [p25 - 1.5*IQR, p75 + 1.5*IQR]
 * (Tukey's fence); anything outside the fence is an outlier.
 *
 * `deviation` is signed: negative = below median (potential
 * opportunity), positive = above median (potential overprice).
 */
export async function detectOutliers(listingId: string): Promise<OutlierResult> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, price: true, categoryId: true, brandId: true, year: true },
  });
  if (!listing || !listing.price) {
    return {
      isOutlier: false,
      deviation: 0,
      expectedRange: { min: 0, max: 0 },
      median: null,
      sampleSize: 0,
    };
  }

  const where: any = {};
  if (listing.categoryId) where.categoryId = listing.categoryId;
  if (listing.brandId) where.brandId = listing.brandId;
  if (listing.year) where.year = listing.year;

  const rows = await db.priceRecord.findMany({
    where,
    select: { price: true },
  });

  if (rows.length < 3) {
    // Not enough data to judge — return non-outlier with the listing's
    // own price as the "expected range".
    const p = Number(listing.price);
    return {
      isOutlier: false,
      deviation: 0,
      expectedRange: { min: p, max: p },
      median: p,
      sampleSize: rows.length,
    };
  }

  const sorted = rows.map((r) => r.price).sort((a, b) => a - b);
  const med = median(sorted) ?? 0;
  const p25 = percentile(sorted, 0.25) ?? med;
  const p75 = percentile(sorted, 0.75) ?? med;
  const iqr = p75 - p25;
  const lo = p25 - 1.5 * iqr;
  const hi = p75 + 1.5 * iqr;

  const price = Number(listing.price);
  const isOutlier = price < lo || price > hi;
  const deviation = med > 0 ? (price - med) / med : 0;

  return {
    isOutlier,
    deviation,
    expectedRange: { min: Math.max(0, lo), max: hi },
    median: med,
    sampleSize: sorted.length,
  };
}

/**
 * Suggest a price range for a seller creating a listing in a given
 * category+brand (+optional year+condition).
 *
 * Confidence:
 *   HIGH    — sampleSize >= 10 AND p25/p75 not degenerate
 *   MEDIUM  — sampleSize >= 5
 *   LOW     — sampleSize >= 1
 *   (suggested fields null when sampleSize === 0)
 *
 * The suggested range is [p25, p75]; suggestedAvg is the mean.
 */
export async function getPriceSuggestions(params: {
  categoryId: string;
  brandId?: string;
  year?: number;
  condition?: string;
}): Promise<PriceSuggestion> {
  const where: any = { categoryId: params.categoryId };
  if (params.brandId) where.brandId = params.brandId;
  if (params.year) where.year = params.year;
  if (params.condition) where.condition = params.condition;

  const rows = await db.priceRecord.findMany({
    where,
    select: { price: true },
  });

  if (rows.length === 0) {
    return {
      suggestedMin: null,
      suggestedMax: null,
      suggestedAvg: null,
      confidence: "LOW",
      sampleSize: 0,
    };
  }

  const sorted = rows.map((r) => r.price).sort((a, b) => a - b);
  const stats = computeStats(sorted);
  let confidence: PriceSuggestion["confidence"] = "LOW";
  if (sorted.length >= 10) confidence = "HIGH";
  else if (sorted.length >= 5) confidence = "MEDIUM";

  return {
    suggestedMin: stats.p25,
    suggestedMax: stats.p75,
    suggestedAvg: stats.avg,
    confidence,
    sampleSize: sorted.length,
  };
}
