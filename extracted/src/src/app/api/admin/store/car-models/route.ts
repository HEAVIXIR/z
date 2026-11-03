import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/car-models — HEAVIX car models CRUD
   ============================================================ */

function serialize(c: any) {
  return {
    ...c,
    createdAt: c.createdAt?.toISOString?.() ?? null,
    partCount: c._count?.parts ?? 0,
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
    const type = url.searchParams.get("type") || undefined;
    const brand = url.searchParams.get("brand") || undefined;

    const where: any = {};
    if (type) where.type = type;
    if (brand) where.brand = brand;
    if (q) where.OR = [{ brand: { contains: q } }, { model: { contains: q } }];

    const items = await storeDb.carModel.findMany({
      where,
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      include: { _count: { select: { parts: true } } },
    });

    return NextResponse.json({
      success: true,
      data: items.map(serialize),
      total: items.length,
    });
  } catch (e: any) {
    console.error("[store/car-models GET] error:", e);
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
    const { brand, model, yearFrom, yearTo, type } = body;
    if (!brand || !model || !yearFrom || !yearTo) {
      return NextResponse.json(
        { success: false, error: "برند، مدل و سال شروع/پایان الزامی است" },
        { status: 400 },
      );
    }
    const c = await storeDb.carModel.create({
      data: {
        brand,
        model,
        yearFrom: Number(yearFrom),
        yearTo: Number(yearTo),
        type: type || "PASSENGER",
      },
      include: { _count: { select: { parts: true } } },
    });
    return NextResponse.json({ success: true, data: serialize(c) });
  } catch (e: any) {
    console.error("[store/car-models POST] error:", e);
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
