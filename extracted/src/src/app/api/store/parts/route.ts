import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";
import { getEffectiveRate, usdToIrr } from "@/lib/store-currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/parts — PUBLIC parts list (marketplace UI)
   No auth required. Only shows `active` parts.
   Returns prices computed from today's effective USD→IRR rate.
   ============================================================ */

function parseImages(raw: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseCompat(raw: string | null | undefined): unknown[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const categoryId = url.searchParams.get("categoryId") || undefined;
    const brandId = url.searchParams.get("brandId") || undefined;
    const carModelId = url.searchParams.get("carModelId") || undefined;
    const sort = url.searchParams.get("sort") || "newest";
    const onlyInStock = url.searchParams.get("onlyInStock") === "true";
    const onlyDiscount = url.searchParams.get("onlyDiscount") === "true";
    const limit = Math.min(200, Number(url.searchParams.get("limit")) || 100);

    const eff = await getEffectiveRate();
    const withMargin = eff.rate * (1 + (eff.marginPercent || 0) / 100);

    const where: any = { active: true };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { nameFa: { contains: q } },
        { sku: { contains: q } },
        { description: { contains: q } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (carModelId) where.carModels = { some: { id: carModelId } };
    if (onlyInStock) where.stock = { gt: 0 };
    if (onlyDiscount) where.oldPriceUsd = { not: null };

    const orderBy: any =
      sort === "price-asc"
        ? { priceUsd: "asc" }
        : sort === "price-desc"
          ? { priceUsd: "desc" }
          : sort === "popular"
            ? { views: "desc" }
            : sort === "bestseller"
              ? { soldCount: "desc" }
              : { createdAt: "desc" };

    const [items, total] = await Promise.all([
      storeDb.part.findMany({
        where,
        orderBy,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, country: true } },
          carModels: { select: { id: true, brand: true, model: true, yearFrom: true, yearTo: true } },
        },
      }),
      storeDb.part.count({ where }),
    ]);

    // Light-weight review aggregation (SQLite has no native groupBy avg)
    const partIds = items.map((p) => p.id);
    const reviews = await storeDb.review.findMany({
      where: { partId: { in: partIds }, approved: true },
      select: { partId: true, rating: true },
    });
    const ratingMap = new Map<string, { sum: number; count: number }>();
    for (const r of reviews) {
      const cur = ratingMap.get(r.partId) || { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      ratingMap.set(r.partId, cur);
    }

    const wishlistCountMap = new Map<string, number>();
    if (partIds.length > 0) {
      const grouped = await storeDb.wishlist.groupBy({
        by: ["partId"],
        where: { partId: { in: partIds } },
        _count: { partId: true },
      });
      for (const g of grouped) wishlistCountMap.set(g.partId, g._count.partId);
    }

    const parts = items.map((p) => {
      const priceIrr = usdToIrr(p.priceUsd, eff);
      const oldPriceIrr = p.oldPriceUsd ? usdToIrr(p.oldPriceUsd, eff) : null;
      const discountPercent =
        p.oldPriceUsd && p.oldPriceUsd > p.priceUsd
          ? Math.round(((p.oldPriceUsd - p.priceUsd) / p.oldPriceUsd) * 100)
          : null;
      const r = ratingMap.get(p.id);
      const ratingAvg = r ? r.sum / r.count : 0;
      const ratingCount = r ? r.count : 0;
      return {
        id: p.id,
        name: p.name,
        nameFa: p.nameFa,
        sku: p.sku,
        description: p.description,
        contactForPrice: p.contactForPrice === true,
        priceUsd: p.priceUsd,
        priceIrr,
        priceIrrFormatted: p.contactForPrice
          ? "تماس بگیرید"
          : new Intl.NumberFormat("fa-IR").format(priceIrr) + " تومان",
        oldPriceUsd: p.oldPriceUsd,
        oldPriceIrr,
        oldPriceIrrFormatted: oldPriceIrr
          ? new Intl.NumberFormat("fa-IR").format(oldPriceIrr) + " تومان"
          : null,
        discountPercent,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        images: parseImages(p.images),
        compatibleCars: parseCompat(p.compatibleCars),
        featured: p.featured,
        views: p.views,
        soldCount: p.soldCount,
        sourceUrl: p.sourceUrl,
        createdAt: p.createdAt?.toISOString?.() ?? null,
        brand: p.brand,
        category: p.category,
        carModels: p.carModels,
        ratingAvg,
        ratingCount,
        wishlistCount: wishlistCountMap.get(p.id) || 0,
      };
    });

    return NextResponse.json({
      parts,
      total,
      currency: {
        rate: eff.rate,
        marginPercent: eff.marginPercent,
        source: eff.source,
        date: eff.date,
        withMargin,
      },
    });
  } catch (e: any) {
    console.error("[api/store/parts GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
