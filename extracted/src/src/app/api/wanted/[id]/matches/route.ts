import { NextResponse } from "next/server";
import { matchRequestToListings } from "@/lib/matching-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/wanted/[id]/matches — get matching listings for a wanted request.
 *
 * Returns scored matches with:
 * - listingId, listingTitle, listingPrice, listingBrand, listingCity
 * - score (0..100), confidence (HIGH/MEDIUM/LOW), reasons[]
 *
 * Per HEAVIX Master Execution Plan V3.0 Phase 7D-7E.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 10));
    const minScore = Math.min(100, Math.max(0, Number(url.searchParams.get("minScore")) || 10));

    const matches = await matchRequestToListings(id, { limit, minScore });

    return NextResponse.json({
      matches,
      count: matches.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
