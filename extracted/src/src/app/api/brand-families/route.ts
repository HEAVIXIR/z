import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uniqueSlug, slugify } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/brand-families — public list of all brand families. */
export async function GET() {
  try {
    const families = await db.brandFamily.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { brands: true } } },
    });
    return NextResponse.json({
      families: families.map((f) => ({
        id: f.id,
        name: f.name,
        nameEn: f.nameEn,
        slug: f.slug,
        description: f.description,
        logoUrl: f.logoUrl,
        website: f.website,
        country: f.country,
        sortOrder: f.sortOrder,
        _count: { brands: f._count.brands },
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/brand-families — admin create. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Auto-generate slug from nameEn if not provided.
    const slugBase = body.slug || (body.nameEn ? slugify(body.nameEn) : body.name);
    const slug = await uniqueSlug(db.brandFamily, slugBase);

    const family = await db.brandFamily.create({
      data: {
        name: String(body.name),
        nameEn: body.nameEn ?? null,
        slug,
        description: body.description ?? null,
        logoUrl: body.logoUrl ?? null,
        website: body.website ?? null,
        country: body.country ?? null,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ ok: true, family });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
