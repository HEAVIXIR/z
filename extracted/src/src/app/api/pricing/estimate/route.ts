import { NextResponse } from "next/server";
import { estimatePrice, recordObservation, PRICE_MODEL_VERSION } from "@/lib/price-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/pricing/estimate?listingId=
   Public. Returns the HEAVIX price estimate for the given listing.

   Spec §9 (UI output) + §10 (Price Health is exposed separately
   via /api/pricing/health). The estimate is always data-driven —
   when comparable data is insufficient we return
   confidence="INSUFFICIENT" and estimatedPrice=null instead of
   inventing a number (spec §12, §17 — prevent price fabrication).
*/
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const listingId = url.searchParams.get("listingId");
    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 },
      );
    }
    const result = await estimatePrice({ listingId });
    return NextResponse.json({
      modelVersion: PRICE_MODEL_VERSION,
      disclaimer:
        "این برآورد داده‌محور است و جایگزین کارشناسی حضوری نیست.",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/pricing/estimate
   Public. Estimate from raw params (no listingId required).
   Body: { brandId, categoryId, modelId?, year?, hours?, condition?, city? }
*/
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, any>;
    const result = await estimatePrice({
      listingId: body.listingId || undefined,
      brandId: body.brandId ?? null,
      categoryId: body.categoryId ?? null,
      modelId: body.modelId ?? null,
      year: body.year != null ? Number(body.year) : null,
      hours: body.hours != null ? Number(body.hours) : null,
      condition: body.condition ?? null,
      city: body.city ?? null,
    });

    // Best-effort: record this as a MANUAL observation so future
    // estimates benefit from the data point (spec §14 Data Governance).
    if (body.brandId && body.categoryId) {
      await recordObservation({
        brandId: body.brandId,
        categoryId: body.categoryId,
        modelId: body.modelId ?? null,
        askingPrice: null,
        estimatedPrice: result.estimatedPrice,
        priceLower: result.priceLower,
        priceUpper: result.priceUpper,
        normalizedPrice: result.estimatedPrice,
        source: "AI_ESTIMATE",
        sourceType: "HEAVIX",
        quality: "MEDIUM",
        status: "ACTIVE",
        confidence: result.confidence,
        comparableCount: result.comparableCount,
        notes: "Manual estimate request via public API",
      });
    }

    return NextResponse.json({
      modelVersion: PRICE_MODEL_VERSION,
      disclaimer:
        "این برآورد داده‌محور است و جایگزین کارشناسی حضوری نیست.",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
