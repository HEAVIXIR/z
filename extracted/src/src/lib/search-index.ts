import { db } from "@/lib/db";
import { normalizeSearchQuery } from "@/lib/search";
import { normalizeAliasValue } from "@/lib/brand-alias";

/* ============================================================
   HEAVIX — Search Index layer (FIX-GAPS-2)
   ------------------------------------------------------------
   Pre-normalized, denormalized SearchIndex rows so the canonical
   search pipeline can hit a single table with one LIKE pass
   instead of OR-ing across Listing/Brand/Category columns at
   query time. Keyed by @@unique([entityType, entityId]) so re-
   indexing is an upsert, not an append.

   Public surface:
     • indexListing(listingId)
     • indexBrand(brandId)
     • indexCategory(categoryId)
     • rebuildIndex()                — rebuild entire index from DB
     • searchIndexListings(normQ)    — pre-normalized LIKE on SearchIndex
     • searchIndexBrands(normQ)

   When the project migrates to PostgreSQL (ADR-001), the
   `content` column becomes a tsvector and `normalizedTitle` is
   replaced by a tsvector index — the public contract stays the
   same; only the storage / comparison operator swaps.
   ============================================================ */

export const SEARCH_ENTITY = {
  LISTING: "LISTING",
  BRAND: "BRAND",
  CATEGORY: "CATEGORY",
  ARTICLE: "ARTICLE",
} as const;

export type SearchEntityType =
  (typeof SEARCH_ENTITY)[keyof typeof SEARCH_ENTITY];

/* ----------------------------------------------------------------
   Build a comma-separated keyword string from a set of values,
   skipping nulls/empties. Used to populate the `keywords` column
   so partial matches against e.g. brand nameEn or category nameEn
   also hit the same SearchIndex row.
   ---------------------------------------------------------------- */
function joinKeywords(parts: (string | null | undefined)[]): string {
  return Array.from(
    new Set(
      parts
        .map((p) => (p ?? "").toString().trim())
        .filter((p) => p.length > 0),
    ),
  ).join(",");
}

/* ----------------------------------------------------------------
   Upsert a single SearchIndex row. The unique key is
   (entityType, entityId) — re-indexing updates in place.
   ---------------------------------------------------------------- */
async function upsertIndex(params: {
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  normalizedTitle: string;
  content?: string | null;
  keywords?: string | null;
}) {
  const normTitle = params.normalizedTitle || normalizeSearchQuery(params.title);
  if (!params.entityId || !params.title) return;
  try {
    await (db as any).upsert({
      where: {
        entityType_entityId: {
          entityType: params.entityType,
          entityId: params.entityId,
        },
      },
      create: {
        entityType: params.entityType,
        entityId: params.entityId,
        title: params.title,
        normalizedTitle: normTitle,
        content: params.content ?? null,
        keywords: params.keywords ?? null,
      },
      update: {
        title: params.title,
        normalizedTitle: normTitle,
        content: params.content ?? null,
        keywords: params.keywords ?? null,
      },
    });
  } catch (err: any) {
    // Index write failures must never crash the main write flow
    // (listing publish / brand save). Swallow + log.
    console.error("[search-index] upsert failed:", {
      entityType: params.entityType,
      entityId: params.entityId,
      error: err?.message ?? String(err),
    });
  }
}

/* ============================================================
   LISTING
   ============================================================ */

export async function indexListing(listingId: string): Promise<void> {
  if (!listingId) return;
  const l = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      shortDesc: true,
      description: true,
      condition: true,
      province: true,
      city: true,
      brand: { select: { name: true, nameEn: true, shortName: true } },
      category: { select: { name: true, nameEn: true } },
    },
  });
  if (!l) return;

  // Compose a single normalized blob for free-text search. We
  // fold the brand + category names into the blob so a query
  // like "کاترپیلار بیل" matches even if the listing title only
  // contains "بیل مکانیکی".
  const blobParts = [
    l.title,
    l.shortDesc,
    l.description,
    l.brand?.name,
    l.brand?.nameEn,
    l.brand?.shortName,
    l.category?.name,
    l.category?.nameEn,
    l.condition,
    l.province,
    l.city,
  ].filter((p): p is string => Boolean(p && p.trim()));

  const content = normalizeSearchQuery(blobParts.join(" "));
  const keywords = joinKeywords([
    l.brand?.name,
    l.brand?.nameEn,
    l.brand?.shortName,
    l.category?.name,
    l.category?.nameEn,
  ]);

  await upsertIndex({
    entityType: SEARCH_ENTITY.LISTING,
    entityId: l.id,
    title: l.title,
    normalizedTitle: normalizeSearchQuery(l.title),
    content,
    keywords,
  });
}

/* ============================================================
   BRAND
   ============================================================ */

export async function indexBrand(brandId: string): Promise<void> {
  if (!brandId) return;
  const b = await db.brand.findUnique({
    where: { id: brandId },
    select: {
      id: true,
      name: true,
      nameEn: true,
      shortName: true,
      country: true,
      description: true,
      type: true,
    },
  });
  if (!b) return;

  const blobParts = [
    b.name,
    b.nameEn,
    b.shortName,
    b.country,
    b.description,
    b.type,
  ].filter((p): p is string => Boolean(p && p.trim()));

  // For brands we ALSO use the alias normalizer (it keeps Persian
  // letters in their canonical form) so the brand index is
  // symmetric with the BrandAlias lookup table.
  const content = normalizeAliasValue(blobParts.join(" "));
  const keywords = joinKeywords([b.name, b.nameEn, b.shortName]);

  await upsertIndex({
    entityType: SEARCH_ENTITY.BRAND,
    entityId: b.id,
    title: b.name,
    normalizedTitle: normalizeAliasValue(b.name),
    content,
    keywords,
  });
}

/* ============================================================
   CATEGORY
   ============================================================ */

export async function indexCategory(categoryId: string): Promise<void> {
  if (!categoryId) return;
  const c = await db.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      nameEn: true,
      description: true,
      domain: true,
      layer: true,
    },
  });
  if (!c) return;

  const blobParts = [
    c.name,
    c.nameEn,
    c.description,
    c.domain,
    c.layer,
  ].filter((p): p is string => Boolean(p && p.trim()));

  const content = normalizeSearchQuery(blobParts.join(" "));
  const keywords = joinKeywords([c.name, c.nameEn]);

  await upsertIndex({
    entityType: SEARCH_ENTITY.CATEGORY,
    entityId: c.id,
    title: c.name,
    normalizedTitle: normalizeSearchQuery(c.name),
    content,
    keywords,
  });
}

/* ============================================================
   REBUILD ENTIRE INDEX
   ------------------------------------------------------------
   Wipes SearchIndex and re-populates from the live
   Listing / Brand / Category tables. Idempotent — safe to run
   from the admin "rebuild" button or the seed script.
   ============================================================ */

export interface RebuildStats {
  listings: number;
  brands: number;
  categories: number;
  total: number;
  durationMs: number;
}

export async function rebuildIndex(): Promise<RebuildStats> {
  const t0 = Date.now();
  // Wipe in one shot. This is safe because indexListing/Brand/Category
  // are upserts — partial failures leave holes, not duplicates, and a
  // subsequent rebuild re-fills them.
  await (db as any).deleteMany({});

  const [listings, brands, categories] = await Promise.all([
    db.listing.findMany({ select: { id: true } }),
    db.brand.findMany({ select: { id: true } }),
    db.category.findMany({ select: { id: true } }),
  ]);

  // Index sequentially to avoid opening 1000s of parallel Prisma ops.
  // Each indexX() does its own findUnique + upsert (2 queries).
  let lCount = 0;
  for (const l of listings) {
    await indexListing(l.id);
    lCount++;
  }
  let bCount = 0;
  for (const b of brands) {
    await indexBrand(b.id);
    bCount++;
  }
  let cCount = 0;
  for (const c of categories) {
    await indexCategory(c.id);
    cCount++;
  }

  const total = await (db as any).count();
  return {
    listings: lCount,
    brands: bCount,
    categories: cCount,
    total,
    durationMs: Date.now() - t0,
  };
}

/* ============================================================
   SEARCH-INDEX READ PATH
   ------------------------------------------------------------
   Helpers used by src/lib/search.ts to first try the
   SearchIndex (faster — single LIKE pass on pre-normalized
   text) and fall back to the original LIKE pipeline when the
   index has no hits (e.g. before the first rebuild).
   ============================================================ */

/**
 * Return the set of listing IDs whose SearchIndex row matches the
 * (already-normalized) query in normalizedTitle / content / keywords.
 *
 * Returns `null` (NOT empty array) when there are zero SearchIndex
 * rows for LISTING at all — so the caller can fall back to the
 * canonical LIKE pipeline instead of returning an empty result.
 */
export async function searchIndexListings(
  normQ: string,
  opts: { take?: number } = {},
): Promise<string[] | null> {
  if (!normQ) return null;
  const take = Math.min(200, Math.max(1, opts.take ?? 100));

  // First check whether the listing index has been populated at all.
  // If not, signal "fall back" with a null return.
  const indexCount = await (db as any).count({
    where: { entityType: SEARCH_ENTITY.LISTING },
  });
  if (indexCount === 0) return null;

  const rows = await (db as any).findMany({
    where: {
      entityType: SEARCH_ENTITY.LISTING,
      OR: [
        { normalizedTitle: { contains: normQ } },
        { content: { contains: normQ } },
        { keywords: { contains: normQ } },
      ],
    },
    select: { entityId: true },
    take: take * 4, // over-fetch — the caller will re-apply its own filters + limit
  });
  return rows.map((r) => r.entityId);
}

/**
 * Return the set of brand IDs whose SearchIndex row matches the
 * normalized query. Same null-on-empty-index contract as
 * searchIndexListings.
 */
export async function searchIndexBrands(
  normQ: string,
  opts: { take?: number } = {},
): Promise<string[] | null> {
  if (!normQ) return null;
  const take = Math.min(100, Math.max(1, opts.take ?? 50));

  const indexCount = await (db as any).count({
    where: { entityType: SEARCH_ENTITY.BRAND },
  });
  if (indexCount === 0) return null;

  const rows = await (db as any).findMany({
    where: {
      entityType: SEARCH_ENTITY.BRAND,
      OR: [
        { normalizedTitle: { contains: normQ } },
        { content: { contains: normQ } },
        { keywords: { contains: normQ } },
      ],
    },
    select: { entityId: true },
    take,
  });
  return rows.map((r) => r.entityId);
}
