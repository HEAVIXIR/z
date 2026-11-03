import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/categories — HEAVIX part categories CRUD
   ============================================================ */

function serialize(c: any) {
  return {
    ...c,
    createdAt: c.createdAt?.toISOString?.() ?? null,
    partCount: c._count?.parts ?? 0,
    childCount: c._count?.children ?? 0,
    _count: undefined,
  };
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const parentId = url.searchParams.get("parentId");
    const q = url.searchParams.get("q")?.trim() || undefined;

    const where: any = {};
    if (parentId === "null") where.parentId = null;
    else if (parentId) where.parentId = parentId;
    if (q) where.name = { contains: q };

    const items = await storeDb.category.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { parts: true, children: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: items.map(serialize),
      total: items.length,
    });
  } catch (e: any) {
    console.error("[store/categories GET] error:", e);
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
    const { name, slug, icon, parentId } = body;
    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: "نام و اسلاگ الزامی است" },
        { status: 400 },
      );
    }
    const existing = await storeDb.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "اسلاگ تکراری است" }, { status: 400 });
    }
    const c = await storeDb.category.create({
      data: { name, slug, icon: icon || null, parentId: parentId || null },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { parts: true, children: true } },
      },
    });
    return NextResponse.json({ success: true, data: serialize(c) });
  } catch (e: any) {
    console.error("[store/categories POST] error:", e);
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
