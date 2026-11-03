// @ts-nocheck — seed script, not part of runtime typecheck
/* HEAVIX Attribute Seed — HBR Taxonomy V1.1 §20
   Idempotent seed of AttributeDefinitions + AttributeOptions + CategoryAttribute
   links for the key machine / equipment / part / mineral categories.

   Shared attributes (year "سال ساخت", condition "وضعیت", operating-hours
   "ساعت کارکرد", engine-power "قدرت موتور", operating-weight "وزن عملیاتی")
   are defined with IDENTICAL Persian names across categories so the
   `upsertAttr` helper (which findFirst-matches by name OR nameEn) reuses a
   single AttributeDefinition row and just adds another CategoryAttribute edge.
   Option lists are accumulated (union) — e.g. condition ends up with both
   machine-condition options and spare-part-condition options on one row.

   Guard: exits(1) if V1.1 categories are not seeded yet (no "excavator" slug).

   Run: cd /home/z/my-project && bunx tsx prisma/seed-attributes.ts
*/
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

type AttrType =
  | "TEXT"
  | "NUMBER"
  | "SELECT"
  | "MULTI_SELECT"
  | "BOOLEAN"
  | "DATE";

type AttrDef = {
  name: string; // Persian display name (IDENTICAL across categories for shared attrs)
  nameEn?: string; // English label
  type: AttrType;
  unit?: string;
  required?: boolean;
  filterable?: boolean;
  options?: string[]; // for SELECT / MULTI_SELECT
};

type CatAttrLink = {
  slugCandidates: string[]; // first existing slug wins
  label: string;
  attributes: AttrDef[];
};

// ════════════════════════════════════════════════════════════
// SHARED ATTRIBUTE CONSTANTS
// (identical name across every category that references them)
// ════════════════════════════════════════════════════════════

const YEAR: AttrDef = {
  name: "سال ساخت",
  nameEn: "Year",
  type: "NUMBER",
  filterable: true,
};

const OPERATING_HOURS: AttrDef = {
  name: "ساعت کارکرد",
  nameEn: "Operating Hours",
  type: "NUMBER",
  unit: "ساعت",
  filterable: true,
};

const MACHINE_CONDITION: AttrDef = {
  name: "وضعیت",
  nameEn: "Condition",
  type: "SELECT",
  filterable: true,
  options: ["نو", "صفر کارکرد", "کم‌کارکرد", "کارکرده", "نیازمند تعمیر"],
};

const SPARE_PART_CONDITION: AttrDef = {
  name: "وضعیت",
  nameEn: "Condition",
  type: "SELECT",
  filterable: true,
  options: ["نو", "OEM", "Aftermarket", "دست‌دوم", "بازسازی"],
};

const ENGINE_POWER: AttrDef = {
  name: "قدرت موتور",
  nameEn: "Engine Power",
  type: "NUMBER",
  unit: "اسب بخار",
  filterable: true,
};

const OPERATING_WEIGHT: AttrDef = {
  name: "وزن عملیاتی",
  nameEn: "Operating Weight",
  type: "NUMBER",
  unit: "تن",
  filterable: true,
};

const BUCKET_CAPACITY: AttrDef = {
  name: "گنجایش باکت",
  nameEn: "Bucket Capacity",
  type: "NUMBER",
  unit: "متر مکعب",
  filterable: true,
};

const DRIVE_TYPE_TRUCK: AttrDef = {
  name: "نوع انتقال قدرت",
  nameEn: "Drive Type",
  type: "SELECT",
  options: ["4x2", "6x4", "6x6", "8x4", "8x6"],
};

const DRIVE_TYPE_TRACTOR: AttrDef = {
  name: "نوع انتقال قدرت",
  nameEn: "Drive Type",
  type: "SELECT",
  options: ["دو چرخ محرک", "چهار چرخ محرک", "کششی"],
};

// ════════════════════════════════════════════════════════════
// CATEGORY → ATTRIBUTE LINKS
// ════════════════════════════════════════════════════════════

const LINKS: CatAttrLink[] = [
  // ─── Excavator (بیل مکانیکی) ───────────────────────────────
  {
    slugCandidates: ["excavator"],
    label: "Excavator",
    attributes: [
      OPERATING_WEIGHT,
      ENGINE_POWER,
      BUCKET_CAPACITY,
      {
        name: "عمق حفاری",
        nameEn: "Digging Depth",
        type: "NUMBER",
        unit: "متر",
        filterable: true,
      },
      { name: "برد دسترسی", nameEn: "Reach", type: "NUMBER", unit: "متر" },
      {
        name: "نوع بیل",
        nameEn: "Excavator Type",
        type: "SELECT",
        filterable: true,
        options: ["زنجیری", "چرخ لاستیکی", "مینی", "Long Reach", "Mining"],
      },
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Wheel Loader (لودر) ───────────────────────────────────
  {
    slugCandidates: ["loader"],
    label: "Wheel Loader",
    attributes: [
      OPERATING_WEIGHT,
      BUCKET_CAPACITY,
      ENGINE_POWER,
      { name: "ارتفاع تخلیه", nameEn: "Dump Height", type: "NUMBER", unit: "متر" },
      { name: "سایز تایر", nameEn: "Tire Size", type: "TEXT" },
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Dump Truck (دامپ‌تراک) ────────────────────────────────
  {
    slugCandidates: ["dump-truck"],
    label: "Dump Truck",
    attributes: [
      {
        name: "ظرفیت بار",
        nameEn: "Payload Capacity",
        type: "NUMBER",
        unit: "تن",
        filterable: true,
      },
      ENGINE_POWER,
      {
        name: "نوع موتور",
        nameEn: "Engine Type",
        type: "SELECT",
        options: ["دیزل", "الکتریکی", "هیبریدی"],
      },
      DRIVE_TYPE_TRUCK,
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Bulldozer (بلدوزر) ────────────────────────────────────
  {
    slugCandidates: ["bulldozer"],
    label: "Bulldozer",
    attributes: [
      OPERATING_WEIGHT,
      ENGINE_POWER,
      {
        name: "نوع تیغه",
        nameEn: "Blade Type",
        type: "SELECT",
        options: ["مستقیم", "U-shape", "زاویه‌دار", "مخلوط"],
      },
      {
        name: "نوع زیربندی",
        nameEn: "Undercarriage Type",
        type: "SELECT",
        options: ["زنجیری-LGP", "زنجیری-استاندارد"],
      },
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Grader (گریدر) ────────────────────────────────────────
  {
    slugCandidates: ["grader"],
    label: "Grader",
    attributes: [
      OPERATING_WEIGHT,
      ENGINE_POWER,
      { name: "عرض تیغه", nameEn: "Blade Width", type: "NUMBER", unit: "متر" },
      { name: "زاویه تیغه", nameEn: "Moldboard Angle", type: "NUMBER" },
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Crane (جرثقیل) ────────────────────────────────────────
  {
    slugCandidates: ["crane", "cranes-lifting", "cranes"],
    label: "Crane",
    attributes: [
      {
        name: "حداکثر ظرفیت باربرداری",
        nameEn: "Max Lift Capacity",
        type: "NUMBER",
        unit: "تن",
        filterable: true,
      },
      {
        name: "حداکثر ارتفاع",
        nameEn: "Max Lift Height",
        type: "NUMBER",
        unit: "متر",
        filterable: true,
      },
      { name: "طول بازو", nameEn: "Boom Length", type: "NUMBER", unit: "متر" },
      {
        name: "نوع جرثقیل",
        nameEn: "Crane Type",
        type: "SELECT",
        filterable: true,
        options: ["برجی", "چرخدار", "زنجیری", "متحرک", "سقفی", "کشنده"],
      },
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Generator (ژنراتور) ───────────────────────────────────
  {
    slugCandidates: ["generator", "generators", "industrial-equipment-generator"],
    label: "Generator",
    attributes: [
      {
        name: "توان خروجی",
        nameEn: "Power Output",
        type: "NUMBER",
        unit: "کاوا",
        filterable: true,
      },
      { name: "ولتاژ", nameEn: "Voltage", type: "NUMBER", unit: "ولت" },
      {
        name: "فاز",
        nameEn: "Phase",
        type: "SELECT",
        options: ["تک‌فاز", "سه‌فاز"],
      },
      {
        name: "نوع سوخت",
        nameEn: "Fuel Type",
        type: "SELECT",
        options: ["دیزل", "گاز", "دوگانه‌سوز", "بنزینی"],
      },
      { name: "برند موتور", nameEn: "Engine Brand", type: "TEXT" },
      { name: "برند آلترناتور", nameEn: "Alternator Brand", type: "TEXT" },
      {
        name: "ظرفیت مخزن",
        nameEn: "Fuel Tank Capacity",
        type: "NUMBER",
        unit: "لیتر",
      },
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Compressor (کمپرسور) ──────────────────────────────────
  {
    slugCandidates: ["compressor", "compressors"],
    label: "Compressor",
    attributes: [
      {
        name: "فشار",
        nameEn: "Pressure",
        type: "NUMBER",
        unit: "بار",
        filterable: true,
      },
      {
        name: "دبی هوا",
        nameEn: "Flow Rate",
        type: "NUMBER",
        unit: "فوت مکعب بر دقیقه",
        filterable: true,
      },
      {
        name: "نوع کمپرسور",
        nameEn: "Compressor Type",
        type: "SELECT",
        options: ["پیچی", "پیستونی", "اسکرو", "سانتریفیوژ"],
      },
      {
        name: "منبع توان",
        nameEn: "Power Source",
        type: "SELECT",
        options: ["برقی", "دیزل", "بنزینی"],
      },
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Spare Part (قطعات) ────────────────────────────────────
  {
    slugCandidates: ["spare-parts", "parts", "part"],
    label: "Spare Part",
    attributes: [
      {
        name: "شماره قطعه",
        nameEn: "Part Number",
        type: "TEXT",
        filterable: true,
      },
      { name: "شماره OEM", nameEn: "OEM Number", type: "TEXT" },
      { name: "برند", nameEn: "Brand", type: "TEXT" },
      { name: "سازنده", nameEn: "Manufacturer", type: "TEXT" },
      {
        name: "برندهای سازگار",
        nameEn: "Compatible Brands",
        type: "MULTI_SELECT",
      },
      { name: "مدل‌های سازگار", nameEn: "Compatible Models", type: "TEXT" },
      SPARE_PART_CONDITION,
      {
        name: "گارانتی",
        nameEn: "Warranty",
        type: "SELECT",
        options: ["دارد", "ندارد"],
      },
      { name: "کشور سازنده", nameEn: "Country of Origin", type: "TEXT" },
    ],
  },

  // ─── Mineral (مواد معدنی) ──────────────────────────────────
  {
    slugCandidates: ["minerals", "mineral", "mining-minerals", "raw-minerals"],
    label: "Mineral",
    attributes: [
      {
        name: "نوع ماده",
        nameEn: "Material Type",
        type: "SELECT",
        filterable: true,
        options: [
          "سنگ آهن",
          "مس",
          "سرب",
          "روی",
          "کرومیت",
          "منگنز",
          "باریت",
          "سیلیس",
          "بنتونیت",
          "کائولن",
          "گچ",
          "سنگ آهک",
          "سنگ ساختمانی",
          "شن و ماسه",
        ],
      },
      { name: "عیار", nameEn: "Grade", type: "TEXT", filterable: true },
      { name: "خلوص", nameEn: "Purity", type: "NUMBER", unit: "درصد" },
      { name: "آنالیز شیمیایی", nameEn: "Chemical Analysis", type: "TEXT" },
      { name: "مقدار", nameEn: "Quantity", type: "NUMBER", filterable: true },
      {
        name: "واحد",
        nameEn: "Unit",
        type: "SELECT",
        options: ["تن", "کیلوگرم", "متر مکعب", "تن در ماه"],
      },
      { name: "معدن مبدا", nameEn: "Origin Mine", type: "TEXT" },
      { name: "محل بارگیری", nameEn: "Loading Location", type: "TEXT" },
      {
        name: "ظرفیت تولید",
        nameEn: "Production Capacity",
        type: "NUMBER",
        unit: "تن در ماه",
      },
      {
        name: "حداقل سفارش",
        nameEn: "Minimum Order",
        type: "NUMBER",
        unit: "تن",
      },
      {
        name: "شرایط تحویل",
        nameEn: "Delivery Terms",
        type: "SELECT",
        options: ["EXW", "FOB", "CIF", "تحویل درب معدن", "تحویل مقصد"],
      },
    ],
  },

  // ─── Tractor (تراکتور) ─────────────────────────────────────
  {
    slugCandidates: ["tractor", "agricultural-تراکتور", "agricultural-tractor"],
    label: "Tractor",
    attributes: [
      ENGINE_POWER,
      DRIVE_TYPE_TRACTOR,
      {
        name: "نوع تراکتور",
        nameEn: "Tractor Type",
        type: "SELECT",
        filterable: true,
        options: ["باغی", "زراعی", "سنگین", "تخصصی"],
      },
      { name: "توان PTO", nameEn: "PTO Power", type: "NUMBER", unit: "اسب بخار" },
      {
        name: "ظرفیت هیدرولیک",
        nameEn: "Hydraulic Capacity",
        type: "NUMBER",
        unit: "لیتر بر دقیقه",
      },
      OPERATING_HOURS,
      YEAR,
      MACHINE_CONDITION,
    ],
  },

  // ─── Attachment (باکت/اتچمنت) ──────────────────────────────
  {
    slugCandidates: ["attachment", "attachments", "attachment-bucket", "bucket"],
    label: "Attachment",
    attributes: [
      {
        name: "نوع متعلق",
        nameEn: "Attachment Type",
        type: "SELECT",
        filterable: true,
        options: [
          "باکت",
          "چکش هیدرولیکی",
          "ریپر",
          "گریپل",
          "قیچی",
          "Pulverizer",
          "Quick Coupler",
          "Fork",
          "Auger",
          "Blade",
          "Magnet",
          "Crusher Bucket",
        ],
      },
      { name: "ظرفیت", nameEn: "Capacity", type: "NUMBER", unit: "متر مکعب" },
      { name: "وزن", nameEn: "Weight", type: "NUMBER", unit: "کیلوگرم" },
      { name: "ماشین‌های سازگار", nameEn: "Compatible Machines", type: "TEXT" },
      {
        name: "قطر پین",
        nameEn: "Pin Diameter",
        type: "NUMBER",
        unit: "میلی‌متر",
      },
      MACHINE_CONDITION,
    ],
  },
];

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

/** Resolve a category by trying each slug candidate; first hit wins. */
async function resolveCategory(
  slugCandidates: string[],
) {
  for (const slug of slugCandidates) {
    const cat = await db.category.findUnique({ where: { slug } });
    if (cat) return { cat, matchedSlug: slug };
  }
  return null;
}

/**
 * Upsert an AttributeDefinition by name (or nameEn). Shared attributes reuse
 * the same row across categories. Returns the attr id.
 */
async function upsertAttr(a: AttrDef): Promise<string> {
  const whereClause = a.nameEn
    ? { OR: [{ name: a.name }, { nameEn: a.nameEn }] }
    : { name: a.name };

  const existing = await db.attributeDefinition.findFirst({
    where: whereClause,
  });

  const attr = await db.attributeDefinition.upsert({
    where: { id: existing?.id ?? "__none__" },
    create: {
      name: a.name,
      nameEn: a.nameEn ?? null,
      type: a.type,
      unit: a.unit ?? null,
      required: !!a.required,
      filterable: !!a.filterable,
      sortOrder: a.sortOrder ?? 0,
    },
    update: {
      name: a.name,
      nameEn: a.nameEn ?? null,
      type: a.type,
      unit: a.unit ?? null,
      required: !!a.required,
      filterable: !!a.filterable,
      // NOTE: sortOrder intentionally NOT updated on subsequent matches so the
      // first category's ordering is preserved for shared attributes.
    },
  });

  // Upsert each option (accumulate across categories — union semantics).
  if (a.options && a.options.length > 0) {
    for (let i = 0; i < a.options.length; i++) {
      const opt = a.options[i];
      const ex = await db.attributeOption.findFirst({
        where: { attributeId: attr.id, value: opt },
      });
      await db.attributeOption.upsert({
        where: { id: ex?.id ?? "__none__" },
        create: {
          attributeId: attr.id,
          value: opt,
          label: opt,
          sortOrder: i,
        },
        update: { label: opt, sortOrder: i },
      });
    }
  }

  return attr.id;
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════

async function main() {
  // ── GUARD: V1.1 categories must exist ──────────────────────
  const categoryCount = await db.category.count();
  const excavator = await db.category.findUnique({
    where: { slug: "excavator" },
  });
  if (categoryCount === 0 || !excavator) {
    console.error(
      "ERROR: V1.1 categories not seeded (excavator slug missing). " +
        "Run seed-taxonomy-v11.ts first.",
    );
    process.exit(1);
  }
  console.log(
    `✓ V1.1 taxonomy present (${categoryCount} categories, excavator slug found).`,
  );

  console.log(
    "Seeding AttributeDefinitions + AttributeOptions + CategoryAttribute links...",
  );

  const perCategory: { label: string; slug: string; attrCount: number }[] = [];
  const skipped: { label: string; tried: string[] }[] = [];

  for (const link of LINKS) {
    const resolved = await resolveCategory(link.slugCandidates);
    if (!resolved) {
      console.warn(
        `  ⚠ [${link.label}] no category found for slugs [${link.slugCandidates.join(", ")}] — skipping`,
      );
      skipped.push({ label: link.label, tried: link.slugCandidates });
      continue;
    }
    const { cat, matchedSlug } = resolved;

    for (let i = 0; i < link.attributes.length; i++) {
      const attrId = await upsertAttr({ ...link.attributes[i], sortOrder: i });
      await db.categoryAttribute.upsert({
        where: {
          categoryId_attributeId: { categoryId: cat.id, attributeId: attrId },
        },
        create: { categoryId: cat.id, attributeId: attrId },
        update: {},
      });
    }
    console.log(
      `  ✓ [${link.label}] ${link.attributes.length} attrs → slug "${matchedSlug}"`,
    );
    perCategory.push({
      label: link.label,
      slug: matchedSlug,
      attrCount: link.attributes.length,
    });
  }

  // ── FINAL COUNTS ───────────────────────────────────────────
  const [attrDefs, attrOptions, catAttrLinks] = await Promise.all([
    db.attributeDefinition.count(),
    db.attributeOption.count(),
    db.categoryAttribute.count(),
  ]);

  const result = {
    attrDefs,
    attrOptions,
    catAttrLinks,
    categoriesLinked: perCategory.length,
    categoriesSkipped: skipped.length,
    perCategory,
    skipped,
  };
  console.log("\n══════════════════════════════════════════════════");
  console.log("SEED COMPLETE — HBR Taxonomy V1.1 §20 Attributes");
  console.log("══════════════════════════════════════════════════");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
