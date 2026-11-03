import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "INACTIVE", "ARCHIVED"];
const ALLOWED_SOURCES = ["MANUAL", "AI_SUGGESTED", "IMPORTED"];

/* GET /api/admin/products — admin list (all statuses, optionally filtered). */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const categoryId = url.searchParams.get("categoryId") || undefined;
    const brandId = url.searchParams.get("brandId") || undefined;
    const q = url.searchParams.get("q")?.trim() || undefined;
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 500);

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (q) {
      where.OR = [
        { canonicalName: { contains: q } },
        { description: { contains: q } },
        { slug: { contains: q } },
      ];
    }

    const products = await db.product.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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

/* POST /api/admin/products — admin create. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    if (!body.canonicalName) {
      return NextResponse.json(
        { error: "canonicalName is required" },
        { status: 400 },
      );
    }
    if (!body.categoryId) {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 },
      );
    }

    // Verify category exists
    const category = await db.category.findUnique({ where: { id: String(body.categoryId) } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    // Verify brand if provided
    if (body.brandId) {
      const brand = await db.brand.findUnique({ where: { id: String(body.brandId) } });
      if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 400 });
    }
    // Verify model if provided
    if (body.modelId) {
      const model = await db.productModel.findUnique({ where: { id: String(body.modelId) } });
      if (!model) return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    const status = ALLOWED_STATUSES.includes(String(body.status))
      ? String(body.status)
      : "ACTIVE";
    const source = body.source && ALLOWED_SOURCES.includes(String(body.source))
      ? String(body.source)
      : "MANUAL";

    const slug = await uniqueSlug(db.product, body.slug || body.canonicalName);

    const product = await db.product.create({
      data: {
        canonicalName: String(body.canonicalName).trim(),
        slug,
        categoryId: String(body.categoryId),
        brandId: body.brandId || null,
        modelId: body.modelId || null,
        status,
        source,
        description: body.description ?? null,
        confidence:
          body.confidence === undefined || body.confidence === null
            ? null
            : Number(body.confidence),
        verifiedAt: body.verifiedAt ? new Date(body.verifiedAt) : null,
        verifiedBy: body.verifiedBy ?? null,
        sortOrder: Number(body.sortOrder) || 0,
      },
      include: {
        brand: { select: { id: true, name: true, nameEn: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        model: { select: { id: true, name: true, nameEn: true } },
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* helper exported for re-use — kept here for convenience */
export function normalizeProductSlug(s: string): string {
  return slugify(s);
}
