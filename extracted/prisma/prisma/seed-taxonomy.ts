// @ts-nocheck — seed script, not part of runtime typecheck
/* HEAVIX Taxonomy Seed v4 — 16 domains, full multi-level tree.
   Implements the complete taxonomy architecture as specified:
   MACHINE, VEHICLE, PART, ATTACHMENT, SERVICE, RENTAL, TRANSPORT,
   MINERAL, MATERIAL, INDUSTRIAL_EQUIPMENT, AGRICULTURE, TRADING,
   AUCTION, REQUEST, KNOWLEDGE, GENERAL.
   
   Also seeds common attributes for MACHINE domain.
   Run: bunx tsx prisma/seed-taxonomy.ts */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const slugify = (s: string) =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

// ════════════════════════════════════════════════════════════
// DOMAIN DEFINITIONS — 16 root domains with their subcategories
// ════════════════════════════════════════════════════════════

type SubCat = { name: string; nameEn: string; icon?: string; subCats?: { name: string; nameEn: string }[] };
type Domain = { name: string; nameEn: string; icon: string; featured?: boolean; domain: string; subCats: SubCat[] };

const DOMAINS: Domain[] = [
  {
    name: "ماشین‌آلات", nameEn: "MACHINE", icon: "🏗️", featured: true, domain: "MACHINE",
    subCats: [
      { name: "ماشین‌آلات راه‌سازی", nameEn: "Construction Machinery", icon: "🚜", subCats: [
        { name: "بیل مکانیکی", nameEn: "Excavator" }, { name: "لودر چرخ‌دار", nameEn: "Wheel Loader" },
        { name: "بک‌هو لودر", nameEn: "Backhoe Loader" }, { name: "بلدوزر", nameEn: "Bulldozer" },
        { name: "گریدر", nameEn: "Motor Grader" }, { name: "اسکید استیر", nameEn: "Skid Steer Loader" },
        { name: "غلتک", nameEn: "Compactor" }, { name: "جرثقیل", nameEn: "Crane" },
        { name: "تله‌هندلر", nameEn: "Telehandler" },
      ]},
      { name: "ماشین‌آلات معدنی", nameEn: "Mining Machinery", icon: "⛏️", subCats: [
        { name: "بیل معدنی", nameEn: "Mining Excavator" }, { name: "دامپ‌تراک معدنی", nameEn: "Mining Dump Truck" },
        { name: "دامپ‌تراک صلب", nameEn: "Rigid Dump Truck" }, { name: "دامپ‌تراک مفصلی", nameEn: "Articulated Dump Truck" },
        { name: "دریل معدن", nameEn: "Drilling Machine" }, { name: "کراشر", nameEn: "Crusher" },
        { name: "سرند", nameEn: "Screening Machine" },
      ]},
      { name: "ماشین‌آلات راه‌سازی و آسفالت", nameEn: "Road Construction", icon: "🛣️", subCats: [
        { name: "فینیشر آسفالت", nameEn: "Asphalt Paver" }, { name: "کارخانه آسفالت", nameEn: "Asphalt Plant" },
        { name: "غلتک راه‌سازی", nameEn: "Road Roller" }, { name: "فرز آسفالت", nameEn: "Cold Milling Machine" },
        { name: "تثبیت‌کننده", nameEn: "Stabilizer" },
      ]},
      { name: "بازرگانی مواد", nameEn: "Material Handling", icon: "📦", subCats: [
        { name: "فورک‌لیفت", nameEn: "Forklift" }, { name: "ریچ‌تراک", nameEn: "Reach Truck" },
        { name: "استاکر", nameEn: "Stackers" },
      ]},
      { name: "ماشین‌آلات بتن", nameEn: "Concrete Machinery", icon: "🧱", subCats: [
        { name: "میکسر بتن", nameEn: "Concrete Mixer" }, { name: "بتن‌پمپ", nameEn: "Concrete Pump" },
        { name: "باتچینگ پلانت", nameEn: "Batching Plant" },
      ]},
      { name: "ماشین‌آلات جنگل", nameEn: "Forestry Machinery", icon: "🌲" },
      { name: "ماشین‌آلات صنعتی", nameEn: "Industrial Machinery", icon: "🏭" },
      { name: "ماشین‌آلات تخصصی", nameEn: "Specialized Machinery", icon: "⚙️" },
    ],
  },
  {
    name: "وسایل نقلیه", nameEn: "VEHICLE", icon: "🚛", featured: true, domain: "VEHICLE",
    subCats: [
      { name: "کامیون", nameEn: "Truck" }, { name: "دامپ‌تراک", nameEn: "Dump Truck" },
      { name: "کشنده", nameEn: "Tractor Truck" }, { name: "تریلر", nameEn: "Trailer" },
      { name: "نیم‌تریلر", nameEn: "Semi Trailer" }, { name: "پیکاپ", nameEn: "Pickup" },
      { name: "خودرو تجاری", nameEn: "Commercial Vehicle" }, { name: "خودرو حمل", nameEn: "Transport Vehicle" },
      { name: "خودرو تخصصی", nameEn: "Specialized Vehicle" },
    ],
  },
  {
    name: "قطعات", nameEn: "PART", icon: "⚙️", featured: true, domain: "PART",
    subCats: [
      { name: "قطعات موتور", nameEn: "Engine Parts" }, { name: "قطعات گیربکس", nameEn: "Transmission Parts" },
      { name: "قطعات هیدرولیک", nameEn: "Hydraulic Parts" }, { name: "قطعات الکتریکی", nameEn: "Electrical Parts" },
      { name: "تجهیزات زیرین", nameEn: "Undercarriage" }, { name: "پمپ هیدرولیک", nameEn: "Hydraulic Pump" },
      { name: "شیر هیدرولیک", nameEn: "Hydraulic Valve" }, { name: "دریایو نهایی", nameEn: "Final Drive" },
      { name: "موتور چرخشی", nameEn: "Swing Motor" }, { name: "فیلترها", nameEn: "Filters" },
      { name: "سیستم خنک‌کننده", nameEn: "Cooling System" }, { name: "قطعات مصرفی", nameEn: "Wear Parts" },
      { name: "سایر قطعات", nameEn: "Other Parts" },
    ],
  },
  {
    name: "تجهیزات و متعلقات", nameEn: "ATTACHMENT", icon: "🔧", domain: "ATTACHMENT",
    subCats: [
      { name: "بیلجه", nameEn: "Bucket" }, { name: "بیلجه سنگی", nameEn: "Rock Bucket" },
      { name: "بریکر هیدرولیک", nameEn: "Hydraulic Breaker" }, { name: "گرپل", nameEn: "Grapple" },
      { name: "اوگر", nameEn: "Auger" }, { name: "ریپر", nameEn: "Ripper" },
      { name: "چنگال", nameEn: "Fork" }, { name: "کوپلر سریع", nameEn: "Quick Coupler" },
      { name: "تیغه", nameEn: "Blade" }, { name: "سایر متعلقات", nameEn: "Other Attachments" },
    ],
  },
  {
    name: "خدمات", nameEn: "SERVICE", icon: "🛠️", featured: true, domain: "SERVICE",
    subCats: [
      { name: "تعمیرات", nameEn: "Repair" }, { name: "نگهداری", nameEn: "Maintenance" },
      { name: "کارشناسی", nameEn: "Inspection" }, { name: "خدمات فنی", nameEn: "Technical Services" },
      { name: "خدمات هیدرولیک", nameEn: "Hydraulic Services" }, { name: "خدمات موتور", nameEn: "Engine Services" },
      { name: "خدمات الکتریکی", nameEn: "Electrical Services" }, { name: "عیب‌یابی ماشین", nameEn: "Machine Diagnostics" },
      { name: "خدمات اپراتور", nameEn: "Operator Services" }, { name: "مشاوره", nameEn: "Consulting" },
      { name: "خدمات واردات", nameEn: "Import Services" }, { name: "خدمات گمرک", nameEn: "Customs Services" },
      { name: "سایر خدمات", nameEn: "Other Services" },
    ],
  },
  {
    name: "اجاره", nameEn: "RENTAL", icon: "📅", domain: "RENTAL",
    subCats: [
      { name: "اجاره ماشین‌آلات", nameEn: "Machine Rental" }, { name: "اجاره خودرو", nameEn: "Vehicle Rental" },
      { name: "اجاره تجهیزات", nameEn: "Equipment Rental" }, { name: "اجاره متعلقات", nameEn: "Attachment Rental" },
      { name: "اجاره بلندمدت", nameEn: "Long Term Rental" },
    ],
  },
  {
    name: "حمل‌ونقل", nameEn: "TRANSPORT", icon: "🚚", domain: "TRANSPORT",
    subCats: [
      { name: "حمل سنگین", nameEn: "Heavy Haulage" }, { name: "حمل ماشین", nameEn: "Machine Transport" },
      { name: "لوبد", nameEn: "Lowbed" }, { name: "تریلر", nameEn: "Trailer" },
      { name: "حمل محلی", nameEn: "Local Transport" }, { name: "حمل بین‌المللی", nameEn: "International Transport" },
      { name: "حمل ویژه", nameEn: "Special Transport" },
    ],
  },
  {
    name: "مواد معدنی", nameEn: "MINERAL", icon: "💎", domain: "MINERAL",
    subCats: [
      { name: "سنگ آهن", nameEn: "Iron Ore" }, { name: "مس", nameEn: "Copper" },
      { name: "سرب", nameEn: "Lead" }, { name: "روی", nameEn: "Zinc" },
      { name: "کرومیت", nameEn: "Chromite" }, { name: "زغال‌سنگ", nameEn: "Coal" },
      { name: "آهک", nameEn: "Limestone" }, { name: "گچ", nameEn: "Gypsum" },
      { name: "سایر مواد معدنی", nameEn: "Other Minerals" },
    ],
  },
  {
    name: "مصالح و مواد", nameEn: "MATERIAL", icon: "🧱", domain: "MATERIAL",
    subCats: [
      { name: "ماسه", nameEn: "Sand" }, { name: "شن و ماسه", nameEn: "Gravel" },
      { name: "سنگدانه", nameEn: "Aggregate" }, { name: "آسفالت", nameEn: "Asphalt" },
      { name: "سیمان", nameEn: "Cement" }, { name: "بتن", nameEn: "Concrete" },
      { name: "سنگ", nameEn: "Stone" }, { name: "سایر مصالح", nameEn: "Other Materials" },
    ],
  },
  {
    name: "تجهیزات صنعتی", nameEn: "INDUSTRIAL_EQUIPMENT", icon: "🏭", domain: "INDUSTRIAL_EQUIPMENT",
    subCats: [
      { name: "ژنراتور", nameEn: "Generators" }, { name: "کمپرسور", nameEn: "Compressors" },
      { name: "پمپ", nameEn: "Pumps" }, { name: "موتور صنعتی", nameEn: "Industrial Engines" },
      { name: "تجهیزات جوش", nameEn: "Welding Equipment" }, { name: "تجهیزات برق", nameEn: "Power Equipment" },
      { name: "تجهیزات کارخانه", nameEn: "Factory Equipment" }, { name: "سایر تجهیزات صنعتی", nameEn: "Other Industrial Equipment" },
    ],
  },
  {
    name: "کشاورزی", nameEn: "AGRICULTURE", icon: "🌾", featured: true, domain: "AGRICULTURE",
    subCats: [
      { name: "تراکتور", nameEn: "Tractor" }, { name: "کمباین", nameEn: "Combine Harvester" },
      { name: "دروگر", nameEn: "Harvester" }, { name: "سم‌پاش", nameEn: "Sprayer" },
      { name: "بذرکار", nameEn: "Planter" }, { name: "تجهیزات خاک‌ورزی", nameEn: "Tillage Equipment" },
      { name: "تجهیزات آبیاری", nameEn: "Irrigation Equipment" }, { name: "متعلقات کشاورزی", nameEn: "Agricultural Attachments" },
    ],
  },
  {
    name: "بازرگانی", nameEn: "TRADING", icon: "📦", domain: "TRADING",
    subCats: [
      { name: "واردات", nameEn: "Import" }, { name: "صادرات", nameEn: "Export" },
      { name: "کارگزینی", nameEn: "Brokerage" }, { name: "خدمات تجاری", nameEn: "Commercial Services" },
      { name: "تأمین", nameEn: "Sourcing" }, { name: "تجارت بین‌الملل", nameEn: "International Trade" },
      { name: "سایر بازرگانی", nameEn: "Other Trading" },
    ],
  },
  {
    name: "مزایده", nameEn: "AUCTION", icon: "🔨", domain: "AUCTION",
    subCats: [
      { name: "مزایده ماشین", nameEn: "Machine Auction" }, { name: "مزایده خودرو", nameEn: "Vehicle Auction" },
      { name: "مزایده قطعات", nameEn: "Parts Auction" }, { name: "مزایده تجهیزات", nameEn: "Equipment Auction" },
      { name: "سایر مزایده", nameEn: "Other Auction" },
    ],
  },
  {
    name: "درخواست‌ها", nameEn: "REQUEST", icon: "📋", domain: "REQUEST",
    subCats: [
      { name: "درخواست خرید", nameEn: "Buy Request" }, { name: "درخواست اجاره", nameEn: "Rent Request" },
      { name: "درخواست خدمات", nameEn: "Service Request" }, { name: "درخواست حمل", nameEn: "Transport Request" },
      { name: "درخواست قطعات", nameEn: "Part Request" }, { name: "سایر درخواست‌ها", nameEn: "Other Requests" },
    ],
  },
  {
    name: "دانش و محتوا", nameEn: "KNOWLEDGE", icon: "📚", domain: "KNOWLEDGE",
    subCats: [
      { name: "راهنما", nameEn: "Guides" }, { name: "نقد ماشین", nameEn: "Machine Reviews" },
      { name: "مقالات فنی", nameEn: "Technical Articles" }, { name: "راهنمای خرید", nameEn: "Buying Guides" },
      { name: "نگهداری", nameEn: "Maintenance" }, { name: "اخبار صنعت", nameEn: "Industry News" },
      { name: "اطلاعات بازار", nameEn: "Market Information" }, { name: "محتوای آموزشی", nameEn: "Educational Content" },
    ],
  },
  {
    name: "عمومی", nameEn: "GENERAL", icon: "📌", domain: "GENERAL",
    subCats: [
      { name: "سایر", nameEn: "Other" }, { name: "متفرقه", nameEn: "Miscellaneous" },
      { name: "دسته‌بندی نشده", nameEn: "Uncategorized" },
    ],
  },
];

// ════════════════════════════════════════════════════════════
// COMMON ATTRIBUTES for MACHINE domain
// ════════════════════════════════════════════════════════════

const COMMON_ATTRIBUTES = [
  { key: "operating-weight", name: "وزن عملیاتی", nameEn: "Operating Weight", type: "DECIMAL", unit: "تن",  filterable: true, sortable: true },
  { key: "engine-power", name: "قدرت موتور", nameEn: "Engine Power", type: "DECIMAL", unit: "اسب بخار",  filterable: true, sortable: true },
  { key: "bucket-capacity", name: "گنجایش بیلجه", nameEn: "Bucket Capacity", type: "DECIMAL", unit: "متر مکعب",  filterable: true },
  { key: "operating-hours", name: "ساعت کارکرد", nameEn: "Operating Hours", type: "INTEGER", unit: "ساعت",  filterable: true, sortable: true },
  { key: "manufacture-year", name: "سال ساخت", nameEn: "Manufacture Year", type: "YEAR", filterable: true, sortable: true },
  { key: "fuel-type", name: "نوع سوخت", nameEn: "Fuel Type", type: "SELECT", filterable: true, options: [
    { value: "diesel", label: "دیزل", },
    { value: "gasoline", label: "بنزین", },
    { value: "electric", label: "برقی", },
    { value: "hybrid", label: "هایبرید", },
  ]},
  { key: "drive-type", name: "نوع حرکت", nameEn: "Drive Type", type: "SELECT", filterable: true, options: [
    { value: "wheeled", label: "چرخ‌دار", },
    { value: "tracked", label: "زنجیری", },
  ]},
  { key: "transmission", name: "گیربکس", nameEn: "Transmission", type: "SELECT", filterable: true, options: [
    { value: "manual", label: "دستی" },
    { value: "automatic", label: "اتوماتیک" },
    { value: "hydrostatic", label: "هیدرواستاتیک" },
    { value: "powershift", label: "پاورشفت" },
  ]},
  { key: "condition", name: "وضعیت", nameEn: "Condition", type: "SELECT", filterable: true, options: [
    { value: "new", label: "نو" },
    { value: "used", label: "کارکرده" },
    { value: "refurbished", label: "بازسازی‌شده" },
    { value: "for-parts", label: "قطعات" },
  ]},
];

async function main() {
  console.log("🌱 Seeding HEAVIX Taxonomy v4 (16 domains)...");

  // Clean slate
  await db.categoryAttribute.deleteMany({});
  await db.attributeOption.deleteMany({});
  await db.attributeDefinition.deleteMany({});
  await db.category.deleteMany({});
  console.log("  ✓ cleared old taxonomy");

  // ── Create attributes ──
  for (const attr of COMMON_ATTRIBUTES) {
    const created = await db.attributeDefinition.create({
      data: {
        key: attr.key,
        name: attr.name,
        nameEn: attr.nameEn,
        type: attr.type,
        unit: attr.unit ?? null,
        unit: attr.unit ?? null,
        filterable: attr.filterable ?? false,
        sortable: attr.sortable ?? false,
        active: true,
        sortOrder: COMMON_ATTRIBUTES.indexOf(attr),
      },
    });

    if ((attr as any).options) {
      for (let i = 0; i < (attr as any).options.length; i++) {
        const opt = (attr as any).options[i];
        await db.attributeOption.create({
          data: {
            attributeId: created.id,
            value: opt.value,
            label: opt.label,
            label: opt.label ?? null,
            sortOrder: i,
            active: true,
          },
        });
      }
    }
  }
  console.log(`  ✓ ${COMMON_ATTRIBUTES.length} attribute definitions`);

  // ── Create 16 root domains ──
  let totalCats = 0;
  for (let i = 0; i < DOMAINS.length; i++) {
    const d = DOMAINS[i];
    const rootSlug = slugify(d.nameEn);
    const root = await db.category.create({
      data: {
        name: d.name,
        nameEn: d.nameEn,
        slug: rootSlug,
        icon: d.icon,
        featured: d.featured ?? false,
        active: true,
        showOnHome: true,
        sortOrder: i,
        level: 0,
        domain: d.domain,
      },
    });
    totalCats++;

    // ── Create subcategories (level 1) ──
    for (let j = 0; j < d.subCats.length; j++) {
      const sc = d.subCats[j];
      const scSlug = slugify(`${d.nameEn}-${sc.nameEn}`);
      const scCat = await db.category.create({
        data: {
          name: sc.name,
          nameEn: sc.nameEn,
          slug: scSlug,
          icon: sc.icon ?? null,
          active: true,
          showOnHome: false,
          sortOrder: j,
          level: 1,
          domain: d.domain,
          parentId: root.id,
        },
      });
      totalCats++;

      // ── Create sub-subcategories (level 2) ──
      if (sc.subCats) {
        for (let k = 0; k < sc.subCats.length; k++) {
          const ssc = sc.subCats[k];
          const sscSlug = slugify(`${d.nameEn}-${sc.nameEn}-${ssc.nameEn}`);
          await db.category.create({
            data: {
              name: ssc.name,
              nameEn: ssc.nameEn,
              slug: sscSlug,
              active: true,
              showOnHome: false,
              sortOrder: k,
              level: 2,
              domain: d.domain,
              parentId: scCat.id,
            },
          });
          totalCats++;
        }
      }
    }
  }
  console.log(`  ✓ ${DOMAINS.length} domains, ${totalCats} total categories`);

  // ── Attach common attributes to all MACHINE subcategories (level 1) ──
  const machineSubcats = await db.category.findMany({
    where: { domain: "MACHINE", level: 1 },
  });
  const allAttrs = await db.attributeDefinition.findMany();

  for (const cat of machineSubcats) {
    for (let i = 0; i < allAttrs.length; i++) {
      const attr = allAttrs[i];
      await db.categoryAttribute.create({
        data: {
          categoryId: cat.id,
          attributeId: attr.id,
          required: attr.key === "manufacture-year" || attr.key === "condition",
          filterable: attr.filterable,
          searchable: attr.searchable,
          sortable: attr.sortable,
          visibleOnDetail: true,
          sortOrder: i,
        },
      });
    }
  }
  console.log(`  ✓ attached attributes to ${machineSubcats.length} MACHINE subcategories`);

  console.log("✅ Taxonomy v4 seed complete.");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
