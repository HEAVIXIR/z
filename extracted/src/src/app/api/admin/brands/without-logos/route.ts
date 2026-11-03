import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/admin/brands/without-logos — returns brands that
   have no logoUrl. Used by the batch AI logo search button on
   the admin brands page. Auth required.

   Query: ?limit=50  (max 200)
   Returns: { brands: [{ id, name, nameEn, slug }], total }
   ============================================================ */

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));

    const brands = await db.brand.findMany({
      where: {
        active: true,
        OR: [{ logoUrl: null }, { logoUrl: "" }],
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: limit,
      select: { id: true, name: true, nameEn: true, slug: true },
    });

    return NextResponse.json({ brands, total: brands.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
