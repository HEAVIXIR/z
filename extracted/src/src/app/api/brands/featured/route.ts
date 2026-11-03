import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/brands/featured — public list of brands flagged
   `showOnHomepage=true` (via BrandDisplay) OR `featured=true`.
   Used by the homepage TrustedBrandsSection ticker.

   Returns up to 20 brands with: id, slug, name, nameEn, logoUrl,
   country, listingCount (PUBLISHED only).
   ============================================================ */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    // Brands with featured=true OR an existing BrandDisplay row with
    // showOnHomepage=true. We do this in two steps so SQLite can use
    // simple indexes: (1) collect brand IDs that have a showOnHomepage
    // BrandDisplay row, (2) OR them with featured=true.
    const [displayBrands, featuredBrands] = await Promise.all([
      db.brandDisplay.findMany({
        where: { showOnHomepage: true },
        select: { brandId: true, displayOrder: true },
      }),
      db.brand.findMany({
        where: { featured: true, active: true },
        select: { id: true, sortOrder: true },
      }),
    ]);

    const displayIds = new Set(displayBrands.map((d) => d.brandId));
    const featuredIds = new Set(featuredBrands.map((b) => b.id));
    const allIds = new Set<string>([...displayIds, ...featuredIds]);
    if (allIds.size === 0) {
      // Fallback: take the 20 brands with the most PUBLISHED listings
      // so the ticker is never empty on a fresh install.
      const top = await db.brand.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: limit,
        include: {
          _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
        },
      });
      return NextResponse.json({
        brands: top.map((b) => ({
          id: b.id,
          slug: b.slug,
          name: b.name,
          nameEn: b.nameEn,
          logoUrl: b.logoUrl,
          country: b.country,
          listingCount: b._count.listings,
        })),
      });
    }

    const brands = await db.brand.findMany({
      where: { id: { in: Array.from(allIds) }, active: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: limit,
      include: {
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
        display: { select: { displayOrder: true } },
      },
    });

    // Sort: featured first, then by displayOrder (if any), then name.
    const sorted = [...brands].sort((a, b) => {
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
      const aOrder = a.display?.displayOrder ?? 0;
      const bOrder = b.display?.displayOrder ?? 0;
      if (bOrder !== aOrder) return bOrder - aOrder;
      return a.name.localeCompare(b.name, "fa");
    });

    return NextResponse.json({
      brands: sorted.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        nameEn: b.nameEn,
        logoUrl: b.logoUrl,
        country: b.country,
        listingCount: b._count.listings,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
