import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import {
  getZeroResultQueries,
  getPopularQueries,
  getDemandByCategory,
  getDemandByBrand,
} from "@/lib/demand-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/demand — demand-engine read API.

   Query:
     ?action=zero-results|popular|by-category|by-brand
     ?days=   (default 30)
     ?limit=  (default 50, only for zero-results|popular)

   Auth:
     • action=zero-results → admin-only (exposes potentially
       sensitive "what users searched for that we couldn't serve"
       data; ops team only).
     • action=popular → public (popular searches are already
       shown on the home HotSearches section).
     • action=by-category / by-brand → public (aggregate counts
       only — same as market intelligence).
*/
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = (url.searchParams.get("action") ?? "popular").toLowerCase().trim();
    const days = Number(url.searchParams.get("days")) || 30;
    const limit = Number(url.searchParams.get("limit")) || 50;

    if (action === "zero-results") {
      // Admin-only — surfaces unserved demand.
      const auth = await requireAdmin();
      if (auth !== true) return auth;
      const data = await getZeroResultQueries({ days, limit });
      return NextResponse.json({ action, days, limit, data });
    }

    if (action === "popular") {
      const data = await getPopularQueries({ days, limit });
      return NextResponse.json({ action, days, limit, data });
    }

    if (action === "by-category") {
      const data = await getDemandByCategory(days);
      return NextResponse.json({ action, days, data });
    }

    if (action === "by-brand") {
      const data = await getDemandByBrand(days);
      return NextResponse.json({ action, days, data });
    }

    return NextResponse.json(
      { error: "Unknown action. Use zero-results|popular|by-category|by-brand." },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
