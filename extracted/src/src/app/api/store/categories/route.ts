import { NextResponse } from "next/server";
import { storeDb } from "@/lib/store-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/store/categories — PUBLIC list (with parts count)
   Returns flat list (parentId-aware). The marketplace UI displays
   them as filter chips + sidebar select.
   ============================================================ */

export async function GET() {
  try {
    const items = await storeDb.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { parts: true, children: true } },
      },
    });

    const categories = items.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      parentId: c.parentId,
      partCount: c._count?.parts ?? 0,
      childCount: c._count?.children ?? 0,
    }));

    return NextResponse.json({ categories });
  } catch (e: any) {
    console.error("[api/store/categories GET] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
