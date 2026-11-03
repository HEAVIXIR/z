import { NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/price-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/pricing/history?brandId=&categoryId=&modelId=&months=
   Public. Returns monthly price history (median, range, count)
   per spec §11.
*/
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const brandId = url.searchParams.get("brandId") || null;
    const categoryId = url.searchParams.get("categoryId") || null;
    const modelId = url.searchParams.get("modelId") || null;
    const monthsRaw = url.searchParams.get("months");
    const months = monthsRaw ? Number(monthsRaw) : 12;

    if (!brandId && !categoryId && !modelId) {
      return NextResponse.json(
        { error: "At least one of brandId/categoryId/modelId is required" },
        { status: 400 },
      );
    }

    const history = await getPriceHistory({
      brandId,
      categoryId,
      modelId,
      months,
    });
    return NextResponse.json({
      months: history.length,
      points: history,
      disclaimer:
        "این داده بر اساس مشاهدات بازار است و جایگزین کارشناسی حضوری نیست.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
