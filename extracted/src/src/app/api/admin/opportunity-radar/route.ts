import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/opportunity-radar — find opportunities:
   high demand / low supply, growing categories, underserved regions,
   price opportunities (listings priced below market avg).
   All opportunities include slug + title.
*/
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // 1. Demand/supply gap by category
    const requests = await db.buyRequest.groupBy({
      by: ["category"],
      _count: true,
      where: { status: { in: ["ACTIVE", "PENDING"] } },
    });
    const listingsByCat = await db.listing.groupBy({
      by: ["categoryId"],
      _count: true,
      where: { status: "PUBLISHED" },
    });
    const highDemandLowSupply = requests
      .map((r) => {
        const supply = listingsByCat.find((l) => l.categoryId === r.category)?._count || 0;
        return {
          category: r.category || "نامشخص",
          demand: r._count,
          supply,
          gap: r._count - supply,
          opportunity: r._count > supply,
        };
      })
      .filter((x) => x.opportunity)
      .sort((a, b) => b.gap - a.gap);

    // 2. Growing categories (last 7d listing growth)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentListings = await db.listing.groupBy({
      by: ["categoryId"],
      _count: true,
      where: { createdAt: { gte: since } },
    });
    const growingCategories = recentListings
      .map((g) => {
        const total = listingsByCat.find((l) => l.categoryId === g.categoryId)?._count || 0;
        return {
          categoryId: g.categoryId,
          recent: g._count,
          total,
          growthRate: total > 0 ? g._count / total : 0,
        };
      })
      .filter((g) => g.total >= 3)
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, 5);

    // 3. Underserved regions (high demand, few listings)
    const reqsByProvince = await db.buyRequest.groupBy({
      by: ["province"],
      _count: true,
      where: { status: { in: ["ACTIVE", "PENDING"] } },
    });
    const listingsByProvince = await db.listing.groupBy({
      by: ["province"],
      _count: true,
      where: { status: "PUBLISHED" },
    });
    const underservedRegions = reqsByProvince
      .map((r) => {
        const supply = listingsByProvince.find((l) => l.province === r.province)?._count || 0;
        return {
          province: r.province || "نامشخص",
          demand: r._count,
          supply,
          gap: r._count - supply,
        };
      })
      .filter((x) => x.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 10);

    // 4. Price opportunities (below market avg)
    const avg = await db.listing.aggregate({
      _avg: { price: true },
      where: { price: { not: null }, status: "PUBLISHED" },
    });
    const avgPrice = avg._avg.price ? Number(avg._avg.price) : 0;
    const cheapListings = await db.listing.findMany({
      where: {
        price: { not: null, lt: avgPrice ? BigInt(Math.floor(avgPrice * 0.7)) : undefined },
        status: "PUBLISHED",
      },
      orderBy: { price: "asc" },
      take: 10,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    return NextResponse.json({
      highDemandLowSupply,
      growingCategories,
      underservedRegions,
      priceOpportunities: cheapListings.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        price: l.price ? l.price.toString() : null,
        brandName: l.brand?.name ?? null,
        categoryName: l.category?.name ?? null,
        province: l.province,
        avgPrice: avgPrice ? avgPrice.toFixed(0) : null,
        discountPct: avgPrice && l.price ? Math.round((1 - Number(l.price) / avgPrice) * 100) : 0,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
