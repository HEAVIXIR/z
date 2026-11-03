import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/mechanics — HEAVIX mechanics CRUD
   ============================================================ */

function serialize(m: any) {
  return {
    ...m,
    rating: m.rating?.toString?.() ?? String(m.rating ?? 0),
    createdAt: m.createdAt?.toISOString?.() ?? null,
    updatedAt: m.updatedAt?.toISOString?.() ?? null,
    orderCount: m._count?.orders ?? 0,
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
    const status = url.searchParams.get("status") || undefined;
    const verified = url.searchParams.get("verified");

    const where: any = {};
    if (status) where.status = status;
    if (verified === "1") where.verified = true;
    if (verified === "0") where.verified = false;
    if (q) {
      where.OR = [
        { phone: { contains: q } },
        { name: { contains: q } },
        { family: { contains: q } },
        { shopName: { contains: q } },
        { specialty: { contains: q } },
        { city: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      storeDb.mechanic.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { orders: true } } },
      }),
      storeDb.mechanic.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map(serialize),
      total,
    });
  } catch (e: any) {
    console.error("[store/mechanics GET] error:", e);
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
    const { phone, name, family, shopName, specialty, city, address, verified, status, rating, notes } = body;

    if (!phone || !name || !family) {
      return NextResponse.json(
        { success: false, error: "تلفن، نام و نام خانوادگی الزامی است" },
        { status: 400 },
      );
    }
    const existing = await storeDb.mechanic.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ success: false, error: "تلفن تکراری است" }, { status: 400 });
    }

    const m = await storeDb.mechanic.create({
      data: {
        phone,
        name,
        family,
        shopName: shopName || null,
        specialty: specialty || null,
        city: city || null,
        address: address || null,
        verified: verified === true,
        status: status || "ACTIVE",
        rating: Number(rating) || 0,
        notes: notes || null,
      },
      include: { _count: { select: { orders: true } } },
    });
    return NextResponse.json({ success: true, data: serialize(m) });
  } catch (e: any) {
    console.error("[store/mechanics POST] error:", e);
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
