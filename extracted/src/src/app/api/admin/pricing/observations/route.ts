import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listObservations } from "@/lib/price-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/pricing/observations
   Admin only. Lists PriceObservation rows with filters (spec §13).
   Query: brandId, categoryId, source, status, limit, offset
*/
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const brandId = url.searchParams.get("brandId") || null;
    const categoryId = url.searchParams.get("categoryId") || null;
    const source = url.searchParams.get("source") || null;
    const status = url.searchParams.get("status") || null;
    const limit = url.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : 50;
    const offset = url.searchParams.get("offset")
      ? Number(url.searchParams.get("offset"))
      : 0;

    const result = await listObservations({
      brandId,
      categoryId,
      source,
      status,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
