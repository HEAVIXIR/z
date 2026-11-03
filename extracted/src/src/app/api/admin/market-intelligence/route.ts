import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(l: any) {
  return {
    ...l,
    price: l.price ? l.price.toString() : null,
  };
}

/* GET /api/admin/market-intelligence — analytics. */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Top viewed listings
    const topViewed = await db.listing.findMany({
      orderBy: { viewCount: "desc" },
      take: 10,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    // Top categories by listing count
    const categories = await db.category.findMany({
      where: { active: true },
      include: { _count: { select: { listings: true } } },
    });
    const topCategories = categories
      .map((c) => ({ id: c.id, name: c.name, count: c._count.listings }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top brands by listing count
    const brands = await db.brand.findMany({
      where: { active: true },
      include: { _count: { select: { listings: true } } },
    });
    const topBrands = brands
      .map((b) => ({ id: b.id, name: b.name, count: b._count.listings }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Regions distribution
    const all = await db.listing.findMany({
      where: { status: "PUBLISHED" },
      select: { province: true },
    });
    const regionMap: Record<string, number> = {};
    all.forEach((l) => {
      const p = l.province || "نامشخص";
      regionMap[p] = (regionMap[p] || 0) + 1;
    });
    const regions = Object.entries(regionMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Demand/supply gap (buy requests vs listings per category)
    const requests = await db.buyRequest.groupBy({
      by: ["category"],
      _count: true,
    });
    const listingsByCat = await db.listing.groupBy({
      by: ["categoryId"],
      _count: true,
    });
    const gap = requests.map((r) => {
      const supply = listingsByCat.find((l) => l.categoryId === r.category)?._count || 0;
      return {
        category: r.category || "نامشخص",
        demand: r._count,
        supply,
        gap: r._count - supply,
      };
    });

    // Market index: avg price + total listings + total views
    const avgPrice = await db.listing.aggregate({
      _avg: { price: true },
      where: { price: { not: null } },
    });
    const totalCount = await db.listing.count();
    const totalViews = (
      await db.listing.aggregate({ _sum: { viewCount: true } })
    )._sum.viewCount ?? 0;

    // Daily brief (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newListings = await db.listing.count({
      where: { createdAt: { gte: since } },
    });
    const newRequests = await db.buyRequest.count({
      where: { createdAt: { gte: since } },
    });
    const newOffers = await db.listingOffer.count({
      where: { createdAt: { gte: since } },
    });

    return NextResponse.json({
      topViewed: topViewed.map(serialize),
      topCategories,
      topBrands,
      regions,
      demandSupplyGap: gap,
      marketIndex: {
        avgPrice: avgPrice._avg.price
          ? Number(avgPrice._avg.price).toFixed(0)
          : null,
        totalListings: totalCount,
        totalViews,
      },
      dailyBrief: {
        newListings,
        newRequests,
        newOffers,
        range: "7d",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
