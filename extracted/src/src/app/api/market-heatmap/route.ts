import { NextResponse } from "next/server";
import {
  getHeatmap,
  getHotCategories,
  getHotProvinces,
  type HeatmapMetric,
} from "@/lib/market-heatmap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/market-heatmap — PUBLIC market heatmap endpoint.

   Query:
     ?metric=listings|searches|views   (default: listings)
     ?days=                            (default: 30, clamped 1..365)
     ?action=matrix|hot-categories|hot-provinces
                                       (default: matrix)
     ?provinceSlug=                    (hot-categories filter)
     ?categorySlug=                    (hot-provinces filter)

   Returns:
     matrix          → { metric, days, cells: [...] }
     hot-categories  → { days, provinceSlug, rows: [...] }
     hot-provinces   → { days, categorySlug, rows: [...] }

   No auth required — this is aggregate market analytics, not
   user-specific data.
   ============================================================ */

const VALID_METRICS: HeatmapMetric[] = ["listings", "searches", "views"];
const VALID_ACTIONS = ["matrix", "hot-categories", "hot-provinces"];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const metricParam = (url.searchParams.get("metric") ?? "listings").toLowerCase();
    const metric: HeatmapMetric = VALID_METRICS.includes(metricParam as HeatmapMetric)
      ? (metricParam as HeatmapMetric)
      : "listings";

    const daysParam = Number(url.searchParams.get("days")) || 30;
    const days = Math.max(1, Math.min(365, daysParam));

    const actionParam = (url.searchParams.get("action") ?? "matrix").toLowerCase();
    const action = VALID_ACTIONS.includes(actionParam) ? actionParam : "matrix";

    const provinceSlug = url.searchParams.get("provinceSlug")?.trim() || null;
    const categorySlug = url.searchParams.get("categorySlug")?.trim() || null;

    if (action === "matrix") {
      const cells = await getHeatmap({ metric, days });
      return NextResponse.json({
        success: true,
        metric,
        days,
        count: cells.length,
        cells,
      });
    }

    if (action === "hot-categories") {
      const rows = await getHotCategories(provinceSlug, days);
      return NextResponse.json({
        success: true,
        days,
        provinceSlug,
        count: rows.length,
        rows,
      });
    }

    // hot-provinces
    const rows = await getHotProvinces(categorySlug, days);
    return NextResponse.json({
      success: true,
      days,
      categorySlug,
      count: rows.length,
      rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
