import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBig, parseNumber, slugify, uniqueSlug } from "@/lib/api-helpers";
import {
  normalizeSearchQuery,
  buildSearchWhere,
  searchListings,
} from "@/lib/search";
import { logSearchQuery } from "@/lib/demand-engine";
import { getClientIp } from "@/lib/request-context";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/listings — PUBLIC listing search. No auth required.
   Query:
     ?q=&page=&limit=&category=&brand=&city=
     ?attr.KEY_min=&attr.KEY_max=   (numeric range on attribute value)
     ?attr.KEY=val                  (SELECT optionId OR TEXT exact match;
                                     can repeat for multi-select)
   Returns: { success: true, count, data }
   - Only PUBLISHED listings, capped at 20 (default 20).
   - Each item: flat listing fields + nested brand/category/images.

   P1-18: free-text + brand + category + city clauses now route
   through `normalizeSearchQuery` / `buildSearchWhere` (src/lib/search.ts)
   so Persian normalization (ي→ی, ك→ک, ZWNJ strip, Arabic→Persian
   digits, lowercase, collapse spaces) is applied uniformly. When no
   dynamic attribute filters are present we delegate the whole fetch
   to `searchListings`; when attribute filters ARE present we keep
   the local Prisma query (so the `attributeValues: { some: ... }`
   AND clauses can be composed) but still use the normalized helpers
   for the text/brand/category parts.
*/
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const category = (url.searchParams.get("category") ?? "").trim();
    const brand = (url.searchParams.get("brand") ?? "").trim();
    const city = (url.searchParams.get("city") ?? "").trim();

    /* ── Dynamic attribute filters ──
       Parse `attr.KEY_min`, `attr.KEY_max`, `attr.KEY` (latter may repeat)
       from the URL and add a separate `attributeValues: { some: ... }`
       clause per attribute, joined by AND. */
    const attrKeys = new Set<string>();
    for (const k of url.searchParams.keys()) {
      if (!k.startsWith("attr.")) continue;
      const stripped = k.slice(5);
      const base = stripped.replace(/_(min|max)$/, "");
      if (base) attrKeys.add(base);
    }

    // Fast path: no attribute filters → delegate to searchListings which
    // already returns the flat shape the client expects.
    if (attrKeys.size === 0) {
      const { results, total } = await searchListings({
        q,
        category,
        brand,
        city,
        limit,
        offset: (page - 1) * limit,
      });

      // Re-shape to match the legacy /api/listings contract so the
      // existing client doesn't break: top-level `success` + `count` +
      // `data` array with brand/category/images nested objects.
      const data = results.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        description: l.description,
        shortDesc: l.shortDesc,
        price: l.price,
        priceType: l.priceType,
        listingType: l.listingType,
        condition: l.condition,
        province: l.province,
        city: l.city,
        year: l.year,
        workingHours: l.workingHours,
        featured: l.featured,
        verified: l.verified,
        publishedAt: l.publishedAt,
        brand: l.brand,
        category: l.category,
        images: l.image ? [{ url: l.image }] : [],
      }));

      // P2-23 Demand Engine — log the search (fire-and-forget).
      if (q) {
        Promise.resolve()
          .then(async () => {
            await logSearchQuery({
              query: q,
              resultCount: total,
              ip: getClientIp(req),
              categorySlug: category || null,
              brandSlug: brand || null,
            });
          })
          .catch(() => {
            /* demand logging must never break search */
          });

        // P1-2 — track as AnalyticsEvent (fire-and-forget).
        trackEvent({
          eventType: "SEARCH",
          query: q,
          page: "/api/listings",
          ip: getClientIp(req),
        });
      }

      return NextResponse.json({ success: true, count: total, data });
    }

    // Slow path: attribute filters present — keep the local Prisma query
    // (so the `attributeValues: { some: ... }` AND clauses can be
    // composed) but route text/brand/category through the normalized
    // search helpers.
    const where: any = { status: "PUBLISHED" };

    if (q) {
      const textClause = buildSearchWhere(
        ["title", "shortDesc", "description"],
        q,
      );
      if (textClause) where.OR = textClause.OR;
    }
    if (city) where.city = { contains: normalizeSearchQuery(city) };
    if (category) {
      const catClause: any = {
        OR: [
          { category: { slug: category } },
          { category: { name: { contains: normalizeSearchQuery(category) } } },
        ],
      };
      where.OR = where.OR
        ? [...where.OR, ...catClause.OR]
        : catClause.OR;
    }
    if (brand) {
      const brandClause: any = [
        { brand: { slug: brand } },
        { brand: { name: { contains: normalizeSearchQuery(brand) } } },
        { brand: { nameEn: { contains: normalizeSearchQuery(brand) } } },
      ];
      where.OR = where.OR ? [...where.OR, ...brandClause] : brandClause;
    }

    // Build attribute AND clauses
    const keys = Array.from(attrKeys);
    const defs = await db.attributeDefinition.findMany({
      where: { OR: [{ key: { in: keys } }, { id: { in: keys } }] },
      select: { id: true, key: true },
    });
    const idByKey = new Map<string, string>();
    for (const d of defs) {
      if (d.key) idByKey.set(d.key, d.id);
      idByKey.set(d.id, d.id);
    }
    const andClauses: any[] = [];
    for (const key of keys) {
      const attrId = idByKey.get(key);
      if (!attrId) continue;
      const minRaw = url.searchParams.get(`attr.${key}_min`);
      const maxRaw = url.searchParams.get(`attr.${key}_max`);
      const equals = url.searchParams.getAll(`attr.${key}`).filter((x) => x !== "");
      const min = minRaw ? Number(minRaw) : NaN;
      const max = maxRaw ? Number(maxRaw) : NaN;
      if (isNaN(min) && isNaN(max) && equals.length === 0) continue;
      const clause: any = { attributeId: attrId };
      if (!isNaN(min) || !isNaN(max)) {
        const nv: any = {};
        if (!isNaN(min)) nv.gte = min;
        if (!isNaN(max)) nv.lte = max;
        clause.numberValue = nv;
      }
      if (equals.length > 0) {
        clause.OR = equals.flatMap((val) => [{ optionId: val }, { textValue: val }]);
      }
      andClauses.push({ attributeValues: { some: clause } });
    }
    if (andClauses.length > 0) {
      where.AND = (where.AND as any[] | undefined) ?? [];
      where.AND.push(...andClauses);
    }

    const [total, rows] = await Promise.all([
      db.listing.count({ where }),
      db.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        include: {
          brand: {
            select: { id: true, name: true, nameEn: true, slug: true, country: true },
          },
          category: {
            select: { id: true, name: true, nameEn: true, slug: true, icon: true },
          },
          images: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    const data = rows.map((l) => ({
      ...l,
      price: l.price ? l.price.toString() : null,
    }));

    // P2-23 Demand Engine — log the search (fire-and-forget).
    if (q) {
      Promise.resolve()
        .then(async () => {
          await logSearchQuery({
            query: q,
            resultCount: total,
            ip: getClientIp(req),
            categorySlug: category || null,
            brandSlug: brand || null,
          });
        })
        .catch(() => {
          /* demand logging must never break search */
        });

      // P1-2 — track as AnalyticsEvent (fire-and-forget).
      trackEvent({
        eventType: "SEARCH",
        query: q,
        page: "/api/listings",
        ip: getClientIp(req),
      });
    }

    return NextResponse.json({ success: true, count: total, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/listings — create listing with validation. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const title = String(body.title ?? "").trim();
    if (!title || title.length < 3) {
      return NextResponse.json({ error: "عنوان آگهی معتبر نیست" }, { status: 400 });
    }
    if (!body.brandId && !body.categoryId) {
      return NextResponse.json(
        { error: "برند یا دسته‌بندی الزامی است" },
        { status: 400 },
      );
    }

    const slug = await uniqueSlug(db.listing, body.slug || title);
    const user = await getCurrentUser();

    const data: any = {
      slug,
      title,
      description: body.description ?? null,
      shortDesc: body.shortDesc ?? null,
      price: parseBig(body.price),
      priceType: body.priceType || "NEGOTIABLE",
      listingType: body.listingType || "SALE",
      condition: body.condition || "USED",
      province: body.province ?? null,
      city: body.city ?? null,
      year: body.year ? parseNumber(body.year) : null,
      workingHours: body.workingHours ? parseNumber(body.workingHours) : null,
      status: "PENDING",
      featured: false,
      verified: false,
      showInLatest: true,
      sellerPhone: body.sellerPhone ?? null,
      sellerName: body.sellerName ?? null,
      brandId: body.brandId || null,
      categoryId: body.categoryId || null,
      modelId: body.modelId || null,
      sellerId: user?.id ?? null,
      companyId: body.companyId || null,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    // P2-5b — Rental fields (additive; only stored when listingType=RENT).
    if ((body.listingType || body.transactionType) === "RENT") {
      if (body.rentalPeriod) data.rentalPeriod = String(body.rentalPeriod);
      if (body.deposit !== undefined && body.deposit !== "") {
        const dep = parseBig(body.deposit);
        if (dep !== null) data.deposit = dep;
      }
      if (body.minimumRentalPeriod !== undefined && body.minimumRentalPeriod !== "") {
        const minP = parseNumber(body.minimumRentalPeriod);
        if (minP !== null) data.minimumRentalPeriod = minP;
      }
      if (body.operatorIncluded !== undefined) data.operatorIncluded = !!body.operatorIncluded;
      if (body.fuelIncluded !== undefined) data.fuelIncluded = !!body.fuelIncluded;
      if (body.transportIncluded !== undefined) data.transportIncluded = !!body.transportIncluded;
      if (body.availabilityStart) {
        const d = new Date(body.availabilityStart);
        if (!isNaN(d.getTime())) data.availabilityStart = d;
      }
      if (body.availabilityEnd) {
        const d = new Date(body.availabilityEnd);
        if (!isNaN(d.getTime())) data.availabilityEnd = d;
      }
    }

    const listing = await db.listing.create({ data });

    if (Array.isArray(body.images)) {
      await db.listingImage.createMany({
        data: body.images.slice(0, 10).map((img: any, idx: number) => ({
          listingId: listing.id,
          url: String(img.url ?? img),
          alt: img.alt ?? null,
          isPrimary: idx === 0,
          sortOrder: idx,
        })),
      });
    }

    // P1-2 — track LISTING_CREATE (fire-and-forget).
    trackEvent({
      eventType: "LISTING_CREATE",
      listingId: listing.id,
      userId: user?.id ?? null,
      categoryId: listing.categoryId ?? null,
      brandId: listing.brandId ?? null,
      page: "/api/listings",
    });

    return NextResponse.json({
      ok: true,
      id: listing.id,
      slug: listing.slug,
      status: listing.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
