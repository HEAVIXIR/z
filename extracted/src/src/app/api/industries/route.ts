import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/industries — public list of all industries. */
export async function GET() {
  try {
    const industries = await db.industry.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({
      industries: industries.map((i) => ({
        id: i.id,
        key: i.key,
        nameFa: i.nameFa,
        nameEn: i.nameEn,
        sortOrder: i.sortOrder,
        active: i.active,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
