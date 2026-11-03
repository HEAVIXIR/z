import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { rebuildIndex } from "@/lib/search-index";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/admin/search/rebuild
   --------------------------------
   Rebuild the entire SearchIndex from the live Listing / Brand /
   Category tables. Admin-only. Returns the per-entity counts +
   total rows + duration.

   The rebuild wipes SearchIndex in one shot then re-populates.
   It's idempotent — safe to call repeatedly. The call is
   synchronous; for the current dataset (~1200 rows) it completes
   in well under 2s. For production scale, move to a background
   job + return 202 Accepted. */
export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const stats = await rebuildIndex();
    await logAudit({
      actorType: "ADMIN",
      action: "search.index_rebuild",
      entityType: "SearchIndex",
      reason: `Rebuilt search index: ${stats.listings} listings, ${stats.brands} brands, ${stats.categories} categories (${stats.total} rows in ${stats.durationMs}ms)`,
    });
    return NextResponse.json({ ok: true, stats });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
