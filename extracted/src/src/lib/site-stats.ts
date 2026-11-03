import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import { METRIC_OPTIONS, type StatMetric } from "@/lib/site-stats-metrics";

// Re-export for server-side convenience (API route imports from here).
export { METRIC_OPTIONS, type StatMetric };

/* ============================================================
   FIX-STATS — Admin-editable dynamic homepage stats.
   Each SiteStat row maps a `metric` to a live DB count (or a
   static `customValue`). The homepage hero + stats section
   render whatever the admin has configured here.
   ============================================================ */

export type ComputedStat = {
  id: string;
  key: string;
  labelFa: string;
  labelEn?: string | null;
  metric: string;
  customValue?: string | null;
  icon?: string | null;
  sortOrder: number;
  active: boolean;
  /** Live value formatted with toFa() (or customValue as-is). */
  value: string;
};

/**
 * Compute the raw integer count for a metric. Returns null when the
 * metric is `custom_value` (no DB count) — caller should fall back to
 * `customValue`.
 */
export async function computeMetricCount(metric: string): Promise<number | null> {
  switch (metric) {
    case "categories":
      return db.category.count({ where: { parentId: null, active: true } });
    case "brands":
      return db.brand.count({ where: { active: true } });
    case "listings":
    case "listings_published":
      return db.listing.count({ where: { status: "PUBLISHED" } });
    case "provinces":
      return db.province.count();
    case "models":
      return db.productModel.count();
    case "companies":
      return db.company.count();
    case "users":
      return db.user.count();
    case "auctions_active":
      // Auction.status: SCHEDULED | LIVE | ENDED | CANCELLED → "active" = LIVE
      return db.auction.count({ where: { status: "LIVE" } });
    case "rfq_open":
      return db.rFQ.count({ where: { status: "OPEN" } });
    case "custom_value":
    default:
      return null;
  }
}

/**
 * Compute the display value (Persian-formatted) for a single SiteStat row.
 */
export async function computeStatValue(stat: {
  metric: string;
  customValue?: string | null;
}): Promise<string> {
  if (stat.metric === "custom_value") {
    return stat.customValue ? toFa(stat.customValue) : "—";
  }
  const count = await computeMetricCount(stat.metric);
  if (count === null) return "—";
  return toFa(count);
}

/**
 * Fetch all active SiteStat rows ordered by sortOrder, with each row's
 * live value computed from the DB. Used by the homepage (hero + stats
 * section) to render whatever the admin has configured.
 */
export async function getActiveStats(): Promise<ComputedStat[]> {
  const rows = await db.siteStat.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (rows.length === 0) return [];

  const withValues = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      key: r.key,
      labelFa: r.labelFa,
      labelEn: r.labelEn,
      metric: r.metric,
      customValue: r.customValue,
      icon: r.icon,
      sortOrder: r.sortOrder,
      active: r.active,
      value: await computeStatValue(r),
    })),
  );
  return withValues;
}

/**
 * Fetch ALL SiteStat rows (active + inactive) with live values, ordered by
 * sortOrder. Used by the admin table so the admin sees what will display.
 */
export async function getAllStatsWithValues(): Promise<ComputedStat[]> {
  const rows = await db.siteStat.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const withValues = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      key: r.key,
      labelFa: r.labelFa,
      labelEn: r.labelEn,
      metric: r.metric,
      customValue: r.customValue,
      icon: r.icon,
      sortOrder: r.sortOrder,
      active: r.active,
      value: await computeStatValue(r),
    })),
  );
  return withValues;
}
