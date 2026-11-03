import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";
import { getEffectiveRate, usdToIrr } from "@/lib/store-currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/parts/[id] — PUBLIC part detail (marketplace UI)
   Increments `views` (best-effort). Returns reviews (approved only).
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // best-effort increment views
    try {
      await storeDb.part.update({ where: { id }, data: { views: { increment: 1 } } });
    } catch {
      /* swallow — increment is best-effort */
    }

    const p = await storeDb.part.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, country: true } },
        carModels: { select: { id: true, brand: true, model: true, yearFrom: true, yearTo: true } },
        reviews: {
          where: { approved: true },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            customer: { select: { name: true, family: true } },
          },
        },
      },
    });

    if (!p || !p.active) {
      return NextResponse.json({ error: "قطعه یافت نشد" }, { status: 404 });
    }

    const eff = await getEffectiveRate();
    const priceIrr = usdToIrr(p.priceUsd, eff);
    const oldPriceIrr = p.oldPriceUsd ? usdToIrr(p.oldPriceUsd, eff) : null;
    const discountPercent =
      p.oldPriceUsd && p.oldPriceUsd > p.priceUsd
        ? Math.round(((p.oldPriceUsd - p.priceUsd) / p.oldPriceUsd) * 100)
        : null;

    const ratingSum = p.reviews.reduce((s, r) => s + r.rating, 0);
    const ratingCount = p.reviews.length;
    const ratingAvg = ratingCount > 0 ? ratingSum / ratingCount : 0;

    const part = {
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
      reviews: p.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt?.toISOString?.() ?? null,
        customerName: `${r.customer?.name || ""} ${r.customer?.family || ""}`.trim() || "کاربر",
      })),
    };

    return NextResponse.json({ part });
  } catch (e: any) {
    console.error("[api/store/parts/[id] GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
