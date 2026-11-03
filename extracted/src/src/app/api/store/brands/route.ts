import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/brands — PUBLIC list (with parts count)
   ============================================================ */

export async function GET() {
  try {
    const items = await storeDb.brand.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { parts: true } },
      },
    });

    const brands = items.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      country: b.country,
      partsCount: b._count?.parts ?? 0,
    }));

    return NextResponse.json({ brands });
  } catch (e: any) {
    console.error("[api/store/brands GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
