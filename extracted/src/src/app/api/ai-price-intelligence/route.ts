import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseNumber } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/ai-price-intelligence?listingId=...
   Returns price analysis vs similar listings.
*/
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("listingId");
    if (!id) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    const listing = await db.listing.findUnique({
      where: { id },
      include: { brand: true, category: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (!listing.price) {
      return NextResponse.json(
        { error: "این آگهی قیمت ندارد" },
        { status: 400 },
      );
    }

    // Find similar listings
    const where: any = {
      status: "PUBLISHED",
      id: { not: id },
      price: { not: null },
      OR: [],
    };
    if (listing.brandId) where.OR.push({ brandId: listing.brandId });
    if (listing.categoryId) where.OR.push({ categoryId: listing.categoryId });
    if (where.OR.length === 0) delete where.OR;

    const similar = await db.listing.findMany({
      where,
      select: { price: true, year: true, workingHours: true, condition: true, province: true },
      take: 100,
    });

    if (similar.length === 0) {
      return NextResponse.json({
        listingPrice: listing.price.toString(),
        similarCount: 0,
        analysis: "NO_SIMILAR",
        message: "آگهی مشابهی برای مقایسه یافت نشد",
      });
    }

    const prices = similar.map((s) => Number(s.price)).filter((n) => n > 0);
    prices.sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];

    const listingPrice = Number(listing.price);
    const diffFromAvg = listingPrice - avg;
    const diffPct = avg > 0 ? (diffFromAvg / avg) * 100 : 0;

    let verdict = "FAIR";
    if (diffPct < -15) verdict = "UNDERPRICED";
    else if (diffPct > 15) verdict = "OVERPRICED";

    return NextResponse.json({
      listingPrice: listing.price.toString(),
      similarCount: similar.length,
      stats: {
        avg: avg.toFixed(0),
        median: median.toFixed(0),
        min: min.toFixed(0),
        max: max.toFixed(0),
      },
      diff: {
        amount: diffFromAvg.toFixed(0),
        pct: diffPct.toFixed(1),
      },
      verdict,
      message:
        verdict === "UNDERPRICED"
          ? `قیمت این آگهی حدود ${Math.abs(diffPct).toFixed(0)}٪ کمتر از میانگین بازار است`
          : verdict === "OVERPRICED"
            ? `قیمت این آگهی حدود ${diffPct.toFixed(0)}٪ بیشتر از میانگین بازار است`
            : "قیمت این آگهی منطبق با بازار است",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
