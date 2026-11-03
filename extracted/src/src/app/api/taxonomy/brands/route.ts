import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uniqueSlug } from "@/lib/api-helpers";
import { normalizeAliasValue } from "@/lib/brand-alias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/taxonomy/brands — search, sort, filter. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const country = url.searchParams.get("country") || undefined;
    const domain = url.searchParams.get("domain") || undefined;
    const featured = url.searchParams.get("featured");
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const verification = url.searchParams.get("verification") || undefined;
    const industry = url.searchParams.get("industry") || undefined;
    const sort = url.searchParams.get("sort") || "name";
    const limit = Number(url.searchParams.get("limit")) || 200;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (verification) where.verification = verification;
    if (country) where.country = country;
    if (industry) {
      where.industries = { some: { industry } };
    }
    if (featured !== null && featured !== undefined && featured !== "")
      where.featured = ["1", "true", "yes"].includes(featured);
    if (domain) {
      where.domains = { some: { domain } };
    }
    if (q) {
      const qNorm = normalizeAliasValue(q);
      where.OR = [
        { name: { contains: q } },
        { nameEn: { contains: q } },
        { shortName: { contains: q } },
        // alias match — both raw + normalized so callers can search by either form
        { aliases: { some: { normalizedValue: { contains: qNorm } } } },
        { aliases: { some: { value: { contains: q } } } },
      ];
    }

    let orderBy: any = { name: "asc" };
    if (sort === "name_desc") orderBy = { name: "desc" };
    else if (sort === "featured") orderBy = [{ featured: "desc" }, { name: "asc" }];
    else if (sort === "newest") orderBy = { createdAt: "desc" };
    else if (sort === "sortOrder") orderBy = [{ sortOrder: "asc" }, { name: "asc" }];

    const brands = await db.brand.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        _count: { select: { listings: true } },
        aliases: { orderBy: { confidence: "desc" } },
        industries: true,
        brandFamily: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({
      brands: brands.map((b) => ({
        ...b,
        listingsCount: b._count.listings,
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

/* POST /api/taxonomy/brands — create. */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const slug = await uniqueSlug(db.brand, body.slug || body.name);

    const brand = await db.brand.create({
      data: {
        name: String(body.name),
        nameEn: body.nameEn ?? null,
        shortName: body.shortName ?? null,
        slug,
        logoUrl: body.logoUrl ?? null,
        website: body.website ?? null,
        country: body.country ?? null,
        description: body.description ?? null,
        featured: Boolean(body.featured),
        active: body.active !== false,
        status: body.status ?? "ACTIVE",
        // HBR-1.0 fields
        type: body.type ?? null,
        verification: body.verification ?? "UNVERIFIED",
        parentBrandId: body.parentBrandId ?? null,
        brandFamilyId: body.brandFamilyId ?? null,
        manufacturer: body.manufacturer ?? null,
        foundedYear:
          body.foundedYear === undefined ||
          body.foundedYear === null ||
          body.foundedYear === ""
            ? null
            : Number(body.foundedYear),
        sortOrder: Number(body.sortOrder) || 0,
      },
    });

    // Aliases — normalize + upsert into BrandAlias
    if (Array.isArray(body.aliases)) {
      for (const a of body.aliases) {
        if (!a || !a.value) continue;
        const normalizedValue = normalizeAliasValue(String(a.value));
        if (!normalizedValue) continue;
        try {
          await db.brandAlias.upsert({
            where: {
              brandId_normalizedValue: {
                brandId: brand.id,
                normalizedValue,
              },
            },
            update: {
              value: String(a.value),
              language: a.language ?? "fa",
              type: a.type ?? "COMMON",
              confidence: Number(a.confidence) || 80,
            },
            create: {
              brandId: brand.id,
              value: String(a.value),
              normalizedValue,
              language: a.language ?? "fa",
              type: a.type ?? "COMMON",
              confidence: Number(a.confidence) || 80,
            },
          });
        } catch {
          // ignore individual alias upsert failures
        }
      }
    }

    // Industries — connect each industry key via BrandIndustry
    if (Array.isArray(body.industries)) {
      for (const key of body.industries) {
        if (!key || typeof key !== "string") continue;
        try {
          await db.brandIndustry.create({
            data: { brandId: brand.id, industry: key },
          });
        } catch {
          // ignore duplicates
        }
      }
    }

    // Domains
    if (Array.isArray(body.domains)) {
      for (const d of body.domains) {
        if (!d || typeof d !== "string") continue;
        try {
          await db.brandDomain.create({
            data: { brandId: brand.id, domain: d },
          });
        } catch {
          // ignore duplicates
        }
      }
    }

    return NextResponse.json({ ok: true, brand });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
