import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/car-models — PUBLIC list (grouped by brand)
   Query: ?type=PASSENGER|HEAVY
   Returns grouped: [{ brand, models: [...] }]
   ============================================================ */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // PASSENGER | HEAVY

    const where: any = {};
    if (type === "PASSENGER" || type === "HEAVY") where.type = type;

    const items = await storeDb.carModel.findMany({
      where,
      orderBy: [{ brand: "asc" }, { yearFrom: "asc" }],
    });

    const groupedMap = new Map<string, any[]>();
    for (const cm of items) {
      const arr = groupedMap.get(cm.brand) || [];
      arr.push({
        id: cm.id,
        brand: cm.brand,
        model: cm.model,
        yearFrom: cm.yearFrom,
        yearTo: cm.yearTo,
      });
      groupedMap.set(cm.brand, arr);
    }

    const grouped = Array.from(groupedMap.entries()).map(([brand, models]) => ({
      brand,
      models,
    }));

    return NextResponse.json({ grouped });
  } catch (e: any) {
    console.error("[api/store/car-models GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
