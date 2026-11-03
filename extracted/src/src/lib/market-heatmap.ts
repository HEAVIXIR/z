import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — Market Heatmap (P2-25)
   ------------------------------------------------------------
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-25 (Market Heatmap)
   HEAVIX-CORRECTED-REFERENCE-V1.1.md §10 (Location as
   independent dimension), §13 (AI Untrusted — analytics only).

   Server-only module that produces a category × province
   heatmap of market activity. Three metrics are supported:

     • listings  — count of PUBLISHED listings per category+province.
     • views     — sum of Listing.viewCount per category+province.
     • searches  — count of SearchQuery per categorySlug+province.

   For "searches": SearchQuery has no `province` field (only an
   optional IP). Per the spec, we skip the province dimension and
   aggregate to a single "کلیه استان‌ها" pseudo-province so the
   matrix shape stays consistent. When SearchQuery is empty
   (the table isn't populated yet), the heatmap returns an empty
   matrix.

   Each cell's `intensity` is normalized to 0..1 against the max
   cell value in the matrix (so the hottest cell = 1.0).

   `getHotCategories` returns the top categories by combined
   activity (listings + searches + views, each normalized then
   weighted: 0.4 listings + 0.2 searches + 0.4 views). The
   province filter is optional.

   `getHotProvinces` returns the top provinces by combined
   activity. The category filter is optional.
   ============================================================ */

export type HeatmapMetric = "listings" | "searches" | "views";

export interface HeatmapCell {
  categorySlug: string;
  categoryName: string;
  provinceSlug: string;
  provinceName: string;
  intensity: number; // 0..1
  rawValue: number; // pre-normalization count/sum
}

export interface HotCategoryRow {
  category: { id: string; slug: string; name: string; icon: string | null };
  listingCount: number;
  searchCount: number;
  viewCount: number;
  heatScore: number; // 0..1
}

export interface HotProvinceRow {
  province: { id: string; slug: string; name: string; nameEn: string | null };
  listingCount: number;
  searchCount: number;
  viewCount: number;
  heatScore: number; // 0..1
}

const ALL_PROVINCES_SLUG = "all";
const ALL_PROVINCES_NAME = "کلیه استان‌ها";
const DEFAULT_DAYS = 30;

/* ----------------------------------------------------------------
   slugify — small inline helper (avoids importing api-helpers which
   pulls in NextResponse; this lib must stay server-pure-ish).
---------------------------------------------------------------- */
function slugifyName(s: string): string {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/* ----------------------------------------------------------------
   resolveProvinces — load all provinces (id, name, nameEn) and
   build a lookup table keyed by id AND by slugified name (so we
   can resolve both canonical provinceId references and legacy
   string province names on Listing). Returns the full list too
   so callers can render the matrix columns.
---------------------------------------------------------------- */
async function resolveProvinces(): Promise<{
  byId: Map<string, { id: string; slug: string; name: string; nameEn: string | null }>;
  byNameSlug: Map<string, { id: string; slug: string; name: string; nameEn: string | null }>;
  list: { id: string; slug: string; name: string; nameEn: string | null }[];
}> {
  const rows = await db.province.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, nameEn: true },
  });
  const byId = new Map<string, { id: string; slug: string; name: string; nameEn: string | null }>();
  const byNameSlug = new Map<string, { id: string; slug: string; name: string; nameEn: string | null }>();
  const list: { id: string; slug: string; name: string; nameEn: string | null }[] = [];
  for (const p of rows) {
    const slug = slugifyName(p.name);
    const entry = { id: p.id, slug, name: p.name, nameEn: p.nameEn };
    byId.set(p.id, entry);
    byNameSlug.set(slug, entry);
    list.push(entry);
  }
  return { byId, byNameSlug, list };
}

/* ----------------------------------------------------------------
   resolveCategories — load all categories (id, slug, name, icon).
   The heatmap only uses root/level-1+ categories with listings, but
   we load them all and let the grouping filter empty rows out.
---------------------------------------------------------------- */
async function resolveCategories(): Promise<{
  byId: Map<string, { id: string; slug: string; name: string; icon: string | null }>;
}> {
  const rows = await db.category.findMany({
    where: { active: true },
    select: { id: true, slug: true, name: true, icon: true },
  });
  const byId = new Map<string, { id: string; slug: string; name: string; icon: string | null }>();
  for (const c of rows) {
    byId.set(c.id, { id: c.id, slug: c.slug, name: c.name, icon: c.icon });
  }
  return { byId };
}

/* ----------------------------------------------------------------
   getHeatmap

   Returns a flat array of {categorySlug, categoryName, provinceSlug,
   provinceName, intensity, rawValue} cells. Cells with zero activity
   are omitted (so the matrix is sparse). The `intensity` is normalized
   to 0..1 against the max rawValue in the matrix.
---------------------------------------------------------------- */
export async function getHeatmap(params: {
  metric: HeatmapMetric;
  days?: number;
}): Promise<HeatmapCell[]> {
  const metric = params.metric;
  const days = Math.max(1, Math.min(365, params.days ?? DEFAULT_DAYS));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [{ byId: catById }, { byId: provById, byNameSlug: provByNameSlug }] = await Promise.all([
    resolveCategories(),
    resolveProvinces(),
  ]);

  // Aggregate map: key = `${categorySlug}::${provinceSlug}` → { category, province, rawValue }
  const agg = new Map<
    string,
    {
      categorySlug: string;
      categoryName: string;
      provinceSlug: string;
      provinceName: string;
      rawValue: number;
    }
  >();

  const bump = (
    categorySlug: string,
    categoryName: string,
    provinceSlug: string,
    provinceName: string,
    delta: number,
  ) => {
    const key = `${categorySlug}::${provinceSlug}`;
    const prev = agg.get(key);
    if (prev) {
      prev.rawValue += delta;
    } else {
      agg.set(key, {
        categorySlug,
        categoryName,
        provinceSlug,
        provinceName,
        rawValue: delta,
      });
    }
  };

  if (metric === "listings" || metric === "views") {
    // Fetch published listings in the time window. For "listings"
    // the window applies to createdAt; for "views" we still scope
    // by createdAt (viewCount is a cumulative counter — there's no
    // per-view timestamp).
    const listings = await db.listing.findMany({
      where: {
        status: "PUBLISHED",
        createdAt: { gte: cutoff },
      },
      select: {
        categoryId: true,
        provinceId: true,
        province: true,
        viewCount: true,
      },
    });

    for (const l of listings) {
      if (!l.categoryId) continue;
      const cat = catById.get(l.categoryId);
      if (!cat) continue;

      // Resolve province: prefer canonical provinceId, then legacy
      // province string (matched by slugified name).
      let prov = l.provinceId ? provById.get(l.provinceId) : undefined;
      if (!prov && l.province) {
        prov = provByNameSlug.get(slugifyName(l.province));
      }
      if (!prov) continue; // skip listings with no resolvable province

      const delta = metric === "listings" ? 1 : l.viewCount ?? 0;
      if (delta <= 0) continue;
      bump(cat.slug, cat.name, prov.slug, prov.name, delta);
    }
  } else if (metric === "searches") {
    // SearchQuery has no province — aggregate to a single
    // "کلیه استان‌ها" pseudo-province so the matrix shape stays
    // consistent.
    const searches = await db.searchQuery.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { categorySlug: true },
    });

    // Build a categorySlug → Category lookup so we can resolve the
    // category name. (SearchQuery.categorySlug is free text but
    // should match Category.slug.)
    const catBySlug = new Map<string, { id: string; slug: string; name: string; icon: string | null }>();
    for (const c of catById.values()) {
      catBySlug.set(c.slug, c);
    }

    for (const s of searches) {
      if (!s.categorySlug) continue;
      const cat = catBySlug.get(s.categorySlug);
      if (!cat) continue;
      bump(cat.slug, cat.name, ALL_PROVINCES_SLUG, ALL_PROVINCES_NAME, 1);
    }
  }

  // Normalize to 0..1.
  const max = Math.max(1, ...Array.from(agg.values()).map((v) => v.rawValue));
  const cells: HeatmapCell[] = Array.from(agg.values()).map((v) => ({
    categorySlug: v.categorySlug,
    categoryName: v.categoryName,
    provinceSlug: v.provinceSlug,
    provinceName: v.provinceName,
    rawValue: v.rawValue,
    intensity: v.rawValue / max,
  }));

  // Sort: by intensity desc, then category name asc, then province name asc.
  cells.sort((a, b) => {
    if (b.intensity !== a.intensity) return b.intensity - a.intensity;
    if (a.categoryName !== b.categoryName) return a.categoryName.localeCompare(b.categoryName, "fa");
    return a.provinceName.localeCompare(b.provinceName, "fa");
  });

  return cells;
}

/* ----------------------------------------------------------------
   getHotCategories

   Top categories by combined activity. The optional provinceSlug
   filter scopes the listing/view counts to a single province
   (matched by slug-or-name). Search counts are always global
   (since SearchQuery has no province).
---------------------------------------------------------------- */
export async function getHotCategories(
  provinceSlug?: string | null,
  days: number = DEFAULT_DAYS,
): Promise<HotCategoryRow[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [{ byId: catById }, { byId: provById, byNameSlug: provByNameSlug }] = await Promise.all([
    resolveCategories(),
    resolveProvinces(),
  ]);

  // Resolve the optional province filter to a province id.
  let provinceId: string | undefined;
  if (provinceSlug && provinceSlug !== ALL_PROVINCES_SLUG) {
    const p = provByNameSlug.get(provinceSlug) ?? provById.get(provinceSlug);
    provinceId = p?.id;
  }

  // Parallel fetches: listings (with optional province filter),
  // searches (global), and views (= sum of viewCount on the same
  // listing set).
  const listingWhere = {
    status: "PUBLISHED" as const,
    createdAt: { gte: cutoff },
    ...(provinceId ? { provinceId } : {}),
  };

  const [listingRows, searchRows] = await Promise.all([
    db.listing.findMany({
      where: listingWhere,
      select: { categoryId: true, viewCount: true },
    }),
    db.searchQuery.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { categorySlug: true },
    }),
  ]);

  // Aggregate per category.
  const catBySlug = new Map<string, { id: string; slug: string; name: string; icon: string | null }>();
  for (const c of catById.values()) catBySlug.set(c.slug, c);

  type Agg = {
    category: { id: string; slug: string; name: string; icon: string | null };
    listingCount: number;
    searchCount: number;
    viewCount: number;
  };
  const agg = new Map<string, Agg>();

  const ensure = (slug: string) => {
    let e = agg.get(slug);
    if (!e) {
      const cat = catBySlug.get(slug);
      if (!cat) return null;
      e = { category: cat, listingCount: 0, searchCount: 0, viewCount: 0 };
      agg.set(slug, e);
    }
    return e;
  };

  for (const l of listingRows) {
    if (!l.categoryId) continue;
    const cat = catById.get(l.categoryId);
    if (!cat) continue;
    const e = ensure(cat.slug);
    if (!e) continue;
    e.listingCount += 1;
    e.viewCount += l.viewCount ?? 0;
  }
  for (const s of searchRows) {
    if (!s.categorySlug) continue;
    const e = ensure(s.categorySlug);
    if (!e) continue;
    e.searchCount += 1;
  }

  // Compute heat score: normalize each metric to 0..1, then weight.
  const maxListings = Math.max(1, ...Array.from(agg.values()).map((a) => a.listingCount));
  const maxSearches = Math.max(1, ...Array.from(agg.values()).map((a) => a.searchCount));
  const maxViews = Math.max(1, ...Array.from(agg.values()).map((a) => a.viewCount));

  const rows: HotCategoryRow[] = Array.from(agg.values()).map((a) => {
    const nL = a.listingCount / maxListings;
    const nS = a.searchCount / maxSearches;
    const nV = a.viewCount / maxViews;
    const heatScore = nL * 0.4 + nS * 0.2 + nV * 0.4;
    return {
      category: a.category,
      listingCount: a.listingCount,
      searchCount: a.searchCount,
      viewCount: a.viewCount,
      heatScore: Math.min(1, heatScore),
    };
  });

  rows.sort((a, b) => b.heatScore - a.heatScore);
  return rows;
}

/* ----------------------------------------------------------------
   getHotProvinces

   Top provinces by combined activity. The optional categorySlug
   filter scopes the listing/view counts to a single category.
   Search counts are always 0 here (SearchQuery has no province).
---------------------------------------------------------------- */
export async function getHotProvinces(
  categorySlug?: string | null,
  days: number = DEFAULT_DAYS,
): Promise<HotProvinceRow[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [{ byId: catById }, { list: provinceList }] = await Promise.all([
    resolveCategories(),
    resolveProvinces(),
  ]);

  // Resolve the optional category filter to a category id.
  let categoryId: string | undefined;
  if (categorySlug) {
    for (const c of catById.values()) {
      if (c.slug === categorySlug) {
        categoryId = c.id;
        break;
      }
    }
  }

  const listingWhere = {
    status: "PUBLISHED" as const,
    createdAt: { gte: cutoff },
    ...(categoryId ? { categoryId } : {}),
  };

  const listingRows = await db.listing.findMany({
    where: listingWhere,
    select: { provinceId: true, province: true, viewCount: true },
  });

  type Agg = {
    province: { id: string; slug: string; name: string; nameEn: string | null };
    listingCount: number;
    searchCount: number;
    viewCount: number;
  };
  const agg = new Map<string, Agg>();
  const ensure = (id: string, slug: string, name: string, nameEn: string | null) => {
    let e = agg.get(id);
    if (!e) {
      e = {
        province: { id, slug, name, nameEn },
        listingCount: 0,
        searchCount: 0,
        viewCount: 0,
      };
      agg.set(id, e);
    }
    return e;
  };

  for (const l of listingRows) {
    let provId = l.provinceId;
    let provName: string | null = null;
    let provNameEn: string | null = null;
    let provSlug: string | null = null;
    if (provId) {
      const p = provinceList.find((x) => x.id === provId);
      if (p) {
        provName = p.name;
        provNameEn = p.nameEn;
        provSlug = p.slug;
      }
    }
    if (!provId || !provName) {
      // Try legacy province string.
      if (l.province) {
        const p = provinceList.find(
          (x) => x.slug === slugifyName(l.province!) || x.name === l.province,
        );
        if (p) {
          provId = p.id;
          provName = p.name;
          provNameEn = p.nameEn;
          provSlug = p.slug;
        }
      }
    }
    if (!provId || !provName || !provSlug) continue;
    const e = ensure(provId, provSlug, provName, provNameEn);
    e.listingCount += 1;
    e.viewCount += l.viewCount ?? 0;
  }

  // Compute heat score.
  const maxListings = Math.max(1, ...Array.from(agg.values()).map((a) => a.listingCount));
  const maxViews = Math.max(1, ...Array.from(agg.values()).map((a) => a.viewCount));

  const rows: HotProvinceRow[] = Array.from(agg.values()).map((a) => {
    const nL = a.listingCount / maxListings;
    const nV = a.viewCount / maxViews;
    const heatScore = nL * 0.5 + nV * 0.5; // searches skipped (no province)
    return {
      province: a.province,
      listingCount: a.listingCount,
      searchCount: a.searchCount,
      viewCount: a.viewCount,
      heatScore: Math.min(1, heatScore),
    };
  });

  rows.sort((a, b) => b.heatScore - a.heatScore);
  return rows;
}
