import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMatchesForRequest } from "@/lib/ai-matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/requests/[id]/matches — get AI matching results
   for a single BuyRequest. Auth required (the requester, an
   admin, or any authed user — matches are public listings).
   ============================================================ */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getMatchesForRequest(id);
    if (!result.request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({
      request: result.request,
      matches: result.matches,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
