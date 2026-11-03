import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/services — public list of active HEAVIX services,
   ordered by sortOrder. Drives the homepage ServicesSection.
   No auth required.
   ============================================================ */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const onlyFeatured = url.searchParams.get("featured") === "1";
    const limit = Number(url.searchParams.get("limit")) || 100;

    const services = await db.service.findMany({
      where: {
        active: true,
        ...(onlyFeatured ? { featured: true } : {}),
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { nameFa: "asc" }],
      take: Math.max(1, Math.min(200, limit)),
    });

    return NextResponse.json({ services });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
