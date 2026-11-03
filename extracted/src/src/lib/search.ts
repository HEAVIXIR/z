import { db } from "@/lib/db";
import { normalizeAliasValue } from "@/lib/brand-alias";

/* ============================================================
   HEAVIX — Search normalization + indexing layer (P1-18)
   ------------------------------------------------------------
   HEAVIX-AUDIT-2026-09-20 §8: search currently uses raw DB LIKE
   queries. This module is the canonical search pipeline for
   HEAVIX — every public search entry point must funnel through
   these helpers so that:

     1. Persian normalization (ي→ی, ك→ک, ZWNJ strip, Arabic→Persian
        digits, lowercase, collapse spaces) happens once and
        consistently. Users type "کاترپیلار", "كاترپیلار", or
        "کاترپیلار " and they all hit the same row.
     2. `contains` clauses are built from a single normalized
        query and OR-ed across the searchable fields.
     3. Filter composition (category / brand / transaction /
        province / city) is centralized.

   SQLite has no full-text index in the dev/preview env, so the
   pipeline uses Prisma `contains` (which maps to LIKE). When the
   project migrates to PostgreSQL (ADR-001), the same `buildSearchWhere`
   output can be transparently routed through `tsvector` columns
   by swapping the helper internals — the public contract stays
   stable.

   The module is intentionally server-only (imports Prisma).
   ============================================================ */

/**
 * Persian-aware search normalization.
 *
 * Sequence (order matters):
 *  1. Arabic→Persian digits (٠→۰, ١→۱, ...) so numeric queries
 *     typed with an Arabic keyboard hit Persian-digit content.
 *  2. Arabic YEH (ي) → Persian YEH (ی).
 *  3. Arabic KAF (ك) → Persian KAF (ک).
 *  4. Strip ZWNJ / ZWJ (U+200C, U+200D) — they break `contains`.
 *  5. Strip tatweel (ـ, U+0640).
 *  6. Lowercase (ASCII only — Persian has no case).
 *  7. Collapse repeated whitespace to a single space.
 *  8. Trim.
 *
 * Always returns a non-null string (empty when input is empty).
 */
export function normalizeSearchQuery(q: string): string {
  if (!q) return "";
  return q
    .toString()
    // Arabic-Indic digits → Persian digits
    .replace(/[\u0660-\u0669]/g, (d) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(d)),
    )
    // Persian digits → ASCII digits (so numeric search works against
    // both stored ASCII numbers and the user's typed Persian digits)
    .replace(/[\u06F0-\u06F9]/g, (d) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)),
    )
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/\u0640/g, "") // tatweel
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a Prisma `where` clause that OR-s `contains` clauses across
 * the given scalar field names for a single (already-normalized)
 * query string.
 *
 * Returns `undefined` when the query is empty so callers can spread
 * it cleanly:
 *
 *     const where = {
 *       status: "PUBLISHED",
 *       ...(buildSearchWhere(["title","shortDesc","description"], q) ?? {}),
 *     };
 *
 * `mode` defaults to "insensitive" — on SQLite this is a no-op
 * (LIKE is already ASCII-case-insensitive) but it makes the contract
 * explicit and ready for the PostgreSQL migration.
 */
export type PrismaWhere = Record<string, unknown>;

export function buildSearchWhere(
  fields: string[],
  q: string,
): PrismaWhere | undefined {
  const nq = normalizeSearchQuery(q);
  if (!nq) return undefined;
  return {
    OR: fields.map((f) => ({
      [f]: { contains: nq },
    })),
  };
}

/**
 * Compose two OR-clauses (or any clauses) into a single OR array.
 * Useful when the listing search has to OR its free-text clauses
 * with its category-slug clauses.
 */
export function mergeOrClauses(
  base: PrismaWhere | undefined,
  extra: PrismaWhere | undefined,
): PrismaWhere | undefined {
  if (!base && !extra) return undefined;
  if (!base) return extra;
  if (!extra) return base;
  const baseOr = Array.isArray(base.OR) ? base.OR : [base];
  const extraOr = Array.isArray(extra.OR) ? extra.OR : [extra];
  return { OR: [...baseOr, ...extraOr] };
}

/* ============================================================
   Listing search
   ============================================================ */

export interface SearchListingsParams {
  q?: string | null;
  category?: string | null; // slug OR free text
  brand?: string | null; // slug OR free text
  transactionType?: string | null; // key (SALE | RENT | ...)
  province?: string | null; // canonical provinceId OR legacy string match
  city?: string | null; // canonical cityId OR legacy string match
  limit?: number;
  offset?: number;
}

export interface ListingSearchHit {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDesc: string | null;
  price: string | null;
  priceType: string;
  listingType: string;
  condition: string | null;
  province: string | null;
  city: string | null;
  year: number | null;
  workingHours: number | null;
  featured: boolean;
  verified: boolean;
  publishedAt: string | null;
  brand: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    country: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    icon: string | null;
  } | null;
  image: string | null;
}

/**
 * Canonical listing search.
 *
 * Combines:
 *   • normalized free-text OR over title / shortDesc / description
 *   • category filter (slug OR contains on name)
 *   • brand filter (slug OR contains on name / nameEn)
 *   • transactionType filter (key)
 *   • province filter (canonical provinceId OR legacy string contains)
 *   • city filter (canonical cityId OR legacy string contains)
 *
 * Only PUBLISHED listings are returned. Ordering is
 * `featured DESC, createdAt DESC` so featured ads float to the top.
 */
export async function searchListings(
  params: SearchListingsParams,
): Promise<{ results: ListingSearchHit[]; total: number }> {
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = Math.max(0, params.offset ?? 0);

  const where: PrismaWhere = { status: "PUBLISHED" };

  // Free text
  const q = params.q?.trim();
  if (q) {
    const textClause = buildSearchWhere(
      ["title", "shortDesc", "description"],
      q,
    );
    if (textClause) {
      where.OR = textClause.OR;
    }
  }

  // Category — slug OR name contains
  const cat = params.category?.trim();
  if (cat) {
    const catClause: PrismaWhere = {
      OR: [
        { category: { slug: cat } },
        { category: { name: { contains: normalizeSearchQuery(cat) } } },
      ],
    };
    where.OR = where.OR
      ? [...(where.OR as PrismaWhere[]), ...((catClause as any)?.OR || [])]
      : catClause.OR as any;
  }

  // Brand — slug OR name/nameEn contains
  const br = params.brand?.trim();
  if (br) {
    const brandClause: PrismaWhere = {
      OR: [
        { brand: { slug: br } },
        { brand: { name: { contains: normalizeSearchQuery(br) } } },
        { brand: { nameEn: { contains: normalizeSearchQuery(br) } } },
      ],
    };
    where.OR = where.OR
      ? [...(where.OR as PrismaWhere[]), ...((brandClause as any)?.OR || [])]
      : (brandClause as any)?.OR;
  }

  // Transaction type (key)
  if (params.transactionType) {
    // Match by TransactionType.key OR legacy Listing.listingType string.
    where.OR = where.OR
      ? [
          ...(where.OR as PrismaWhere[]),
          { transactionType: { key: params.transactionType } },
          { listingType: params.transactionType },
        ]
      : [
          { transactionType: { key: params.transactionType } },
          { listingType: params.transactionType },
        ];
  }

  // Province — canonical provinceId OR legacy string contains
  const prov = params.province?.trim();
  if (prov) {
    where.OR = where.OR
      ? [
          ...(where.OR as PrismaWhere[]),
          { provinceId: prov },
          { province: { contains: normalizeSearchQuery(prov) } },
        ]
      : [
          { provinceId: prov },
          { province: { contains: normalizeSearchQuery(prov) } },
        ];
  }

  // City — canonical cityId OR legacy string contains
  const c = params.city?.trim();
  if (c) {
    where.OR = where.OR
      ? [
          ...(where.OR as PrismaWhere[]),
          { cityId: c },
          { city: { contains: normalizeSearchQuery(c) } },
        ]
      : [
          { cityId: c },
          { city: { contains: normalizeSearchQuery(c) } },
        ];
  }

  const [total, rows] = await Promise.all([
    db.listing.count({ where: where as any }),
    db.listing.findMany({
      where: where as any,
      skip: offset,
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

  const results: ListingSearchHit[] = rows.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    description: l.description,
    shortDesc: l.shortDesc,
    price: l.price ? l.price.toString() : null,
    priceType: l.priceType,
    listingType: l.listingType,
    condition: l.condition,
    province: l.province,
    city: l.city,
    year: l.year,
    workingHours: l.workingHours,
    featured: l.featured,
    verified: l.verified,
    publishedAt: l.publishedAt ? l.publishedAt.toISOString() : null,
    brand: l.brand
      ? {
          id: l.brand.id,
          name: l.brand.name,
          nameEn: l.brand.nameEn,
          slug: l.brand.slug,
          country: l.brand.country,
        }
      : null,
    category: l.category
      ? {
          id: l.category.id,
          name: l.category.name,
          nameEn: l.category.nameEn,
          slug: l.category.slug,
          icon: l.category.icon,
        }
      : null,
    image: l.images?.[0]?.url ?? null,
  }));

  return { results, total };
}

/* ============================================================
   Brand search
   ============================================================ */

export interface BrandSearchHit {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  shortName: string | null;
  country: string | null;
  logoUrl: string | null;
  type: string | null;
  status: string;
  verification: string;
  featured: boolean;
  listingsCount: number;
}

/**
 * Persian-aware brand search across name / nameEn / shortName plus
 * the alias table (normalized). Aliases are matched against the
 * normalized query via `BrandAlias.normalizedValue contains normQ`
 * — the alias table is populated through `normalizeAliasValue` on
 * write, so the comparison is symmetric.
 *
 * `take` defaults to 20. Returns the public card shape used by the
 * hero search + command palette.
 */
export async function searchBrands(
  q: string,
  opts: { take?: number } = {},
): Promise<BrandSearchHit[]> {
  const rawQ = (q ?? "").trim();
  if (!rawQ) return [];
  const normQ = normalizeAliasValue(rawQ);
  const take = Math.min(50, Math.max(1, opts.take ?? 20));

  // Note: SQLite `contains` is ASCII-case-insensitive but Persian
  // letters are case-less, so we still pass the normalized query.
  // The raw query is also OR-ed in so partial English matches
  // (e.g. "cat" → "Caterpillar") work.
  const where: PrismaWhere = {
    OR: [
      { name: { contains: rawQ } },
      { name: { contains: normQ } },
      { nameEn: { contains: rawQ } },
      { nameEn: { contains: normQ } },
      { shortName: { contains: rawQ } },
      { shortName: { contains: normQ } },
      { aliases: { some: { normalizedValue: { contains: normQ } } } },
    ],
  };

  const brands = await db.brand.findMany({
    where: where as any,
    take,
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameEn: true,
      shortName: true,
      country: true,
      logoUrl: true,
      type: true,
      status: true,
      verification: true,
      featured: true,
      _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
    },
  });

  return brands.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    nameEn: b.nameEn,
    shortName: b.shortName,
    country: b.country,
    logoUrl: b.logoUrl,
    type: b.type,
    status: b.status,
    verification: b.verification,
    featured: b.featured,
    listingsCount: b._count.listings,
  }));
}

/* ============================================================
   Category search
   ============================================================ */

export interface CategorySearchHit {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  domain: string | null;
  layer: string;
  icon: string | null;
  parentId: string | null;
  level: number;
}

/**
 * Persian-aware category search across name + nameEn.
 *
 * `layer` filter is optional (CATALOG | MARKETPLACE | SERVICE | FALLBACK).
 */
export async function searchCategories(
  q: string,
  opts: { take?: number; layer?: string } = {},
): Promise<CategorySearchHit[]> {
  const rawQ = (q ?? "").trim();
  if (!rawQ) return [];
  const normQ = normalizeSearchQuery(rawQ);
  const take = Math.min(50, Math.max(1, opts.take ?? 20));

  const where: PrismaWhere = {
    OR: [
      { name: { contains: rawQ } },
      { name: { contains: normQ } },
      { nameEn: { contains: rawQ } },
      { nameEn: { contains: normQ } },
    ],
  };
  if (opts.layer) where.layer = opts.layer;

  const cats = await db.category.findMany({
    where: where as any,
    take,
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameEn: true,
      domain: true,
      layer: true,
      icon: true,
      parentId: true,
      level: true,
    },
  });

  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    nameEn: c.nameEn,
    domain: c.domain,
    layer: c.layer,
    icon: c.icon,
    parentId: c.parentId,
    level: c.level,
  }));
}
