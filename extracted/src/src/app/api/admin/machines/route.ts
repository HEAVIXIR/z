import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/admin/machines — admin list. */
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

    const machines = await db.machine.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        product: {
          select: { id: true, canonicalName: true, slug: true },
          include: {
            brand: { select: { id: true, name: true } },
          },
        },
        listing: { select: { id: true, slug: true, title: true, status: true } },
      },
    });

    return NextResponse.json({ machines });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/admin/machines — admin create. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    // Verify product if provided
    if (body.productId) {
      const product = await db.product.findUnique({ where: { id: String(body.productId) } });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }
    if (body.listingId) {
      const listing = await db.listing.findUnique({ where: { id: String(body.listingId) } });
      if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 400 });
    }

    const machine = await db.machine.create({
      data: {
        productId: body.productId || null,
        listingId: body.listingId || null,
        serialNumber: body.serialNumber ?? null,
        manufactureYear:
          body.manufactureYear === undefined || body.manufactureYear === null || body.manufactureYear === ""
            ? null
            : Number(body.manufactureYear),
        hours:
          body.hours === undefined || body.hours === null || body.hours === ""
            ? null
            : Number(body.hours),
        condition: body.condition ?? null,
        ownershipHistory: body.ownershipHistory ?? null,
        status: body.status ?? "ACTIVE",
      },
      include: {
        product: { select: { id: true, canonicalName: true, slug: true } },
      },
    });

    return NextResponse.json({ ok: true, machine });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
