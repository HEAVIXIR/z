/* HEAVIX — Listing Attribute Value Backfill (P0-PRICE-ATTR)
   =================================================================
   Problem this addresses:
     • ListingAttributeValue = 3 rows.
     • 405 AttributeDefinitions + 731 CategoryAttribute links exist
       but listings don't have attribute values populated.

   For each PUBLISHED listing with a categoryId:
     • Fetch the CategoryAttribute definitions for that category
       (with AttributeDefinition + AttributeOption rows).
     • For each attribute, try to extract the value from the listing's
       title / description (and structured fields where the spec
       calls for them):
         - "year"                       → 4-digit number 2010-2024
                                          (text first, listing.year fallback)
         - "operating_hours" / "hours"  → number followed by "ساعت"
                                          or "hour" (desc first, workingHours
                                          fallback)
         - "condition"                  → match option values "نو",
                                          "کارکرده", "صفر", … in text;
                                          listing.condition enum fallback
         - "city" / "location"          → use listing.city
         - SELECT / MULTI_SELECT attrs  → match option values in text
     • Create ListingAttributeValue rows with
       sourceType=AI_EXTRACTION, confidence=0.7.
     • Skip attributes where no value can be extracted.

   Idempotency / data preservation:
     • Uses upsert-by-(listingId, attributeId).
     • Existing rows whose sourceType is NOT "AI_EXTRACTION"
       (e.g. ADMIN_VERIFIED, MANUFACTURER_DOCUMENT) are NEVER
       touched — they are preserved as-is.
     • Existing AI_EXTRACTION rows are refreshed with the latest
       extraction (re-runs converge to the same value).
     • No rows are ever deleted.

   Run:
     bunx tsx prisma/seed-listing-attributes.ts
     bun run db:seed-listing-attributes
*/
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

type AttrOpt = { id: string; value: string; label: string | null };

type ExtractedValue = {
  numberValue?: number | null;
  textValue?: string | null;
  optionId?: string | null;
  unit?: string | null;
};

// ════════════════════════════════════════════════════════════
// ATTRIBUTE KEY BUCKETS
//   Keys are matched case-insensitively against AttributeDefinition.key
// ════════════════════════════════════════════════════════════

const YEAR_KEYS = new Set([
  "year",
  "manufacturing_year",
  "model_year",
  "production_year",
]);

const HOURS_KEYS = new Set([
  "operating_hours",
  "hours",
  "working_hours",
  "engine_hours",
]);

const CONDITION_KEYS = new Set(["condition", "state"]);

const CITY_KEYS = new Set([
  "city",
  "location",
  "city_id",
  "location_city",
]);

// ════════════════════════════════════════════════════════════
// HELPERS — Persian digit normalization
// ════════════════════════════════════════════════════════════

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function toEnDigits(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

// ════════════════════════════════════════════════════════════
// EXTRACTORS
// ════════════════════════════════════════════════════════════

/** Extract a 4-digit year in [2010, 2024] from text, with structured fallback. */
function extractYear(
  title: string,
  description: string,
  fallback: number | null,
): number | null {
  const sources = [title, description];
  for (const src of sources) {
    if (!src) continue;
    const en = toEnDigits(src);
    // Prefer "سال YYYY" / "سال YYYY" patterns
    const m1 = en.match(/سال\s*(\d{4})/);
    if (m1) {
      const y = parseInt(m1[1]!, 10);
      if (y >= 2010 && y <= 2024) return y;
    }
    // Any standalone 4-digit number in the valid year window
    const matches = en.match(/\d{4}/g);
    if (matches) {
      for (const ms of matches) {
        const y = parseInt(ms, 10);
        if (y >= 2010 && y <= 2024) return y;
      }
    }
  }
  // Structured fallback — listing.year is the authoritative source
  if (fallback != null && fallback >= 2010 && fallback <= 2024) {
    return fallback;
  }
  return null;
}

/** Extract working hours — a number followed by "ساعت" or "hour(s)". */
function extractHours(
  title: string,
  description: string,
  fallback: number | null,
): number | null {
  const sources = [description, title]; // description first
  for (const src of sources) {
    if (!src) continue;
    const en = toEnDigits(src);
    // number (with optional thousands sep) followed by ساعت / hour / hours / hr
    const m = en.match(/(\d[\d,]*)\s*(?:ساعت|hour|hours|hr)\b/i);
    if (m) {
      const n = parseInt(m[1]!.replace(/,/g, ""), 10);
      if (Number.isFinite(n) && n > 0 && n < 100000) return n;
    }
  }
  // Structured fallback
  if (fallback != null && fallback > 0 && fallback < 100000) {
    return fallback;
  }
  return null;
}

/** Match a condition option by scanning title+description text. */
function matchConditionOption(
  text: string,
  options: AttrOpt[],
  listingCondition: string | null,
): string | null {
  if (!text || options.length === 0) return null;
  const en = toEnDigits(text);
  const findOpt = (pred: (v: string) => boolean): string | null => {
    const o = options.find((x) => pred(x.value));
    return o?.id ?? null;
  };

  // Patterns ordered specific → general
  const patterns: { re: RegExp; pick: () => string | null }[] = [
    {
      re: /صفر\s*کارکرد/,
      pick: () => findOpt((v) => v.includes("صفر")),
    },
    {
      re: /کم[\s\u200c]*کارکرد/,
      pick: () => findOpt((v) => v.includes("کم")),
    },
    {
      re: /نیازمند\s*تعمیر|خراب|نیازمند تعمیر/,
      pick: () => findOpt((v) => v.includes("تعمیر")),
    },
    {
      re: /بازسازی/,
      pick: () => findOpt((v) => v.includes("بازسازی")),
    },
    {
      // \u200c is ZWNJ — handles "نو\u200cکارکرد" too
      re: /نو(?!\s*کارکرد)/,
      pick: () => findOpt((v) => v === "نو" || v === "نو کارکرد"),
    },
    {
      re: /کارکرده/,
      pick: () => findOpt((v) => v === "کارکرده"),
    },
    {
      re: /دست[\s\u200c]*دوم/,
      pick: () => findOpt((v) => v.includes("دست") && v.includes("دوم")),
    },
  ];
  for (const p of patterns) {
    if (p.re.test(en) || p.re.test(text)) {
      const id = p.pick();
      if (id) return id;
    }
  }
  // Fallback: map listing.condition enum to a sensible option
  if (listingCondition === "NEW") {
    return findOpt((v) => v === "نو") ?? null;
  }
  if (listingCondition === "USED") {
    return (
      findOpt((v) => v === "کارکرده") ??
      findOpt((v) => v.includes("دست") && v.includes("دوم")) ??
      null
    );
  }
  return null;
}

/** Generic SELECT/MULTI_SELECT option matcher — scan text for option values. */
function matchSelectOption(text: string, options: AttrOpt[]): string | null {
  if (!text || options.length === 0) return null;
  const en = toEnDigits(text);
  // Longest option value first so specific matches win over generic
  const sorted = [...options].sort((a, b) => b.value.length - a.value.length);
  for (const o of sorted) {
    const v = (o.value ?? "").trim();
    if (!v || v.length < 2) continue; // skip 1-char options (too noisy)
    if (en.includes(v) || text.includes(v)) {
      return o.id;
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════

async function main() {
  const listings = await db.listing.findMany({
    where: { status: "PUBLISHED", categoryId: { not: null } },
    select: {
      id: true,
      title: true,
      description: true,
      city: true,
      year: true,
      workingHours: true,
      condition: true,
      categoryId: true,
    },
  });
  console.log(`[attr-fill] backfilling ${listings.length} PUBLISHED listings…`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let preserved = 0;

  // Cache category→attributes to avoid repeat queries when multiple
  // listings share a category.
  const catAttrCache = new Map<
    string,
    Array<{
      id: string;
      attributeId: string;
      attribute: {
        id: string;
        key: string | null;
        name: string;
        type: string;
        unit: string | null;
        options: AttrOpt[];
      };
    }>
  >();

  for (const l of listings) {
    if (!l.categoryId) continue;

    let catAttrs = catAttrCache.get(l.categoryId);
    if (!catAttrs) {
      catAttrs = await db.categoryAttribute.findMany({
        where: { categoryId: l.categoryId },
        include: {
          attribute: {
            select: {
              id: true,
              key: true,
              name: true,
              type: true,
              unit: true,
              options: { select: { id: true, value: true, label: true } },
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      });
      catAttrCache.set(l.categoryId, catAttrs);
    }

    const title = l.title ?? "";
    const description = l.description ?? "";
    const text = `${title} ${description}`.trim();

    for (const ca of catAttrs) {
      const a = ca.attribute;
      const key = (a.key ?? "").toLowerCase();
      const type = (a.type ?? "").toUpperCase();
      const options: AttrOpt[] = a.options ?? [];

      let value: ExtractedValue | null = null;

      if (HOURS_KEYS.has(key)) {
        const n = extractHours(title, description, l.workingHours);
        if (n != null) value = { numberValue: n, unit: a.unit };
      } else if (YEAR_KEYS.has(key)) {
        const y = extractYear(title, description, l.year);
        if (y != null) value = { numberValue: y, unit: a.unit };
      } else if (CONDITION_KEYS.has(key)) {
        const optId = matchConditionOption(text, options, l.condition);
        if (optId) value = { optionId: optId };
      } else if (CITY_KEYS.has(key)) {
        if (l.city) value = { textValue: l.city };
      } else if (type === "SELECT" || type === "MULTI_SELECT") {
        const optId = matchSelectOption(text, options);
        if (optId) value = { optionId: optId };
      } else {
        // No extractor configured for this type/key — skip silently
        continue;
      }

      if (!value) {
        skipped++;
        continue;
      }

      const baseData = {
        textValue: value.textValue ?? null,
        numberValue: value.numberValue ?? null,
        booleanValue: null,
        dateValue: null,
        optionId: value.optionId ?? null,
        unit: value.unit ?? null,
        sourceType: "AI_EXTRACTION",
        confidence: 0.7,
      };

      // Existing row? Preserve non-AI rows; refresh AI rows.
      const existing = await db.listingAttributeValue.findUnique({
        where: {
          listingId_attributeId: {
            listingId: l.id,
            attributeId: a.id,
          },
        },
        select: { id: true, sourceType: true },
      });

      if (existing) {
        if (existing.sourceType && existing.sourceType !== "AI_EXTRACTION") {
          // Preserve admin / manufacturer / imported values verbatim
          preserved++;
          continue;
        }
        await db.listingAttributeValue.update({
          where: { id: existing.id },
          data: baseData,
        });
        updated++;
      } else {
        await db.listingAttributeValue.create({
          data: {
            listingId: l.id,
            attributeId: a.id,
            ...baseData,
          },
        });
        created++;
      }
    }
  }

  console.log(
    `[attr-fill] created=${created} updated=${updated} skipped=${skipped} preserved=${preserved}`,
  );

  const total = await db.listingAttributeValue.count();
  const bySource = await db.listingAttributeValue.groupBy({
    by: ["sourceType"],
    _count: true,
  });
  console.log(`[attr-fill] total ListingAttributeValue rows now: ${total}`);
  console.log(`[attr-fill] by sourceType:`, JSON.stringify(bySource));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
