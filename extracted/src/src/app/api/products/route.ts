import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/products — public list of canonical catalog Products.

   Query params (all optional):
     - categoryId
     - brandId
     - modelId
     - status (default: ACTIVE)
     - q  (search in canonicalName + description)
     - limit (default 50, max 200)
   ============================================================ */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId") || undefined;
    const brandId = url.searchParams.get("brandId") || undefined;
    const modelId = url.searchParams.get("modelId") || undefined;
    const status = url.searchParams.get("status") || "ACTIVE";
    const q = url.searchParams.get("q")?.trim() || undefined;
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);

    const where: any = { status };
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (modelId) where.modelId = modelId;
    if (q) {
      where.OR = [
        { canonicalName: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const products = await db.product.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { canonicalName: "asc" }],
      take: limit,
      include: {
        brand: { select: { id: true, name: true, nameEn: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        model: { select: { id: true, name: true, nameEn: true } },
        _count: {
          select: { listings: true, machines: true, parts: true, attachments: true },
        },
      },
    });

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        listingsCount: p._count.listings,
        machinesCount: p._count.machines,
        partsCount: p._count.parts,
        attachmentsCount: p._count.attachments,
        _count: undefined,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
