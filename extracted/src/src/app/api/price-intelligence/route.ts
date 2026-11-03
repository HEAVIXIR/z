import { NextResponse } from "next/server";
import {
  getPriceStats,
  getPriceHistory,
  getPriceSuggestions,
  detectOutliers,
} from "@/lib/price-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/price-intelligence — public price-intelligence read API.

   Query:
     ?action=stats|history|suggestions|outliers
     ?productId=&categoryId=&brandId=&year=&months=&listingId=&condition=

   • stats        → getPriceStats(productId?, categoryId?, brandId?, year?)
   • history      → getPriceHistory(productId?, categoryId?, brandId?, months?)
   • suggestions  → getPriceSuggestions(categoryId, brandId?, year?, condition?)
   • outliers     → detectOutliers(listingId)

   All variants are public read — prices are derived from public
   PUBLISHED listings. Admin-only deeper views (e.g. outlier list)
   live in the admin API surface.
*/
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = (url.searchParams.get("action") ?? "stats").toLowerCase().trim();
    const productId = url.searchParams.get("productId")?.trim() || undefined;
    const categoryId = url.searchParams.get("categoryId")?.trim() || undefined;
    const brandId = url.searchParams.get("brandId")?.trim() || undefined;
    const yearRaw = url.searchParams.get("year");
    const year = yearRaw ? Number(yearRaw) : undefined;
    const monthsRaw = url.searchParams.get("months");
    const months = monthsRaw ? Number(monthsRaw) : undefined;
    const condition = url.searchParams.get("condition")?.trim() || undefined;
    const listingId = url.searchParams.get("listingId")?.trim() || undefined;

    if (action === "stats") {
      const stats = await getPriceStats({
        productId,
        categoryId,
        brandId,
        year: year && Number.isFinite(year) ? year : undefined,
      });
      return NextResponse.json({ action: "stats", ...stats });
    }

    if (action === "history") {
      const history = await getPriceHistory({
        productId,
        categoryId,
        brandId,
        months: months && Number.isFinite(months) ? months : 12,
      });
      return NextResponse.json({ action: "history", points: history });
    }

    if (action === "suggestions") {
      if (!categoryId) {
        return NextResponse.json(
          { error: "categoryId is required for action=suggestions" },
          { status: 400 },
        );
      }
      const s = await getPriceSuggestions({
        categoryId,
        brandId,
        year: year && Number.isFinite(year) ? year : undefined,
        condition,
      });
      return NextResponse.json({ action: "suggestions", ...s });
    }

    if (action === "outliers") {
      if (!listingId) {
        return NextResponse.json(
          { error: "listingId is required for action=outliers" },
          { status: 400 },
        );
      }
      const result = await detectOutliers(listingId);
      return NextResponse.json({ action: "outliers", ...result });
    }

    return NextResponse.json(
      { error: "Unknown action. Use stats|history|suggestions|outliers." },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
