import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uniqueSlug, slugify } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/* GET /api/brand-families/[id] — single family detail. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const family = await db.brandFamily.findUnique({
      where: { id },
      include: {
        _count: { select: { brands: true } },
        brands: {
          select: { id: true, name: true, nameEn: true, slug: true },
          orderBy: { name: "asc" },
          take: 50,
        },
      },
    });
    if (!family) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      family: {
        id: family.id,
        name: family.name,
        nameEn: family.nameEn,
        slug: family.slug,
        description: family.description,
        logoUrl: family.logoUrl,
        website: family.website,
        country: family.country,
        sortOrder: family.sortOrder,
        createdAt: family.createdAt,
        updatedAt: family.updatedAt,
        _count: { brands: family._count.brands },
        brands: family.brands,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/brand-families/[id] — admin update. */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.brandFamily.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};
    const allowed = [
      "name",
      "nameEn",
      "description",
      "logoUrl",
      "website",
      "country",
    ];
    for (const k of allowed) {
      if (k in body) {
        data[k] = body[k] === undefined || body[k] === "" ? null : body[k];
      }
    }
    if ("sortOrder" in body) {
      data.sortOrder = Number(body.sortOrder) || 0;
    }
    // Slug handling — only change if explicitly provided and different.
    if (
      typeof body.slug === "string" &&
      body.slug.trim() &&
      body.slug !== existing.slug
    ) {
      data.slug = await uniqueSlug(db.brandFamily, body.slug.trim());
    } else if (
      typeof body.nameEn === "string" &&
      body.nameEn.trim() &&
      body.nameEn !== existing.nameEn &&
      !body.slug
    ) {
      // Auto-regenerate slug from new nameEn if slug wasn't explicitly provided.
      data.slug = await uniqueSlug(db.brandFamily, slugify(body.nameEn));
    }

    const family = await db.brandFamily.update({ where: { id }, data });
    return NextResponse.json({ ok: true, family });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* DELETE /api/brand-families/[id] — admin delete.
   BrandFamily is referenced by Brand.brandFamilyId with onDelete: SetNull,
   so deletion is safe — brands will have their family set to null. */
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.brandFamily.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.brandFamily.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
