import { db } from "@/lib/db";
import { toFa, formatCompactPrice } from "@/lib/format";
import {
  TrendingUp,
  Loader2,
  RefreshCw,
  Gauge,
  AlertTriangle,
  History,
  Lightbulb,
} from "lucide-react";
import PriceIntelligenceClient from "./PriceIntelligenceClient";

export const dynamic = "force-dynamic";

/* ============================================================
   /admin/price-intelligence — admin view for price intelligence.
   Lets admin filter by category/brand/year and see:
     • stats table (avg/min/max/median/count per category+brand)
     • monthly history bar chart
     • outlier listings (prices far from average)
     • seller suggestions preview
   ============================================================ */

export default async function PriceIntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; brand?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const categoryFilter = sp.category?.trim() || "";
  const brandFilter = sp.brand?.trim() || "";
  const yearFilter = sp.year ? Number(sp.year) : null;

  // Load categories + brands for the filter dropdowns
  const [categories, brands] = await Promise.all([
    db.category.findMany({
      where: { active: true, parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: "asc" },
      take: 100,
    }),
    db.brand.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);

  // Build the where clause for PriceRecord aggregation
  const priceWhere: any = {};
  if (categoryFilter) priceWhere.categoryId = categoryFilter;
  if (brandFilter) priceWhere.brandId = brandFilter;
  if (yearFilter && Number.isFinite(yearFilter)) priceWhere.year = yearFilter;

  // Per category+brand stats (top 30 by sample size)
  const allStats = await db.priceRecord.groupBy({
    by: ["categoryId", "brandId"],
    where: {
      ...(categoryFilter ? { categoryId: categoryFilter } : {}),
      ...(brandFilter ? { brandId: brandFilter } : {}),
      ...(yearFilter && Number.isFinite(yearFilter) ? { year: yearFilter } : {}),
    },
    _avg: { price: true },
    _min: { price: true },
    _max: { price: true },
    _count: true,
    orderBy: { _count: { id: "desc" } },
    take: 30,
  });

  // Hydrate category + brand names for the stats table
  const catIds = Array.from(new Set(allStats.map((s) => s.categoryId).filter(Boolean))) as string[];
  const brandIds = Array.from(new Set(allStats.map((s) => s.brandId).filter(Boolean))) as string[];
  const [cats, brs] = await Promise.all([
    catIds.length
      ? db.category.findMany({
          where: { id: { in: catIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    brandIds.length
      ? db.brand.findMany({
          where: { id: { in: brandIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
  ]);
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const brandMap = new Map(brs.map((b) => [b.id, b]));

  const statsRows = allStats.map((s) => ({
    categoryId: s.categoryId,
    brandId: s.brandId,
    categoryName: s.categoryId ? catMap.get(s.categoryId)?.name ?? "—" : "—",
    brandName: s.brandId ? brandMap.get(s.brandId)?.name ?? "—" : "—",
    avg: s._avg.price ? Number(s._avg.price) : null,
    min: s._min.price ? Number(s._min.price) : null,
    max: s._max.price ? Number(s._max.price) : null,
    count: s._count,
  }));

  // Outlier listings — pull PUBLISHED listings whose price is more
  // than 50% above/below the median of their (category+brand) bucket.
  // We compute the median in JS to keep SQLite happy.
  type ListingRow = {
    id: string;
    title: string;
    slug: string;
    price: bigint;
    year: number | null;
    categoryId: string | null;
    brandId: string | null;
    brandName: string | null;
    categoryName: string | null;
  };

  const listingWhere: any = { status: "PUBLISHED", price: { not: null } };
  if (categoryFilter) listingWhere.categoryId = categoryFilter;
  if (brandFilter) listingWhere.brandId = brandFilter;
  if (yearFilter && Number.isFinite(yearFilter)) listingWhere.year = yearFilter;

  const candidateListings = await db.listing.findMany({
    where: listingWhere,
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      year: true,
      categoryId: true,
      brandId: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  // Group by category+brand for median computation
  const groups = new Map<string, bigint[]>();
  for (const l of candidateListings) {
    if (!l.price) continue;
    const key = `${l.categoryId ?? "—"}|${l.brandId ?? "—"}`;
    const arr = groups.get(key) ?? [];
    arr.push(l.price);
    groups.set(key, arr);
  }

  const outliers: Array<{
    id: string;
    title: string;
    slug: string;
    price: string;
    year: number | null;
    brandName: string | null;
    categoryName: string | null;
    deviation: number;
    median: number;
    direction: "above" | "below";
  }> = [];

  for (const l of candidateListings) {
    if (!l.price) continue;
    const key = `${l.categoryId ?? "—"}|${l.brandId ?? "—"}`;
    const arr = groups.get(key);
    if (!arr || arr.length < 3) continue;
    const sorted = [...arr].map((b) => Number(b)).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const med =
      sorted.length % 2 === 0
        ? (sorted[mid - 1]! + sorted[mid]!) / 2
        : sorted[mid]!;
    if (med === 0) continue;
    const price = Number(l.price);
    const dev = (price - med) / med;
    if (Math.abs(dev) >= 0.5) {
      outliers.push({
        id: l.id,
        title: l.title,
        slug: l.slug,
        price: l.price.toString(),
        year: l.year,
        brandName: l.brand?.name ?? null,
        categoryName: l.category?.name ?? null,
        deviation: dev,
        median: med,
        direction: dev > 0 ? "above" : "below",
      });
    }
  }
  outliers.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  return (
    <PriceIntelligenceClient
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      brands={brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug }))}
      filters={{
        category: categoryFilter,
        brand: brandFilter,
        year: yearFilter && Number.isFinite(yearFilter) ? String(yearFilter) : "",
      }}
      statsRows={statsRows.map((r) => ({
        ...r,
        avg: r.avg,
        min: r.min,
        max: r.max,
        count: r.count,
      }))}
      outliers={outliers.slice(0, 50).map((o) => ({
        ...o,
        price: o.price,
        median: o.median,
      }))}
      categoryId={categoryFilter}
      brandId={brandFilter}
      year={yearFilter && Number.isFinite(yearFilter) ? yearFilter : undefined}
    />
  );
}
