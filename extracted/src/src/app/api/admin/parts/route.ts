import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/parts */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 500);

    const where: any = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const parts = await db.part.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        product: {
          select: { id: true, canonicalName: true, slug: true },
          include: { brand: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ parts });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/parts */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    if (body.productId) {
      const product = await db.product.findUnique({ where: { id: String(body.productId) } });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }

    const part = await db.part.create({
      data: {
        productId: body.productId || null,
        partNumber: body.partNumber ?? null,
        oemNumber: body.oemNumber ?? null,
        condition: body.condition ?? null,
        status: body.status ?? "ACTIVE",
      },
      include: {
        product: { select: { id: true, canonicalName: true, slug: true } },
      },
    });

    return NextResponse.json({ ok: true, part });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
