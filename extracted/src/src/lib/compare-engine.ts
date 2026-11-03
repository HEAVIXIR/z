import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import { getPriceSuggestions } from "@/lib/price-intelligence";

/* ============================================================
   HEAVIX — Machine Comparison Engine (V1.0)
   ------------------------------------------------------------
   docs/HEAVIX-MACHINE-COMPARISON-SPEC-V1.0.md

   This engine turns 2-5 catalog/listing entities into a
   structured comparison table:
     • rows = attributes (fixed specs + dynamic ListingAttributeValue)
     • columns = items (listings / products / models / brands)
     • per-row "isDifferent" flag (drives Differences-Only mode)
     • cross-category warning when items span >1 category
     • price row carries the asking price + HEAVIX estimated range
     • AI summary (no winner declaration) via z-ai-web-dev-sdk

   Design rules (from the spec):
     • Catalog-first: comparing a model ≠ comparing a listing.
       The engine accepts either; the row builder resolves the
       most specific data available.
     • Missing data is shown as "—" (Not specified), NEVER as 0.
     • Unit normalization: original value + normalized value + unit.
       For V1 we keep it simple — we surface the unit and the
       Persian-formatted display string.
     • Provenance: each cell carries sourceType / confidence /
       verifiedAt from ListingAttributeValue when available.
     • No winner / no aggregate ranking — only difference flags
       per row (Specification / Cost / Application / Condition
       differences, per spec §12).

   The module is intentionally server-only (imports Prisma).
   ============================================================ */

// ────────────────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────────────────

export type ComparisonEntityType = "LISTING" | "PRODUCT" | "MODEL" | "BRAND";

export interface ComparisonItemData {
  /** ComparisonItem.id (the session-local row id). */
  id: string;
  sortOrder: number;
  type: ComparisonEntityType;
  title: string;
  slug?: string | null;
  image?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  brandId?: string | null;
  brandName?: string | null;
  modelId?: string | null;
  modelName?: string | null;
  productId?: string | null;
  year?: number | null;
  city?: string | null;
  province?: string | null;
  /** Reference to the underlying listing, when present. */
  listingId?: string | null;
}

export interface ComparisonCellProvenance {
  source?: string | null;
  confidence?: number | null;
  verifiedAt?: string | null;
  sourceReference?: string | null;
  verifiedBy?: string | null;
}

export interface ComparisonPriceRange {
  min: number | null;
  max: number | null;
  avg: number | null;
  currency: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sampleSize: number;
}

export interface ComparisonCell {
  itemId: string;
  /** Persian-formatted display value (empty string when missing). */
  display: string;
  /** Raw underlying value (stringified for JSON safety). */
  raw: string | null;
  unit?: string | null;
  /** Normalized machine value (e.g. raw number) — used for diff detection. */
  normalized: string;
  provenance?: ComparisonCellProvenance;
}

export interface ComparisonRow {
  /** Stable row key (e.g. "brand", "year", "attr:operating_weight"). */
  key: string;
  /** Persian label. */
  label: string;
  /** "fixed" = built-in spec; "attribute" = dynamic ListingAttributeValue. */
  category: "fixed" | "attribute";
  unit?: string | null;
  cells: ComparisonCell[];
  /** True when at least two items have differing normalized values. */
  isDifferent: boolean;
  /** True for the asking-price / estimated-range row. */
  isPrice?: boolean;
  /** Estimated price ranges per item (only on the price row). */
  priceRanges?: ComparisonPriceRange[];
}

export interface ComparisonData {
  items: ComparisonItemData[];
  rows: ComparisonRow[];
  attributes: string[];
  differences: string[];
  crossCategoryWarning: boolean;
  categories: { id: string; name: string }[];
}

export interface AddItemInput {
  listingId?: string;
  productId?: string;
  brandId?: string;
  modelId?: string;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const PRICE_TYPE_LABELS: Record<string, string> = {
  NEGOTIABLE: "توافقی",
  FIXED: "مقطوع",
  CALL_FOR_PRICE: "تماس بگیرید",
  AUCTION: "مزایده",
};

const CONDITION_LABELS: Record<string, string> = {
  NEW: "نو",
  USED: "کارکرده",
  REFURBISHED: "بازسازی‌شده",
  FOR_PARTS: "قطعات",
};

const MISSING = "—";
const MISSING_CELL: ComparisonCell = {
  itemId: "",
  display: MISSING,
  raw: null,
  normalized: "",
};

/** Build a random share token (URL-safe, 24 chars). */
function generateShareToken(): string {
  // 18 bytes → 24 base64url chars.
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Format a Toman price to Persian digits + suffix. */
function formatToman(n: number | bigint | null | undefined): string {
  if (n === null || n === undefined) return "";
  const num = typeof n === "bigint" ? Number(n) : n;
  if (!isFinite(num) || num <= 0) return "";
  return `${num.toLocaleString("fa-IR")} تومان`;
}

/** Persian-formatted integer. */
function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return toFa(n);
}

// ────────────────────────────────────────────────────────────
// 1. Session lifecycle
// ────────────────────────────────────────────────────────────

/**
 * Create a new comparison session with an optional share token.
 * When `userId` is provided the session is owned by that user;
 * otherwise it's anonymous (still usable via the public API).
 */
export async function createSession(
  userId?: string | null,
  name?: string,
): Promise<{
  id: string;
  shareToken: string | null;
  name: string | null;
  status: string;
  createdAt: Date;
}> {
  const session = await db.comparisonSession.create({
    data: {
      userId: userId ?? null,
      name: name ?? null,
      shareToken: generateShareToken(),
      status: "ACTIVE",
    },
    select: {
      id: true,
      shareToken: true,
      name: true,
      status: true,
      createdAt: true,
    },
  });
  return session;
}

/**
 * Add an item to a comparison session.
 * Enforces a hard cap of 5 items per session and dedupes by listingId.
 */
export async function addItem(
  sessionId: string,
  input: AddItemInput,
): Promise<{ id: string; sessionId: string; sortOrder: number }> {
  // Verify session exists and is ACTIVE.
  const session = await db.comparisonSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, items: { select: { id: true, listingId: true } } },
  });
  if (!session) throw new Error("Session not found");

  // Cap at 5 items.
  if (session.items.length >= 5) {
    throw new Error("حداکثر ۵ مورد قابل مقایسه است");
  }

  // Dedupe by listingId (only when listingId provided).
  if (input.listingId) {
    const dup = session.items.find((i) => i.listingId === input.listingId);
    if (dup) return { id: dup.id, sessionId, sortOrder: 0 };
  }

  const nextSort = session.items.length;
  const item = await db.comparisonItem.create({
    data: {
      sessionId,
      listingId: input.listingId ?? null,
      productId: input.productId ?? null,
      brandId: input.brandId ?? null,
      modelId: input.modelId ?? null,
      sortOrder: nextSort,
    },
    select: { id: true, sessionId: true, sortOrder: true },
  });
  return item;
}

/**
 * Remove an item from a session.
 */
export async function removeItem(sessionId: string, itemId: string): Promise<void> {
  await db.comparisonItem.deleteMany({ where: { id: itemId, sessionId } });
}

// ────────────────────────────────────────────────────────────
// 2. Comparison data builder
// ────────────────────────────────────────────────────────────

/**
 * Fetch + project all comparison items into a structured table.
 *
 * Returns:
 *   items[]     — column metadata (one per ComparisonItem, in sortOrder)
 *   rows[]      — row data (fixed specs first, then dynamic attributes)
 *   attributes  — row keys in order
 *   differences — row keys where isDifferent = true
 *   crossCategoryWarning — true when items span >1 category
 *   categories  — distinct categories present in the comparison
 */
export async function getComparisonData(sessionId: string): Promise<ComparisonData> {
  const session = await db.comparisonSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          listing: {
            include: {
              brand: { select: { id: true, name: true, nameEn: true, country: true } },
              category: { select: { id: true, name: true, slug: true, icon: true } },
              model: { select: { id: true, name: true, nameEn: true } },
              images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
            },
          },
        },
      },
    },
  });
  if (!session) throw new Error("Session not found");

  // ── Column metadata: only items that actually have a listing or
  // a brand/model/product to show. Items with no underlying entity
  // (e.g. listingId pointing to a deleted listing) are skipped —
  // the cascade SetNull on Listing.comparisonItems means listingId
  // becomes null but the ComparisonItem row remains, so filter. ──
  const items: ComparisonItemData[] = [];
  const listingIds: string[] = [];
  for (const it of session.items) {
    if (it.listing) {
      const l = it.listing;
      items.push({
        id: it.id,
        sortOrder: it.sortOrder,
        type: "LISTING",
        title: l.title,
        slug: l.slug,
        image: l.images[0]?.url ?? null,
        categoryId: l.categoryId ?? null,
        categoryName: l.category?.name ?? null,
        brandId: l.brandId ?? null,
        brandName: l.brand?.name ?? null,
        modelId: l.modelId ?? null,
        modelName: l.model?.name ?? null,
        productId: l.productId ?? null,
        year: l.year ?? null,
        city: l.city ?? null,
        province: l.province ?? null,
        listingId: l.id,
      });
      listingIds.push(l.id);
    } else if (it.brandId || it.modelId || it.productId) {
      // Bare catalog item (no listing). Resolve the brand/model/product
      // lazily so the comparison still has column metadata.
      const [brand, model, product] = await Promise.all([
        it.brandId
          ? db.brand.findUnique({ where: { id: it.brandId }, select: { id: true, name: true, nameEn: true, country: true } })
          : Promise.resolve(null),
        it.modelId
          ? db.productModel.findUnique({ where: { id: it.modelId }, select: { id: true, name: true, nameEn: true, categoryId: true, category: { select: { id: true, name: true } } } })
          : Promise.resolve(null),
        it.productId
          ? db.product.findUnique({ where: { id: it.productId }, select: { id: true, canonicalName: true, slug: true, categoryId: true, category: { select: { id: true, name: true } } } })
          : Promise.resolve(null),
      ]);
      items.push({
        id: it.id,
        sortOrder: it.sortOrder,
        type: it.productId ? "PRODUCT" : it.modelId ? "MODEL" : "BRAND",
        title: product?.canonicalName ?? model?.name ?? brand?.name ?? "مورد مقایسه",
        slug: product?.slug ?? null,
        image: null,
        categoryId: product?.categoryId ?? model?.categoryId ?? null,
        categoryName: product?.category?.name ?? model?.category?.name ?? null,
        brandId: brand?.id ?? null,
        brandName: brand?.name ?? null,
        modelId: model?.id ?? null,
        modelName: model?.name ?? null,
        productId: product?.id ?? null,
      });
    }
  }

  if (items.length === 0) {
    return {
      items: [],
      rows: [],
      attributes: [],
      differences: [],
      crossCategoryWarning: false,
      categories: [],
    };
  }

  // ── Pull all ListingAttributeValue rows for the listings in scope. ──
  // Group by listingId → Map<attributeId, value>
  const attrValuesByListing = new Map<string, Map<string, any>>();
  if (listingIds.length > 0) {
    const rows = await db.listingAttributeValue.findMany({
      where: { listingId: { in: listingIds } },
      include: {
        attribute: {
          include: {
            options: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] },
          },
        },
      },
    });
    for (const v of rows) {
      if (!attrValuesByListing.has(v.listingId)) {
        attrValuesByListing.set(v.listingId, new Map());
      }
      attrValuesByListing.get(v.listingId)!.set(v.attributeId, v);
    }
  }

  // Collect the union of attributes that appear on at least one listing
  // (sorted by sortOrder for a stable column order).
  const attributeMeta = new Map<string, any>();
  for (const lm of attrValuesByListing.values()) {
    for (const [attrId, v] of lm.entries()) {
      if (!attributeMeta.has(attrId)) attributeMeta.set(attrId, v.attribute);
    }
  }

  // ── COMPARE-ENGINE — admin can hide specific attributes via
  // SiteSettings.compareVisibleAttributeIds (JSON array of attr IDs).
  // When the field is null/empty, ALL attributes are shown (default).
  // When set, ONLY those attribute IDs appear in the rows. ──
  let visibleAttrIds: Set<string> | null = null;
  try {
    const settings = await db.siteSettings.findUnique({
      where: { id: "main" },
      select: { compareVisibleAttributeIds: true },
    });
    if (settings?.compareVisibleAttributeIds) {
      const parsed = JSON.parse(settings.compareVisibleAttributeIds);
      if (Array.isArray(parsed) && parsed.length > 0) {
        visibleAttrIds = new Set(parsed.filter((x) => typeof x === "string"));
      }
    }
  } catch {
    /* ignore — fall back to showing all */
  }

  let sortedAttributes = Array.from(attributeMeta.values()).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.name ?? "").localeCompare(b.name ?? ""),
  );
  if (visibleAttrIds && visibleAttrIds.size > 0) {
    sortedAttributes = sortedAttributes.filter((a) => visibleAttrIds!.has(a.id));
  }

  // ── Fixed-spec rows (brand, model, year, hours, condition, price, city, etc.). ──
  const rows: ComparisonRow[] = [];

  const pushFixedRow = (
    key: string,
    label: string,
    get: (it: ComparisonItemData) => { display: string; raw: string | null; normalized: string; unit?: string | null } | null,
  ) => {
    const cells: ComparisonCell[] = items.map((it) => {
      const v = get(it);
      if (!v || (v.display === "" && v.raw === null)) {
        return { ...MISSING_CELL, itemId: it.id };
      }
      return {
        itemId: it.id,
        display: v.display || MISSING,
        raw: v.raw,
        normalized: v.normalized,
        unit: v.unit ?? null,
      };
    });
    const normalizeds = cells.map((c) => c.normalized);
    const isDifferent =
      normalizeds.filter((n) => n !== "").length >= 2 &&
      new Set(normalizeds.filter((n) => n !== "")).size > 1;
    rows.push({ key, label, category: "fixed", unit: null, cells, isDifferent });
  };

  pushFixedRow("brand", "برند", (it) =>
    it.brandName ? { display: it.brandName, raw: it.brandName, normalized: it.brandName.toLowerCase() } : null,
  );
  pushFixedRow("model", "مدل", (it) =>
    it.modelName ? { display: it.modelName, raw: it.modelName, normalized: it.modelName.toLowerCase() } : null,
  );
  pushFixedRow("category", "دسته‌بندی", (it) =>
    it.categoryName ? { display: it.categoryName, raw: it.categoryName, normalized: it.categoryName.toLowerCase() } : null,
  );
  pushFixedRow("year", "سال ساخت", (it) =>
    it.year ? { display: formatInt(it.year), raw: String(it.year), normalized: String(it.year) } : null,
  );

  // Hours — needs ListingAttributeValue lookup (since Listing.workingHours is also a column
  // on Listing, prefer the listing's own column for V1).
  pushFixedRow("hours", "ساعت کارکرد", (it) => {
    if (!it.listingId) return null;
    const listing = session.items.find((s) => s.id === it.id)?.listing;
    const h = listing?.workingHours ?? null;
    if (h == null) return null;
    return { display: `${formatInt(h)} ساعت`, raw: String(h), normalized: String(h), unit: "ساعت" };
  });
  pushFixedRow("condition", "وضعیت", (it) => {
    if (!it.listingId) return null;
    const listing = session.items.find((s) => s.id === it.id)?.listing;
    const c = listing?.condition ?? null;
    if (!c) return null;
    const label = CONDITION_LABELS[c] ?? c;
    return { display: label, raw: c, normalized: c };
  });
  pushFixedRow("city", "شهر", (it) =>
    it.city ? { display: it.city, raw: it.city, normalized: it.city.toLowerCase() } : null,
  );
  pushFixedRow("province", "استان", (it) =>
    it.province ? { display: it.province, raw: it.province, normalized: it.province.toLowerCase() } : null,
  );

  // Price row — special: includes the estimated range from the price engine.
  // We compute ranges in parallel below and merge them into the row.
  const priceCells: ComparisonCell[] = items.map((it) => {
    if (!it.listingId) {
      // Bare catalog item (no listing) — no asking price.
      return { ...MISSING_CELL, itemId: it.id };
    }
    const listing = session.items.find((s) => s.id === it.id)?.listing;
    const price = listing?.price ?? null;
    const priceType = listing?.priceType ?? "NEGOTIABLE";
    if (price === null || price === undefined) {
      const pt = PRICE_TYPE_LABELS[priceType] ?? MISSING;
      return {
        itemId: it.id,
        display: pt,
        raw: null,
        normalized: pt,
      };
    }
    const num = Number(price);
    return {
      itemId: it.id,
      display: formatToman(num),
      raw: String(num),
      normalized: String(num),
      unit: "تومان",
    };
  });

  // Compute estimated ranges in parallel — only for items with a categoryId.
  const rangeResults = await Promise.all(
    items.map(async (it) => {
      if (!it.categoryId) return null;
      try {
        const sug = await getPriceSuggestions({
          categoryId: it.categoryId,
          brandId: it.brandId ?? undefined,
          year: it.year ?? undefined,
        });
        return sug;
      } catch {
        return null;
      }
    }),
  );

  const priceRanges: ComparisonPriceRange[] = items.map((it, idx) => {
    const sug = rangeResults[idx];
    if (!sug || sug.sampleSize === 0) {
      return {
        min: null,
        max: null,
        avg: null,
        currency: "IRR",
        confidence: "LOW" as const,
        sampleSize: 0,
      };
    }
    return {
      min: sug.suggestedMin,
      max: sug.suggestedMax,
      avg: sug.suggestedAvg,
      currency: "IRR",
      confidence: sug.confidence,
      sampleSize: sug.sampleSize,
    };
  });

  // Build a richer display string for the price cell that includes
  // the estimated range when available (so the diff detector still
  // works on the raw asking price).
  const priceCellsWithRange: ComparisonCell[] = priceCells.map((c, idx) => {
    const r = priceRanges[idx];
    if (!r || r.min === null || r.max === null) return c;
    const rangeStr = ` (${formatToman(r.min)} – ${formatToman(r.max)})`;
    return { ...c, display: c.display === MISSING ? MISSING : c.display + rangeStr };
  });

  const priceNorms = priceCells.map((c) => c.normalized);
  const priceDiff =
    priceNorms.filter((n) => n !== "" && n !== MISSING).length >= 2 &&
    new Set(priceNorms.filter((n) => n !== "" && n !== MISSING)).size > 1;

  rows.push({
    key: "price",
    label: "قیمت",
    category: "fixed",
    unit: "تومان",
    cells: priceCellsWithRange,
    isDifferent: priceDiff,
    isPrice: true,
    priceRanges,
  });

  // ── Dynamic attribute rows. ──
  for (const attr of sortedAttributes) {
    const key = `attr:${attr.id}`;
    const label = attr.labelFa ?? attr.name ?? attr.nameEn ?? attr.key ?? "مشخصه";
    const cells: ComparisonCell[] = items.map((it) => {
      if (!it.listingId) return { ...MISSING_CELL, itemId: it.id };
      const lm = attrValuesByListing.get(it.listingId);
      const v = lm?.get(attr.id);
      if (!v) return { ...MISSING_CELL, itemId: it.id };

      // Resolve option label if it's a SELECT.
      let display = "";
      let raw: string | null = null;
      let normalized = "";
      const unit = v.unit ?? attr.unit ?? null;

      if (v.optionId) {
        const opt = attr.options.find((o: any) => o.id === v.optionId);
        display = opt?.label ?? opt?.value ?? "";
        raw = opt?.value ?? v.optionId ?? null;
        normalized = String(opt?.value ?? v.optionId ?? "").toLowerCase();
      } else if (v.numberValue !== null && v.numberValue !== undefined) {
        const n = v.numberValue;
        const num = formatToman(n);
        // For non-currency numeric values, just Persian digits + unit.
        if (attr.type === "CURRENCY" && n > 1000) {
          display = num;
        } else {
          display = unit ? `${formatInt(n)} ${unit}` : formatInt(n);
        }
        raw = String(n);
        normalized = String(n);
      } else if (v.booleanValue !== null && v.booleanValue !== undefined) {
        display = v.booleanValue ? "بله" : "خیر";
        raw = String(v.booleanValue);
        normalized = String(v.booleanValue);
      } else if (v.dateValue) {
        try {
          const d = new Date(v.dateValue);
          display = d.toLocaleDateString("fa-IR");
          raw = d.toISOString();
          normalized = d.toISOString().slice(0, 10);
        } catch {
          display = "";
        }
      } else if (v.textValue && v.textValue.trim() !== "") {
        display = v.textValue;
        raw = v.textValue;
        normalized = v.textValue.trim().toLowerCase();
      }

      if (display === "" || display === null) {
        return { ...MISSING_CELL, itemId: it.id };
      }

      return {
        itemId: it.id,
        display,
        raw,
        normalized,
        unit: unit ?? null,
        provenance: {
          source: v.sourceType ?? null,
          confidence: v.confidence ?? null,
          verifiedAt: v.verifiedAt ? new Date(v.verifiedAt).toISOString() : null,
          sourceReference: v.sourceReference ?? null,
          verifiedBy: v.verifiedBy ?? null,
        },
      };
    });

    const normalizeds = cells.map((c) => c.normalized);
    const isDifferent =
      normalizeds.filter((n) => n !== "").length >= 2 &&
      new Set(normalizeds.filter((n) => n !== "")).size > 1;

    rows.push({
      key,
      label,
      category: "attribute",
      unit: attr.unit ?? null,
      cells,
      isDifferent,
    });
  }

  // ── Cross-category warning. ──
  const distinctCategories = new Map<string, string>();
  for (const it of items) {
    if (it.categoryId && it.categoryName && !distinctCategories.has(it.categoryId)) {
      distinctCategories.set(it.categoryId, it.categoryName);
    }
  }
  const crossCategoryWarning = distinctCategories.size > 1;

  const attributes = rows.map((r) => r.key);
  const differences = rows.filter((r) => r.isDifferent).map((r) => r.key);

  return {
    items,
    rows,
    attributes,
    differences,
    crossCategoryWarning,
    categories: Array.from(distinctCategories.entries()).map(([id, name]) => ({ id, name })),
  };
}

/**
 * Convenience wrapper — returns only rows where values differ.
 * Used by the "تفاوت‌ها فقط" toggle on the UI.
 */
export async function getDifferencesOnly(sessionId: string): Promise<ComparisonRow[]> {
  const data = await getComparisonData(sessionId);
  return data.rows.filter((r) => r.isDifferent);
}

/**
 * Fetch a session by its share token (public, no auth).
 * Returns null if the token is invalid or expired.
 */
export async function getSessionByShareToken(
  token: string,
): Promise<{ id: string; name: string | null; shareExpiresAt: Date | null } | null> {
  if (!token) return null;
  const session = await db.comparisonSession.findUnique({
    where: { shareToken: token },
    select: { id: true, name: true, shareExpiresAt: true, status: true },
  });
  if (!session) return null;
  if (session.status === "ARCHIVED") return null;
  if (session.shareExpiresAt && session.shareExpiresAt.getTime() < Date.now()) return null;
  return session;
}

// ────────────────────────────────────────────────────────────
// 3. AI summary
// ────────────────────────────────────────────────────────────

/**
 * Generate a Persian AI summary of the comparison:
 *   • key differences across items
 *   • missing data
 *   • price comparison
 *
 * No winner / no aggregate ranking is declared (spec §11 + §12).
 *
 * The summary is persisted on the session (aiSummary + aiSummaryAt)
 * so subsequent reads of the same session don't re-bill the LLM.
 */
export async function generateAISummary(sessionId: string): Promise<string> {
  const data = await getComparisonData(sessionId);
  if (data.items.length < 2) {
    return "حداقل دو مورد برای خلاصه‌سازی لازم است.";
  }

  // Build a compact JSON payload for the LLM. Cells are flattened to
  // display strings to keep the prompt small.
  const payload = {
    items: data.items.map((it) => ({
      title: it.title,
      type: it.type,
      brand: it.brandName ?? null,
      model: it.modelName ?? null,
      category: it.categoryName ?? null,
      year: it.year ?? null,
    })),
    rows: data.rows.map((r) => ({
      label: r.label,
      isDifferent: r.isDifferent,
      values: r.cells.map((c) => c.display),
      priceRange: r.priceRanges
        ? r.priceRanges.map((p) => ({
            min: p.min,
            max: p.max,
            confidence: p.confidence,
            sampleSize: p.sampleSize,
          }))
        : undefined,
    })),
    crossCategoryWarning: data.crossCategoryWarning,
    differences: data.differences,
  };

  const prompt = `You are the HEAVIX Machine Comparison Assistant. Compare ${data.items.length} heavy-machinery items and write a CONCISE Persian (Farsi) summary. STRICT RULES:
1. NEVER declare a winner, NEVER rank items, NEVER claim field-test results or performance guarantees.
2. Summarize only DOCUMENTED differences from the provided data.
3. Explicitly list MISSING data (fields shown as "—").
4. Compare asking prices + estimated ranges when available — describe the price spread, NOT which is "better".
5. If a cross-category warning is present, mention it.
6. Output 3-5 short Persian bullet lines, each ≤ 30 words, prefixed with "• ".
7. Do not include any English, headers, or markdown other than the bullet prefix.

Data:
${JSON.stringify(payload)}`;

  let summary = "";
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = (ZAIModule as any).default ?? ZAIModule;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "خلاصه را بنویس." },
      ],
      thinking: { type: "disabled" },
    });
    summary = (completion?.choices?.[0]?.message?.content ?? "").trim();
  } catch (err) {
    console.error("[compare-engine] AI summary failed:", err);
    // Fall back to a deterministic local summary so the UI always has
    // something useful to show.
    summary = buildFallbackSummary(data);
  }

  if (!summary) {
    summary = buildFallbackSummary(data);
  }

  // Persist the summary on the session for cached reads.
  try {
    await db.comparisonSession.update({
      where: { id: sessionId },
      data: { aiSummary: summary, aiSummaryAt: new Date() },
    });
  } catch (err) {
    console.error("[compare-engine] persist AI summary failed:", err);
  }

  return summary;
}

/** Deterministic Persian summary used when the LLM is unavailable. */
function buildFallbackSummary(data: ComparisonData): string {
  const lines: string[] = [];
  const diffRows = data.rows.filter((r) => r.isDifferent);
  if (diffRows.length === 0) {
    lines.push("• مشخصات موارد مقایسه یکسان است؛ تفاوت قابل توجهی مشاهده نشد.");
  } else {
    const top = diffRows.slice(0, 3);
    for (const r of top) {
      const values = r.cells.map((c) => c.display).filter((d) => d !== MISSING);
      if (values.length >= 2) {
        lines.push(`• ${r.label}: ${values.slice(0, 3).join("، ")}.`);
      }
    }
  }
  // Missing data
  const missingRows = data.rows.filter((r) => r.cells.some((c) => c.display === MISSING));
  if (missingRows.length > 0) {
    lines.push(`• داده‌های ناقص: ${missingRows.slice(0, 4).map((r) => r.label).join("، ")}.`);
  }
  // Price
  const priceRow = data.rows.find((r) => r.isPrice);
  if (priceRow && priceRow.priceRanges) {
    const withRange = priceRow.priceRanges.filter((p) => p.min !== null && p.max !== null);
    if (withRange.length > 0) {
      lines.push(`• بازه تخمینی قیمت: ${withRange.length} مورد بر اساس داده بازار.`);
    }
  }
  if (data.crossCategoryWarning) {
    lines.push(`• هشدار: موارد از دسته‌های متفاوت هستند (${data.categories.map((c) => c.name).join("، ")}).`);
  }
  lines.push("• هویکس برنده اعلام نمی‌کند؛ تصمیم‌گیری نهایی با کاربر است.");
  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────
// 4. Admin helpers
// ────────────────────────────────────────────────────────────

/**
 * List all comparison sessions (admin view).
 * Returns the most recent first, with item counts.
 */
export async function listSessionsForAdmin(opts?: { limit?: number }): Promise<
  Array<{
    id: string;
    name: string | null;
    status: string;
    userId: string | null;
    shareToken: string | null;
    createdAt: Date;
    updatedAt: Date;
    aiSummary: string | null;
    aiSummaryAt: Date | null;
    itemCount: number;
  }>
> {
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 100));
  const sessions = await db.comparisonSession.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { _count: { select: { items: true } } },
  });
  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    userId: s.userId,
    shareToken: s.shareToken,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    aiSummary: s.aiSummary,
    aiSummaryAt: s.aiSummaryAt,
    itemCount: s._count.items,
  }));
}

/**
 * Archive a session (soft-delete from the active list).
 */
export async function archiveSession(sessionId: string): Promise<void> {
  await db.comparisonSession.update({
    where: { id: sessionId },
    data: { status: "ARCHIVED" },
  });
}

/**
 * Rename a session.
 */
export async function renameSession(sessionId: string, name: string): Promise<void> {
  await db.comparisonSession.update({
    where: { id: sessionId },
    data: { name: name.trim().slice(0, 200) || null },
  });
}

/**
 * Regenerate the share token + reset the expiry.
 */
export async function refreshShareToken(
  sessionId: string,
  expiresAt?: Date | null,
): Promise<string | null> {
  const token = generateShareToken();
  await db.comparisonSession.update({
    where: { id: sessionId },
    data: { shareToken: token, shareExpiresAt: expiresAt ?? null },
  });
  return token;
}
