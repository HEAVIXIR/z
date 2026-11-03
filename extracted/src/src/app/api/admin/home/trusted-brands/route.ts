import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/admin/home/trusted-brands
   Returns:
     {
       config: { title, subtitle, description, limit, tickerSpeed },
       brands: [{ id, name, nameEn, slug, logoUrl, country,
                  featured, showOnHomepage, listingCount }]
     }
   ============================================================ */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const s = await db.siteSettings.findUnique({ where: { id: "main" } });

    const brands = await db.brand.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        logoUrl: true,
        country: true,
        featured: true,
        display: { select: { showOnHomepage: true } },
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
      },
      take: 200,
    });

    const out = brands.map((b) => ({
      id: b.id,
      name: b.name,
      nameEn: b.nameEn,
      slug: b.slug,
      logoUrl: b.logoUrl,
      country: b.country,
      featured: b.featured,
      showOnHomepage: b.display?.showOnHomepage ?? false,
      listingCount: b._count.listings,
    }));

    return NextResponse.json({
      config: {
        title: s?.trustedBrandsTitle ?? null,
        subtitle: s?.trustedBrandsSubtitle ?? null,
        description: s?.trustedBrandsDescription ?? null,
        limit: s?.trustedBrandsLimit ?? 12,
        tickerSpeed: s?.trustedBrandsTickerSpeed ?? 40,
      },
      brands: out,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* ============================================================
   PUT /api/admin/home/trusted-brands
   Body: {
     title?, subtitle?, description?, limit?, tickerSpeed?,
     selectedBrandIds?: string[]   // when present, sets showOnHomepage
                                    // for those brands (and clears others)
   }
   ============================================================ */
export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    const title =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim().slice(0, 200)
        : null;
    const subtitle =
      typeof body.subtitle === "string" && body.subtitle.trim().length > 0
        ? body.subtitle.trim().slice(0, 200)
        : null;
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim().slice(0, 600)
        : null;
    const limitRaw = Number(body.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 50
        ? Math.floor(limitRaw)
        : 12;
    const speedRaw = Number(body.tickerSpeed);
    const tickerSpeed =
      Number.isFinite(speedRaw) && speedRaw >= 10 && speedRaw <= 240
        ? Math.floor(speedRaw)
        : 40;

    const updated = await db.siteSettings.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        trustedBrandsTitle: title,
        trustedBrandsSubtitle: subtitle,
        trustedBrandsDescription: description,
        trustedBrandsLimit: limit,
        trustedBrandsTickerSpeed: tickerSpeed,
      },
      update: {
        trustedBrandsTitle: title,
        trustedBrandsSubtitle: subtitle,
        trustedBrandsDescription: description,
        trustedBrandsLimit: limit,
        trustedBrandsTickerSpeed: tickerSpeed,
      },
    });

    // Optional: bulk-update BrandDisplay.showOnHomepage from
    // selectedBrandIds. When this field is present, we set
    // showOnHomepage=true for the listed brands and false for any
    // others that currently have a BrandDisplay row.
    let brandUpdateCount = 0;
    if (Array.isArray(body.selectedBrandIds)) {
      const selectedIds = new Set<string>(
        body.selectedBrandIds.filter(
          (id: any) => typeof id === "string" && id.length > 0,
        ),
      );

      // Clear showOnHomepage for all current rows that aren't in the selection.
      await db.brandDisplay.updateMany({
        where: {
          showOnHomepage: true,
          brandId: { notIn: Array.from(selectedIds) },
        },
        data: { showOnHomepage: false },
      });

      // Upsert BrandDisplay rows for each selected brand with showOnHomepage=true.
      // Only select brands that actually exist + are active.
      const existing = await db.brand.findMany({
        where: { id: { in: Array.from(selectedIds) }, active: true },
        select: { id: true },
      });
      for (const b of existing) {
        await db.brandDisplay.upsert({
          where: { brandId: b.id },
          create: { brandId: b.id, showOnHomepage: true },
          update: { showOnHomepage: true },
        });
        brandUpdateCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      config: {
        title: updated.trustedBrandsTitle,
        subtitle: updated.trustedBrandsSubtitle,
        description: updated.trustedBrandsDescription,
        limit: updated.trustedBrandsLimit,
        tickerSpeed: updated.trustedBrandsTickerSpeed,
      },
      brandUpdateCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
