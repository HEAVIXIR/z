import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/hot-searches — public active list. */
export async function GET() {
  try {
    const items = await db.hotSearch.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { count: "desc" }],
      take: 30,
    });
    return NextResponse.json({ hotSearches: items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
