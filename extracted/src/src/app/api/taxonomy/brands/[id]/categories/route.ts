import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

/* ============================================================
   /api/taxonomy/brands/[id]/categories
   POST   (admin) → link brand to category
   DELETE (admin) → unlink brand from category (?categoryId=...)
   GET    (public) → list brand's categories
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const links = await db.brandCategory.findMany({
    where: { brandId: id },
    include: { category: true },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json({ success: true, data: links });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const categoryId = String(body.categoryId ?? "");
    if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });

    const link = await db.brandCategory.upsert({
      where: { brandId_categoryId: { brandId: id, categoryId } },
      update: {
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        displayOrder: body.displayOrder ?? 0,
      },
      create: {
        brandId: id,
        categoryId,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        displayOrder: body.displayOrder ?? 0,
      },
    });
    return NextResponse.json({ success: true, data: link });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId");
    if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });

    await db.brandCategory.delete({
      where: { brandId_categoryId: { brandId: id, categoryId } },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
