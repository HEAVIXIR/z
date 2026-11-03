import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { storeDb } from "@/lib/store-db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/admin/store/parts/[id] — HEAVIX part CRUD
   ============================================================ */

function serialize(p: any) {
  return {
    ...p,
    images: (() => {
      try { return JSON.parse(p.images || "[]"); } catch { return []; }
    })(),
    compatibleCars: (() => {
      try { return JSON.parse(p.compatibleCars || "[]"); } catch { return []; }
    })(),
    createdAt: p.createdAt?.toISOString?.() ?? null,
    updatedAt: p.updatedAt?.toISOString?.() ?? null,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const part = await storeDb.part.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!part) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 });
    return NextResponse.json({ success: true, data: serialize(part) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await storeDb.part.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 });

    if (body.sku && body.sku !== existing.sku) {
      const dup = await storeDb.part.findUnique({ where: { sku: body.sku } });
      if (dup && dup.id !== id) {
        return NextResponse.json({ success: false, error: "SKU تکراری است" }, { status: 400 });
      }
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.nameFa !== undefined) data.nameFa = body.nameFa || null;
    if (body.sku !== undefined) data.sku = body.sku;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId;
    if (body.brandId !== undefined) data.brandId = body.brandId || null;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.priceUsd !== undefined) data.priceUsd = Number(body.priceUsd) || 0;
    if (body.oldPriceUsd !== undefined) data.oldPriceUsd = body.oldPriceUsd ? Number(body.oldPriceUsd) : null;
    if (body.contactForPrice !== undefined) data.contactForPrice = !!body.contactForPrice;
    if (body.stock !== undefined) data.stock = Number(body.stock) || 0;
    if (body.lowStockThreshold !== undefined) data.lowStockThreshold = Number(body.lowStockThreshold) || 5;
    if (body.images !== undefined) data.images = JSON.stringify(body.images || []);
    if (body.compatibleCars !== undefined) data.compatibleCars = JSON.stringify(body.compatibleCars || []);
    if (body.sourceUrl !== undefined) data.sourceUrl = body.sourceUrl || null;
    if (body.active !== undefined) data.active = !!body.active;
    if (body.featured !== undefined) data.featured = !!body.featured;
    if (body.views !== undefined) data.views = Number(body.views) || 0;
    if (body.soldCount !== undefined) data.soldCount = Number(body.soldCount) || 0;

    const part = await storeDb.part.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json({ success: true, data: serialize(part) });
  } catch (e: any) {
    console.error("[store/parts PATCH] error:", e);
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const existing = await storeDb.part.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 });
    await storeDb.part.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
