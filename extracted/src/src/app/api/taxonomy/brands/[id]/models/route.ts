import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

/* ============================================================
   /api/taxonomy/brands/[id]/models
   GET   (public) → list brand's models
   POST  (admin)  → create model under brand
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId");

  const where: Record<string, unknown> = { brandId: id, status: "ACTIVE" };
  if (categoryId) where.categoryId = categoryId;

  const models = await db.productModel.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { listings: true, generations: true } },
      category: { select: { name: true, icon: true } },
    },
  });

  return NextResponse.json({ success: true, data: models });
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
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "نام مدل الزامی است" }, { status: 400 });

    const slugify = (s: string) => s.toString().trim().toLowerCase().replace(/[^\w\u0600-\u06FF-]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = slugify(body.slug || body.nameEn || name);

    const model = await db.productModel.create({
      data: {
        brandId: id,
        name,
        nameEn: body.nameEn || null,
        slug,
        description: body.description || null,
        categoryId: body.categoryId || null,
        status: body.status || "ACTIVE",
        sortOrder: Number(body.sortOrder ?? 0),
      },
    });
    return NextResponse.json({ success: true, data: model });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
