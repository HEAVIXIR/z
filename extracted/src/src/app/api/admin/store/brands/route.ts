import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/brands — HEAVIX part brands CRUD
   ============================================================ */

function serialize(b: any) {
  return {
    ...b,
    createdAt: b.createdAt?.toISOString?.() ?? null,
    partCount: b._count?.parts ?? 0,
    _count: undefined,
  };
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || undefined;

    const where: any = {};
    if (q) where.OR = [{ name: { contains: q } }, { slug: { contains: q } }, { country: { contains: q } }];

    const items = await storeDb.brand.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { parts: true } } },
    });

    return NextResponse.json({
      success: true,
      data: items.map(serialize),
      total: items.length,
    });
  } catch (e: any) {
    console.error("[store/brands GET] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, slug, logoUrl, country } = body;
    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: "نام و اسلاگ الزامی است" },
        { status: 400 },
      );
    }
    const existing = await storeDb.brand.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "اسلاگ تکراری است" }, { status: 400 });
    }
    const b = await storeDb.brand.create({
      data: { name, slug, logoUrl: logoUrl || null, country: country || null },
      include: { _count: { select: { parts: true } } },
    });
    return NextResponse.json({ success: true, data: serialize(b) });
  } catch (e: any) {
    console.error("[store/brands POST] error:", e);
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
