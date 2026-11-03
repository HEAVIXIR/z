import { NextResponse } from "next/server";
import { estimatePrice } from "@/lib/price-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/price-estimate?listingId=X
 *
 * Returns a price estimate for a listing with:
 * - estimatedPrice (median)
 * - priceLower / priceUpper (range)
 * - confidence (HIGH | MEDIUM | LOW | INSUFFICIENT)
 * - comparableCount
 * - mainDrivers (factors affecting the estimate)
 * - warnings
 * - modelVersion
 *
 * Per HEAVIX Master Execution Plan V3.0 Phase 6.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const listingId = url.searchParams.get("listingId")?.trim();

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 },
      );
    }

    const estimate = await estimatePrice({ listingId });

    if (!estimate) {
      return NextResponse.json(
        { error: "Could not generate price estimate — insufficient data" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      estimate: {
        estimatedPrice: estimate.estimatedPrice,
        priceLower: estimate.priceLower,
        priceUpper: estimate.priceUpper,
        currency: estimate.currency || "IRR",
        confidence: estimate.confidence,
        comparableCount: estimate.comparableCount,
        dataFreshness: estimate.dataFreshness,
        mainDrivers: estimate.mainDrivers,
        warnings: estimate.warnings,
        modelVersion: estimate.modelVersion,
      },
    });
  } catch (err: any) {
    console.error("[price-estimate] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
