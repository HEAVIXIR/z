import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uniqueSlug } from "@/lib/api-helpers";
import { normalizeAliasValue } from "@/lib/brand-alias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/* GET /api/taxonomy/brands/[id] — full detail. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const brand = await db.brand.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        domains: true,
        media: { orderBy: { sortOrder: "asc" } },
        seo: true,
        display: true,
        models: { orderBy: { sortOrder: "asc" } },
        aliases: { orderBy: { confidence: "desc" } },
        industries: true,
        brandFamily: { select: { id: true, name: true, slug: true } },
        parentBrand: { select: { id: true, name: true, nameEn: true, slug: true } },
        childBrands: {
          select: { id: true, name: true, nameEn: true, slug: true, status: true },
        },
        _count: { select: { listings: true } },
      },
    });
    if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Resolve industry names via separate Industry query
    // (BrandIndustry.industry is a String = Industry.key, not a relation)
    const industryKeys = brand.industries.map((bi) => bi.industry);
    const industryRecords = industryKeys.length
      ? await db.industry.findMany({ where: { key: { in: industryKeys } } })
      : [];
    const industryMap = new Map(industryRecords.map((i) => [i.key, i]));

    return NextResponse.json({
      brand: {
        ...brand,
        listingsCount: brand._count.listings,
        _count: undefined,
        industries: brand.industries.map((bi) => ({
          id: bi.id,
          industry: bi.industry,
          industryRecord: industryMap.get(bi.industry) ?? null,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* PATCH /api/taxonomy/brands/[id] */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const existing = await db.brand.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    const allowed = [
      "name", "nameEn", "shortName", "logoUrl", "website", "country",
      "description", "featured", "active", "status", "sortOrder",
      // HBR-1.0 fields
      "type", "verification", "parentBrandId", "brandFamilyId",
      "manufacturer",
    ];
    for (const k of allowed) {
      if (k in body) {
        if (k === "featured" || k === "active") data[k] = Boolean(body[k]);
        else if (k === "sortOrder") data[k] = Number(body[k]) || 0;
        else data[k] = body[k] === undefined ? null : body[k];
      }
    }
    // foundedYear (Int?) handled separately
    if ("foundedYear" in body) {
      const v = body.foundedYear;
      data.foundedYear =
        v === undefined || v === null || v === "" ? null : Number(v);
    }
    if (body.slug && body.slug !== existing.slug) {
      data.slug = await uniqueSlug(db.brand, body.slug);
    } else if (body.name && body.name !== existing.name && !body.slug) {
      data.slug = await uniqueSlug(db.brand, body.name);
    }

    const brand = await db.brand.update({ where: { id }, data });

    // FIX-SERVICES-KNOWLEDGE-CATS-BRANDS (Part 6): persist BrandDisplay
    // (showOnHomepage, showInFooter, accentColor, displayOrder) when the
    // admin submits the Display tab. Previously the DisplayTab only sent
    // `{ name }` and these fields were silently dropped.
    if (body.display && typeof body.display === "object") {
      const d = body.display as {
        showOnHomepage?: boolean;
        showInFooter?: boolean;
        accentColor?: string | null;
        displayOrder?: number;
      };
      try {
        await db.brandDisplay.upsert({
          where: { brandId: id },
          create: {
            brandId: id,
            showOnHomepage: d.showOnHomepage !== false,
            showInFooter: !!d.showInFooter,
            accentColor: typeof d.accentColor === "string" ? d.accentColor : null,
            displayOrder: Number(d.displayOrder) || 0,
          },
          update: {
            showOnHomepage: d.showOnHomepage !== false,
            showInFooter: !!d.showInFooter,
            accentColor:
              typeof d.accentColor === "string" || d.accentColor === null
                ? d.accentColor
                : undefined,
            displayOrder:
              typeof d.displayOrder === "number"
                ? d.displayOrder
                : undefined,
          },
        });
      } catch {
        // BrandDisplay upsert is best-effort — don't fail the whole PATCH.
      }
    }

    // Domain links — replace strategy
    if (Array.isArray(body.domains)) {
      await db.brandDomain.deleteMany({ where: { brandId: id } });
      if (body.domains.length > 0) {
        for (const d of body.domains) {
          if (!d || typeof d !== "string") continue;
          try {
            await db.brandDomain.create({
              data: { brandId: id, domain: d },
            });
          } catch {
            // ignore duplicates
          }
        }
      }
    }

    // Aliases — replace strategy:
    //  - delete existing aliases not in payload
    //  - upsert those in payload
    if (Array.isArray(body.aliases)) {
      const incomingKeys = new Set<string>();
      for (const a of body.aliases) {
        if (!a || !a.value) continue;
        const normalizedValue = normalizeAliasValue(String(a.value));
        if (!normalizedValue) continue;
        incomingKeys.add(normalizedValue);
        try {
          await db.brandAlias.upsert({
            where: {
              brandId_normalizedValue: {
                brandId: id,
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
              brandId: id,
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
      // Delete aliases whose normalized value isn't in payload
      const allAliases = await db.brandAlias.findMany({
        where: { brandId: id },
        select: { id: true, normalizedValue: true },
      });
      const toDelete = allAliases
        .filter((a) => !incomingKeys.has(a.normalizedValue))
        .map((a) => a.id);
      if (toDelete.length) {
        await db.brandAlias.deleteMany({ where: { id: { in: toDelete } } });
      }
    }

    // Industries — replace strategy:
    //  - delete existing industry links not in payload
    //  - create those in payload
    if (Array.isArray(body.industries)) {
      const incomingKeys = (body.industries as any[])
        .filter((k) => typeof k === "string" && k)
        .map((k) => String(k));
      const incomingSet = new Set(incomingKeys);
      const allLinks = await db.brandIndustry.findMany({
        where: { brandId: id },
        select: { id: true, industry: true },
      });
      const toDelete = allLinks
        .filter((l) => !incomingSet.has(l.industry))
        .map((l) => l.id);
      if (toDelete.length) {
        await db.brandIndustry.deleteMany({ where: { id: { in: toDelete } } });
      }
      for (const key of incomingKeys) {
        try {
          await db.brandIndustry.create({
            data: { brandId: id, industry: key },
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

/* DELETE /api/taxonomy/brands/[id] */
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.brand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
