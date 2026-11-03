import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/search/filters
 *
 * Returns all available filter options for the search sidebar.
 * This is the "facets" endpoint — it returns the distinct values
 * for each filter dimension, with counts of matching listings.
 *
 * Per HEAVIX Master Execution Plan V2.0 Phase 4B.
 *
 * Returns:
 *   {
 *     categories: [{ id, name, slug, count }],
 *     brands: [{ id, name, slug, count }],
 *     transactionTypes: [{ id, key, nameFa, count }],
 *     provinces: [{ name, count }],
 *     conditions: [{ value, label, count }],
 *     priceRange: { min, max }
 *   }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const categorySlug = url.searchParams.get("category")?.trim() || undefined;

    // Build base where clause for published listings only
    const where: any = { status: "PUBLISHED" };
    if (categorySlug) {
      const cat = await db.category.findFirst({ where: { slug: categorySlug }, select: { id: true } });
      if (cat) where.categoryId = cat.id;
    }

    // Run all facet queries in parallel
    const [categories, brands, transactionTypes, provinces, conditions, priceAgg] = await Promise.all([
      // Categories with listing counts
      db.category.findMany({
        where: { active: true, parentId: { not: null }, listings: { some: where } },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { listings: { where } } },
        },
        orderBy: { name: "asc" },
        take: 50,
      }),

      // Brands with listing counts
      db.brand.findMany({
        where: { active: true, listings: { some: where } },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { listings: { where } } },
        },
        orderBy: { name: "asc" },
        take: 50,
      }),

      // Transaction types with counts
      db.transactionType.findMany({
        where: { active: true },
        select: {
          id: true,
          key: true,
          nameFa: true,
          _count: { select: { listings: { where } } },
        },
      }).catch(() => []),

      // Provinces (from listing.province string field)
      db.listing.findMany({
        where: { ...where, province: { not: null } },
        select: { province: true },
        distinct: ["province"],
      }).then(rows => {
        // Count per province
        const counts: Record<string, number> = {};
        for (const r of rows) {
          if (r.province) counts[r.province] = (counts[r.province] || 0) + 1;
        }
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
      }),

      // Conditions
      db.listing.findMany({
        where: { ...where, condition: { not: null } },
        select: { condition: true },
      }).then(rows => {
        const counts: Record<string, number> = {};
        for (const r of rows) {
          if (r.condition) counts[r.condition] = (counts[r.condition] || 0) + 1;
        }
        const labels: Record<string, string> = {
          NEW: "نو",
          USED: "کارکرده",
          REFURBISHED: "بازسازی شده",
        };
        return Object.entries(counts).map(([value, count]) => ({
          value,
          label: labels[value] || value,
          count,
        }));
      }),

      // Price range
      db.listing.aggregate({
        where: { ...where, price: { not: null } },
        _min: { price: true },
        _max: { price: true },
      }).then(agg => ({
        min: agg._min.price ? Number(agg._min.price) : null,
        max: agg._max.price ? Number(agg._max.price) : null,
      })).catch(() => ({ min: null, max: null })),
    ]);

    return NextResponse.json({
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: (c._count as any).listings,
      })),
      brands: brands.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        count: (b._count as any).listings,
      })),
      transactionTypes: (transactionTypes as any[]).map(t => ({
        id: t.id,
        key: t.key,
        nameFa: t.nameFa,
        count: (t._count as any)?.listings || 0,
      })),
      provinces,
      conditions,
      priceRange: priceAgg,
    });
  } catch (err: any) {
    console.error("[search/filters] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
