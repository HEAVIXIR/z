import { NextResponse } from "next/server";
import { getPriceHealth } from "@/lib/price-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/pricing/health?listingId=
   Public. Compares the listing's asking price with the estimated
   range (spec §10). Never returns "cheap/expensive" as a verdict —
   only the IN_RANGE / BELOW_RANGE / ABOVE_RANGE / INSUFFICIENT
   classification.
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
    const health = await getPriceHealth(listingId);
    return NextResponse.json({
      ...health,
      disclaimer:
        "این برچسب جایگزین حکم قطعی گران/ارزان نیست و فقط مقایسه‌ای آماری است.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
