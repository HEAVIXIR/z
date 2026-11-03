import { NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/price-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/price-history?listingId=X | ?brandId=X&categoryId=X
 *
 * Returns historical price data points for charting.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const listingId = url.searchParams.get("listingId")?.trim();
    const brandId = url.searchParams.get("brandId")?.trim();
    const categoryId = url.searchParams.get("categoryId")?.trim();

    if (!listingId && (!brandId || !categoryId)) {
      return NextResponse.json(
        { error: "listingId or (brandId + categoryId) is required" },
        { status: 400 },
      );
    }

    const history = await getPriceHistory({
      listingId: listingId || undefined,
      brandId: brandId || undefined,
      categoryId: categoryId || undefined,
    });

    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
