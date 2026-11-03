/* HEAVIX — Brand Catalog Seed (Phase A: Industries 1–10)
   Rebuilt after filesystem rollback. Idempotent upserts by slug/key.

   Covers:
     • All 39 Industries (CONSTRUCTION_MACHINERY … INDUSTRIAL_TECHNOLOGY)
     • 18 Brand Families (Caterpillar Inc., CNH Industrial, … GKN)
     • Brands for industries 1–10:
         §8  Construction Machinery
         §9  Mining Machinery
         §10 Drilling
         §11 Quarry/Crushing
         §12 Lifting / Cranes
         §13 Material Handling / Forklifts
         §14 Road Machinery
         §15 Concrete / Asphalt
         §16 Agriculture
         §17 Forestry
     • Parents always appear before children in the BRANDS array.
     • Wirtgen is placed at the start of §11 (Wirtgen Group owns Kleemann).

   Run:  bunx tsx prisma/seed-brands-a.ts
*/
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const slugifyEn = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const normalizeAlias = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type BrandSeed = {
  name: string;
  nameEn: string;
  slug?: string; // optional override (used when nameEn differs from desired slug)
  country?: string;
  type?: string; // defaults to MACHINE_BRAND
  status?: string;
  family?: string;
  parent?: string;
  website?: string;
  industries: string[];
  aliases?: string[];
  featured?: boolean;
};

// ════════════════════════════════════════════════════════════
// 39 INDUSTRIES
// ════════════════════════════════════════════════════════════
const INDUSTRIES: Array<{
  key: string;
  nameFa: string;
  nameEn: string;
  sortOrder: number;
  active: boolean;
}> = [
  { key: "CONSTRUCTION_MACHINERY", nameFa: "ماشین‌آلات ساختمانی", nameEn: "Construction Machinery", sortOrder: 1, active: true },
  { key: "MINING_MACHINERY", nameFa: "ماشین‌آلات معدنی", nameEn: "Mining Machinery", sortOrder: 2, active: true },
  { key: "QUARRY_CRUSHING", nameFa: "سنگ‌شکن و فرآوری", nameEn: "Quarry & Crushing", sortOrder: 3, active: true },
  { key: "DRILLING", nameFa: "حفاری", nameEn: "Drilling", sortOrder: 4, active: true },
  { key: "LIFTING", nameFa: "جرثقیل و بالابر", nameEn: "Lifting & Cranes", sortOrder: 5, active: true },
  { key: "MATERIAL_HANDLING", nameFa: "لیفتراک و انبارداری", nameEn: "Material Handling", sortOrder: 6, active: true },
  { key: "ROAD_MACHINERY", nameFa: "ماشین‌آلات راهسازی", nameEn: "Road Machinery", sortOrder: 7, active: true },
  { key: "CONCRETE_ASPHALT", nameFa: "بتن و آسفالت", nameEn: "Concrete & Asphalt", sortOrder: 8, active: true },
  { key: "AGRICULTURE", nameFa: "کشاورزی", nameEn: "Agriculture", sortOrder: 9, active: true },
  { key: "FORESTRY", nameFa: "جنگلداری", nameEn: "Forestry", sortOrder: 10, active: true },
  { key: "TRUCKS", nameFa: "کامیون و خودرو سنگین", nameEn: "Trucks & Heavy Vehicles", sortOrder: 11, active: true },
  { key: "TRAILERS", nameFa: "تریلر و نیمه‌تریلر", nameEn: "Trailers", sortOrder: 12, active: true },
  { key: "INDUSTRIAL_VEHICLES", nameFa: "خودروهای صنعتی", nameEn: "Industrial Vehicles", sortOrder: 13, active: true },
  { key: "ENGINES", nameFa: "موتورهای صنعتی", nameEn: "Industrial Engines", sortOrder: 14, active: true },
  { key: "GENERATORS", nameFa: "ژنراتور و برق", nameEn: "Generators & Power", sortOrder: 15, active: true },
  { key: "COMPRESSORS", nameFa: "کمپرسور", nameEn: "Compressors", sortOrder: 16, active: true },
  { key: "PUMPS", nameFa: "پمپ", nameEn: "Pumps", sortOrder: 17, active: true },
  { key: "HYDRAULICS", nameFa: "هیدرولیک", nameEn: "Hydraulics", sortOrder: 18, active: true },
  { key: "PNEUMATICS", nameFa: "پنوماتیک", nameEn: "Pneumatics", sortOrder: 19, active: true },
  { key: "ELECTRICAL", nameFa: "الکتریکال", nameEn: "Electrical", sortOrder: 20, active: true },
  { key: "AUTOMATION", nameFa: "اتوماسیون", nameEn: "Automation", sortOrder: 21, active: true },
  { key: "BEARINGS", nameFa: "بلبرینگ و یاتاقان", nameEn: "Bearings", sortOrder: 22, active: true },
  { key: "FILTRATION", nameFa: "فیلتر", nameEn: "Filtration", sortOrder: 23, active: true },
  { key: "TIRES", nameFa: "لاستیک", nameEn: "Tires", sortOrder: 24, active: true },
  { key: "BATTERIES", nameFa: "باتری", nameEn: "Batteries", sortOrder: 25, active: true },
  { key: "LUBRICANTS", nameFa: "روغن و روانکار", nameEn: "Lubricants", sortOrder: 26, active: true },
  { key: "ATTACHMENTS", nameFa: "اتچمنت و ابزار جانبی", nameEn: "Attachments", sortOrder: 27, active: true },
  { key: "SPARE_PARTS", nameFa: "قطعات یدکی", nameEn: "Spare Parts", sortOrder: 28, active: true },
  { key: "INDUSTRIAL_EQUIPMENT", nameFa: "تجهیزات صنعتی", nameEn: "Industrial Equipment", sortOrder: 29, active: true },
  { key: "OIL_GAS", nameFa: "تجهیزات نفت و گاز", nameEn: "Oil & Gas Equipment", sortOrder: 30, active: true },
  { key: "STEEL_FACTORY", nameFa: "فولاد و کارخانه", nameEn: "Steel & Factory", sortOrder: 31, active: true },
  { key: "MARINE", nameFa: "دریایی و بنادر", nameEn: "Marine & Ports", sortOrder: 32, active: true },
  { key: "RAILWAY", nameFa: "ریلی", nameEn: "Railway", sortOrder: 33, active: true },
  { key: "WASTE_RECYCLING", nameFa: "زباله و بازیافت", nameEn: "Waste & Recycling", sortOrder: 34, active: true },
  { key: "PASSENGER_VEHICLES", nameFa: "خودرو سواری و تجاری", nameEn: "Passenger & Commercial Vehicles", sortOrder: 35, active: true },
  { key: "LOGISTICS", nameFa: "لجستیک", nameEn: "Logistics", sortOrder: 36, active: true },
  { key: "TOOLS", nameFa: "ابزار", nameEn: "Tools", sortOrder: 37, active: true },
  { key: "SAFETY_EQUIPMENT", nameFa: "تجهیزات ایمنی", nameEn: "Safety Equipment", sortOrder: 38, active: true },
  { key: "INDUSTRIAL_TECHNOLOGY", nameFa: "تکنولوژی صنعتی", nameEn: "Industrial Technology", sortOrder: 39, active: true },
];

// ════════════════════════════════════════════════════════════
// 18 BRAND FAMILIES
// ════════════════════════════════════════════════════════════
const FAMILIES: Array<{
  name: string;
  nameEn: string;
  slug: string;
  country?: string;
  website?: string;
  description?: string;
  sortOrder: number;
}> = [
  { name: "کاترپیلار", nameEn: "Caterpillar Inc.", slug: "caterpillar-inc", country: "USA", website: "caterpillar.com", description: "American Fortune 100 construction & mining equipment manufacturer.", sortOrder: 1 },
  { name: "سی‌ان‌اچ اینداستریال", nameEn: "CNH Industrial", slug: "cnh-industrial", country: "Italy/UK", website: "cnhindustrial.com", description: "Global capital goods company (agriculture & construction equipment, commercial vehicles).", sortOrder: 2 },
  { name: "گروه وولوو", nameEn: "Volvo Group", slug: "volvo-group", country: "Sweden", website: "volvogroup.com", description: "Swedish manufacturer of trucks, buses, construction equipment & marine/industrial drive systems.", sortOrder: 3 },
  { name: "کوماتسو", nameEn: "Komatsu Ltd.", slug: "komatsu-ltd", country: "Japan", website: "komatsu.com", description: "Japanese multinational construction, mining & military equipment manufacturer.", sortOrder: 4 },
  { name: "گروه لیبهر", nameEn: "Liebherr Group", slug: "liebherr-group", country: "Germany/Switzerland", website: "liebherr.com", description: "Swiss-German equipment manufacturer (cranes, mining, concrete, refrigeration).", sortOrder: 5 },
  { name: "هیوندای هوی اینداستریز", nameEn: "Hyundai Heavy Industries", slug: "hyundai-heavy-industries", country: "South Korea", website: "hhi.co.kr", description: "South Korean heavy industries conglomerate (shipbuilding, construction equipment, engines).", sortOrder: 6 },
  { name: "گروه سانی", nameEn: "SANY Group", slug: "sany-group", country: "China", website: "sanygroup.com", description: "Chinese multinational heavy machinery manufacturer.", sortOrder: 7 },
  { name: "گروه اش‌جی‌ام", nameEn: "XCMG Group", slug: "xcmg-group", country: "China", website: "xcmg.com", description: "Chinese state-owned construction machinery company.", sortOrder: 8 },
  { name: "ای‌جی‌سی‌او", nameEn: "AGCO Corporation", slug: "agco-corporation", country: "USA", website: "agcocorp.com", description: "American agricultural equipment manufacturer (Fendt, Massey Ferguson, Valtra, Challenger).", sortOrder: 9 },
  { name: "گروه دوسان", nameEn: "Doosan Group", slug: "doosan-group", country: "South Korea", website: "doosan.com", description: "South Korean heavy-industry conglomerate (construction equipment, power plants).", sortOrder: 10 },
  { name: "گروه ساندویک", nameEn: "Sandvik Group", slug: "sandvik-group", country: "Sweden", website: "sandvik.com", description: "Swedish engineering group (mining & rock excavation, materials technology).", sortOrder: 11 },
  { name: "گروه آتلس کوپکو", nameEn: "Atlas Copco Group", slug: "atlas-copco-group", country: "Sweden", website: "atlascopcogroup.com", description: "Swedish industrial company (compressors, vacuum, generators, pumps, assembly tools).", sortOrder: 12 },
  { name: "سومیتومو هوی اینداستریز", nameEn: "Sumitomo Heavy Industries", slug: "sumitomo-heavy-industries", country: "Japan", website: "shi.co.jp", description: "Japanese heavy-industry conglomerate (cranes, construction machinery, industrial machinery).", sortOrder: 13 },
  { name: "بوش", nameEn: "Bosch", slug: "bosch", country: "Germany", website: "bosch.com", description: "German multinational engineering & technology company.", sortOrder: 14 },
  { name: "گروه شافلر", nameEn: "Schaeffler Group", slug: "schaeffler-group", country: "Germany", website: "schaeffler.com", description: "German manufacturer of rolling-element bearings, linear technology & automotive components.", sortOrder: 15 },
  { name: "گروه زد‌اف", nameEn: "ZF Group", slug: "zf-group", country: "Germany", website: "zf.com", description: "German technology company (driveline & chassis technology).", sortOrder: 16 },
  { name: "دینا", nameEn: "Dana Incorporated", slug: "dana-incorporated", country: "USA", website: "dana.com", description: "American supplier of driveline, sealing & thermal-management products.", sortOrder: 17 },
  { name: "جی‌کی‌ان", nameEn: "GKN", slug: "gkn", country: "UK", website: "gkn.com", description: "British multinational automotive & aerospace components company.", sortOrder: 18 },
];

// ════════════════════════════════════════════════════════════
// BRANDS — Industries 1–10 (Phase A)
// ════════════════════════════════════════════════════════════
const BRANDS: BrandSeed[] = [
  // ─────────────────────────────────────────────────────────
  // §8 CONSTRUCTION MACHINERY
  // Parents first: Caterpillar → Cat / Perkins ; Komatsu (used as parent in §9/§17) ; Liebherr (parent in §9) ; Zoomlion (parent in §16)
  // ─────────────────────────────────────────────────────────
  {
    name: "کاترپیلار", nameEn: "Caterpillar", family: "caterpillar-inc", country: "USA",
    website: "caterpillar.com", featured: true,
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "ROAD_MACHINERY", "ENGINES", "GENERATORS", "ATTACHMENTS", "SPARE_PARTS", "OIL_GAS", "MARINE", "RAILWAY", "INDUSTRIAL_EQUIPMENT", "FORESTRY"],
    aliases: ["کاترپیلر", "کاترپیلا", "کاتر", "CAT", "Cat", "کاترپیلار آمریکا"],
  },
  {
    name: "کت", nameEn: "Cat", parent: "caterpillar", family: "caterpillar-inc", country: "USA",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY"],
    aliases: ["کت", "CAT ماشین‌آلات"],
  },
  {
    name: "پرکینز", nameEn: "Perkins", parent: "caterpillar", family: "caterpillar-inc", country: "UK",
    type: "ENGINE_BRAND", website: "perkins.com",
    industries: ["ENGINES", "GENERATORS", "INDUSTRIAL_EQUIPMENT"],
    aliases: ["پرکینز موتور", "Perkins Engines"],
  },
  {
    name: "کوماتسو", nameEn: "Komatsu", family: "komatsu-ltd", country: "Japan",
    website: "komatsu.com", featured: true,
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "FORESTRY", "ROAD_MACHINERY", "ATTACHMENTS", "SPARE_PARTS", "MATERIAL_HANDLING"],
    aliases: ["کوماتسو ژاپن", "KOMATSU", "کوماتسو ltd"],
  },
  {
    name: "وولوو", nameEn: "Volvo CE", family: "volvo-group", country: "Sweden",
    website: "volvoce.com", featured: true,
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "ROAD_MACHINERY", "FORESTRY"],
    aliases: ["ولوو سی‌ای", "ولوو ماشین‌آلات", "Volvo Construction Equipment"],
  },
  {
    name: "هیتاچی", nameEn: "Hitachi Construction Machinery", slug: "hitachi", country: "Japan",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "FORESTRY"],
    aliases: ["هیتاچی"],
  },
  {
    name: "لیبهر", nameEn: "Liebherr", family: "liebherr-group", country: "Germany",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "LIFTING", "CONCRETE_ASPHALT", "FORESTRY"],
    aliases: ["لیبهر"],
  },
  {
    name: "جی‌سی‌بی", nameEn: "JCB", country: "UK",
    industries: ["CONSTRUCTION_MACHINERY", "ROAD_MACHINERY", "AGRICULTURE", "MATERIAL_HANDLING", "FORESTRY"],
    aliases: ["جی‌سی‌بی"],
  },
  { name: "دولون", nameEn: "Develon", country: "South Korea", industries: ["CONSTRUCTION_MACHINERY"], aliases: ["دولون"] },
  {
    name: "هیوندای", nameEn: "Hyundai Construction Equipment", slug: "hyundai-ce",
    family: "hyundai-heavy-industries", country: "South Korea",
    industries: ["CONSTRUCTION_MACHINERY", "MATERIAL_HANDLING"],
    aliases: ["هیوندای"],
  },
  {
    name: "سانی", nameEn: "SANY", family: "sany-group", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "CONCRETE_ASPHALT", "LIFTING", "DRILLING", "ROAD_MACHINERY"],
    aliases: ["سانی"],
  },
  {
    name: "اش‌جی‌ام", nameEn: "XCMG", family: "xcmg-group", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "LIFTING", "DRILLING", "ROAD_MACHINERY"],
    aliases: ["اش‌جی‌ام"],
  },
  {
    name: "زوملایون", nameEn: "Zoomlion", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "CONCRETE_ASPHALT", "LIFTING", "AGRICULTURE", "DRILLING", "ROAD_MACHINERY"],
    aliases: ["زوملایون"],
  },
  {
    name: "لیوگونگ", nameEn: "LiuGong", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "ROAD_MACHINERY"],
    aliases: ["لیوگونگ"],
  },
  {
    name: "شانتویی", nameEn: "Shantui", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "ROAD_MACHINERY"],
    aliases: ["شانتویی"],
  },
  {
    name: "اس‌دی‌ال‌جی", nameEn: "SDLG", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "ROAD_MACHINERY"],
    aliases: ["اس‌دی‌ال‌جی"],
  },
  {
    name: "کوبلکو", nameEn: "Kobelco", country: "Japan",
    industries: ["CONSTRUCTION_MACHINERY", "LIFTING"],
    aliases: ["کوبلکو"],
  },
  {
    name: "سومیتومو", nameEn: "Sumitomo Construction Machinery", slug: "sumitomo",
    family: "sumitomo-heavy-industries", country: "Japan",
    industries: ["CONSTRUCTION_MACHINERY", "ROAD_MACHINERY", "LIFTING"],
    aliases: ["سومیتومو"],
  },
  {
    name: "کیس", nameEn: "CASE Construction Equipment", slug: "case-construction",
    family: "cnh-industrial", country: "USA",
    industries: ["CONSTRUCTION_MACHINERY", "ROAD_MACHINERY", "AGRICULTURE"],
    aliases: ["کیس"],
  },
  {
    name: "نیو هالند", nameEn: "New Holland Construction",
    family: "cnh-industrial", country: "USA",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE", "ROAD_MACHINERY"],
    aliases: ["نیو هالند"],
  },
  {
    name: "جان‌دیر", nameEn: "John Deere Construction", slug: "john-deere", country: "USA",
    industries: ["CONSTRUCTION_MACHINERY", "ROAD_MACHINERY", "AGRICULTURE", "FORESTRY"],
    aliases: ["جان‌دیر"],
  },
  {
    name: "کاواساکی", nameEn: "Kawasaki Construction Machinery", slug: "kawasaki", country: "Japan",
    industries: ["CONSTRUCTION_MACHINERY"],
    aliases: ["کاواساکی"],
  },
  {
    name: "دوسان", nameEn: "Doosan", family: "doosan-group", country: "South Korea",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "MATERIAL_HANDLING"],
    aliases: ["دوسان"],
  },
  { name: "تاگوچی", nameEn: "Takeuchi", country: "Japan", industries: ["CONSTRUCTION_MACHINERY"], aliases: ["تاگوچی"] },
  {
    name: "کوبوتا", nameEn: "Kubota", country: "Japan",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE", "ENGINES"],
    aliases: ["کوبوتا"],
  },
  {
    name: "یانمار", nameEn: "Yanmar", country: "Japan",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE", "ENGINES"],
    aliases: ["یانمار"],
  },
  {
    name: "واکر نویزون", nameEn: "Wacker Neuson", country: "Germany",
    industries: ["CONSTRUCTION_MACHINERY", "CONCRETE_ASPHALT"],
    aliases: ["واکر نویزون"],
  },
  {
    name: "باب‌کت", nameEn: "Bobcat", country: "USA",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE", "ATTACHMENTS", "MATERIAL_HANDLING"],
    aliases: ["باب‌کت"],
  },
  { name: "مکالاک", nameEn: "Mecalac", country: "France", industries: ["CONSTRUCTION_MACHINERY"], aliases: ["مکالاک"] },
  {
    name: "هیدرومک", nameEn: "Hidromek", country: "Turkey",
    industries: ["CONSTRUCTION_MACHINERY", "ROAD_MACHINERY"],
    aliases: ["هیدرومک"],
  },
  {
    name: "سان‌وارد", nameEn: "Sunward", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "DRILLING"],
    aliases: ["سان‌وارد"],
  },
  {
    name: "لوول", nameEn: "Lovol", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE"],
    aliases: ["لوول"],
  },
  {
    name: "ایکس‌جی‌ام‌ای", nameEn: "XGMA", country: "China",
    industries: ["CONSTRUCTION_MACHINERY"],
    aliases: ["XGMA"],
  },
  {
    name: "شاف", nameEn: "Schaeff", family: "schaeffler-group", country: "Germany",
    industries: ["CONSTRUCTION_MACHINERY"],
    aliases: ["شاف"],
  },
  {
    name: "آتلس", nameEn: "Atlas", country: "Germany",
    industries: ["CONSTRUCTION_MACHINERY", "DRILLING"],
    aliases: ["آتلس"],
  },
  {
    name: "ترکس", nameEn: "Terex", country: "USA",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY", "LIFTING", "MATERIAL_HANDLING", "QUARRY_CRUSHING"],
    aliases: ["ترکس"],
  },
  {
    name: "بل", nameEn: "Bell Equipment", slug: "bell", country: "South Africa",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY"],
    aliases: ["بل"],
  },
  { name: "درستا", nameEn: "Dressta", country: "Poland", industries: ["CONSTRUCTION_MACHINERY"], aliases: ["درستا"] },
  {
    name: "ماهیندرا ساختمانی", nameEn: "Mahindra Construction", country: "India",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE"],
    aliases: ["ماهیندرا"],
  },
  {
    name: "اسکورتس کوبوتا", nameEn: "Escorts Kubota", country: "India",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE"],
    aliases: ["اسکورتس کوبوتا"],
  },
  {
    name: "هیوندای اوردیگم", nameEn: "Hyundai Everdigm",
    family: "hyundai-heavy-industries", country: "South Korea",
    industries: ["CONSTRUCTION_MACHINERY"],
    aliases: ["اوردیگم"],
  },
  {
    name: "لانگ‌کینگ", nameEn: "Lonking", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "MATERIAL_HANDLING"],
    aliases: ["لانگ‌کینگ"],
  },
  {
    name: "فوتن لوول", nameEn: "Foton Lovol", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE"],
    aliases: ["فوتن لوول"],
  },
  {
    name: "سانی پالفینگر", nameEn: "Sany Palfinger", country: "China",
    industries: ["CONSTRUCTION_MACHINERY", "LIFTING"],
    aliases: ["سانی پالفینگر"],
  },

  // ─────────────────────────────────────────────────────────
  // §9 MINING MACHINERY (new brands only — Caterpillar/Komatsu/Hitachi/Liebherr/Volvo CE/SANY/XCMG/Terex already seeded in §8 with MINING_MACHINERY industry)
  // Komatsu & Liebherr already upserted above → safe to use as parents
  // ─────────────────────────────────────────────────────────
  { name: "بل‌آز", nameEn: "BelAZ", country: "Belarus", industries: ["MINING_MACHINERY"], aliases: ["بل‌آز"] },
  { name: "اپیروک", nameEn: "Epiroc", country: "Sweden", industries: ["MINING_MACHINERY", "DRILLING"], aliases: ["اپیروک"] },
  {
    name: "ساندویک", nameEn: "Sandvik", family: "sandvik-group", country: "Sweden",
    industries: ["MINING_MACHINERY", "QUARRY_CRUSHING", "DRILLING"],
    aliases: ["ساندویک"],
  },
  { name: "نورمت", nameEn: "Normet", country: "Finland", industries: ["MINING_MACHINERY"], aliases: ["نورمت"] },
  { name: "مک‌لین", nameEn: "MacLean", country: "Canada", industries: ["MINING_MACHINERY"], aliases: ["مک‌لین"] },
  {
    name: "بوارت لانگ‌یر", nameEn: "Boart Longyear", country: "USA",
    industries: ["MINING_MACHINERY", "DRILLING"],
    aliases: ["بوارت لانگ‌یر"],
  },
  {
    name: "فوروکاوا", nameEn: "Furukawa", country: "Japan",
    industries: ["MINING_MACHINERY", "DRILLING", "ATTACHMENTS"],
    aliases: ["فوروکاوا"],
  },
  {
    name: "کوماتسو معدنی", nameEn: "Komatsu Mining", parent: "komatsu", family: "komatsu-ltd", country: "USA",
    industries: ["MINING_MACHINERY"],
    aliases: ["کوماتسو معدنی"],
  },
  { name: "جوی", nameEn: "Joy", country: "USA", status: "LEGACY", industries: ["MINING_MACHINERY"], aliases: ["جوی"] },
  { name: "پی‌اند‌اچ", nameEn: "P&H", country: "USA", status: "LEGACY", industries: ["MINING_MACHINERY"], aliases: ["P&H", "پی‌اند‌اچ"] },
  { name: "لتورنو", nameEn: "LeTourneau", country: "USA", status: "LEGACY", industries: ["MINING_MACHINERY"], aliases: ["لتورنو"] },
  { name: "بوکراس", nameEn: "Bucyrus", country: "USA", status: "LEGACY", industries: ["MINING_MACHINERY"], aliases: ["بوکراس"] },
  { name: "بیمل", nameEn: "BEML", country: "India", industries: ["MINING_MACHINERY"], aliases: ["بیمل"] },
  { name: "ان‌ام‌دی‌سی", nameEn: "NMDC", country: "India", industries: ["MINING_MACHINERY"], aliases: ["ان‌ام‌دی‌سی"] },
  {
    name: "تاتا هیتاچی", nameEn: "Tata Hitachi", country: "India",
    industries: ["MINING_MACHINERY", "CONSTRUCTION_MACHINERY"],
    aliases: ["تاتا هیتاچی"],
  },
  { name: "هندوستان", nameEn: "Hindustan", country: "India", industries: ["MINING_MACHINERY"], aliases: ["هندوستان"] },
  {
    name: "لیبهر معدنی", nameEn: "Liebherr Mining", parent: "liebherr", family: "liebherr-group", country: "Germany",
    industries: ["MINING_MACHINERY"],
    aliases: ["لیبهر معدنی"],
  },

  // ─────────────────────────────────────────────────────────
  // §10 DRILLING (new brands — Epiroc/Sandvik/Boart Longyear/Furukawa already in §9 with DRILLING; Sunward/XCMG/SANY/Zoomlion already in §8 with DRILLING)
  // ─────────────────────────────────────────────────────────
  {
    name: "آتلس کوپکو", nameEn: "Atlas Copco", family: "atlas-copco-group", country: "Sweden",
    industries: ["DRILLING", "COMPRESSORS"],
    aliases: ["آتلس کوپکو"],
  },
  { name: "جونتان", nameEn: "Junttan", country: "Finland", industries: ["DRILLING"], aliases: ["جونتان"] },
  { name: "سویلمک", nameEn: "Soilmec", country: "Italy", industries: ["DRILLING"], aliases: ["سویلمک"] },
  { name: "کازاگرانده", nameEn: "Casagrande", country: "Italy", industries: ["DRILLING"], aliases: ["کازاگرانده"] },
  { name: "کوماکیو", nameEn: "Comacchio", country: "Italy", industries: ["DRILLING"], aliases: ["کوماکیو"] },
  { name: "کلم", nameEn: "Klemm", country: "Germany", industries: ["DRILLING"], aliases: ["کلم"] },
  { name: "باور", nameEn: "Bauer", country: "Germany", industries: ["DRILLING"], aliases: ["باور"] },
  { name: "مایت", nameEn: "Mait", country: "Italy", industries: ["DRILLING"], aliases: ["مایت"] },
  { name: "فراسته", nameEn: "Fraste", country: "Italy", industries: ["DRILLING"], aliases: ["فراسته"] },
  { name: "داندو", nameEn: "Dando", country: "UK", industries: ["DRILLING"], aliases: ["داندو"] },
  { name: "شرام", nameEn: "Schramm", country: "USA", industries: ["DRILLING"], aliases: ["شرام"] },
  {
    name: "ورمیر", nameEn: "Vermeer", country: "USA",
    industries: ["DRILLING", "WASTE_RECYCLING", "FORESTRY"],
    aliases: ["ورمیر"],
  },
  { name: "فورموست", nameEn: "Foremost", country: "Canada", industries: ["DRILLING"], aliases: ["فورموست"] },
  { name: "جئوپروب", nameEn: "Geoprobe", country: "USA", industries: ["DRILLING"], aliases: ["جئوپروب"] },
  { name: "پی‌آر‌دی", nameEn: "PRD", country: "Canada", industries: ["DRILLING"], aliases: ["PRD"] },
  { name: "کایشان", nameEn: "Kaishan", country: "China", industries: ["DRILLING", "COMPRESSORS"], aliases: ["کایشان"] },

  // ─────────────────────────────────────────────────────────
  // §11 QUARRY / CRUSHING
  // NOTE: Wirtgen at top (Wirtgen Group owns Kleemann).
  // Sandvik (already in §9 with QUARRY_CRUSHING), Terex (already in §8 with QUARRY_CRUSHING).
  // Wirtgen/Kleemann later add ROAD_MACHINERY (§14) + CONCRETE_ASPHALT (§15) → merged into one definition here.
  // ─────────────────────────────────────────────────────────
  {
    name: "ویرتگن", nameEn: "Wirtgen", country: "Germany",
    industries: ["ROAD_MACHINERY", "QUARRY_CRUSHING", "CONCRETE_ASPHALT"],
    aliases: ["ویرتگن"],
  },
  {
    name: "متسو", nameEn: "Metso", country: "Finland",
    industries: ["QUARRY_CRUSHING", "PUMPS"],
    aliases: ["متسو"],
  },
  {
    name: "اف‌ال‌اسمیت", nameEn: "FLSmidth", country: "Denmark",
    industries: ["QUARRY_CRUSHING"],
    aliases: ["اف‌ال‌اسمیت"],
  },
  {
    name: "ویر", nameEn: "Weir", country: "UK",
    industries: ["QUARRY_CRUSHING", "PUMPS", "OIL_GAS"],
    aliases: ["ویر"],
  },
  {
    name: "مک‌کلوسکی", nameEn: "McCloskey", country: "Ireland",
    industries: ["QUARRY_CRUSHING", "WASTE_RECYCLING"],
    aliases: ["مک‌کلوسکی"],
  },
  { name: "پاوراسکرین", nameEn: "Powerscreen", country: "UK", industries: ["QUARRY_CRUSHING"], aliases: ["پاوراسکرین"] },
  { name: "فینلی", nameEn: "Finlay", country: "UK", industries: ["QUARRY_CRUSHING"], aliases: ["فینلی"] },
  {
    name: "کلمن", nameEn: "Kleemann", country: "Germany",
    industries: ["QUARRY_CRUSHING", "ROAD_MACHINERY", "CONCRETE_ASPHALT"],
    aliases: ["کلمن"],
  },
  { name: "رابل مستر", nameEn: "Rubble Master", country: "Austria", industries: ["QUARRY_CRUSHING"], aliases: ["رابل مستر"] },
  { name: "کیستراک", nameEn: "Keestrack", country: "Belgium", industries: ["QUARRY_CRUSHING"], aliases: ["کیستراک"] },
  {
    name: "استک", nameEn: "Astec", country: "USA",
    industries: ["QUARRY_CRUSHING", "CONCRETE_ASPHALT"],
    aliases: ["استک"],
  },
  { name: "ایگل کراشر", nameEn: "Eagle Crusher", country: "USA", industries: ["QUARRY_CRUSHING"], aliases: ["ایگل کراشر"] },
  { name: "سوپریور اینداستریز", nameEn: "Superior Industries", country: "USA", industries: ["QUARRY_CRUSHING"], aliases: ["سوپریور"] },
  { name: "کی‌پی‌آی-جی‌سی‌آی", nameEn: "KPI-JCI", country: "USA", industries: ["QUARRY_CRUSHING"], aliases: ["KPI-JCI"] },
  { name: "تلسمیت", nameEn: "Telsmith", country: "USA", industries: ["QUARRY_CRUSHING"], aliases: ["تلسمیت"] },
  { name: "اسکرین ماشین", nameEn: "Screen Machine", country: "USA", industries: ["QUARRY_CRUSHING"], aliases: ["اسکرین ماشین"] },
  {
    name: "مکا", nameEn: "Meka", country: "Turkey",
    industries: ["QUARRY_CRUSHING", "CONCRETE_ASPHALT"],
    aliases: ["مکا"],
  },
  { name: "فابو", nameEn: "Fabo", country: "Turkey", industries: ["QUARRY_CRUSHING"], aliases: ["فابو"] },
  { name: "هازماگ", nameEn: "Hazemag", country: "Germany", industries: ["QUARRY_CRUSHING"], aliases: ["هازماگ"] },
  {
    name: "تیسن‌کروپ", nameEn: "ThyssenKrupp", country: "Germany",
    industries: ["QUARRY_CRUSHING", "STEEL_FACTORY"],
    aliases: ["تیسن‌کروپ"],
  },
  { name: "اس‌آر‌اچ", nameEn: "SRH", country: "Germany", industries: ["QUARRY_CRUSHING"], aliases: ["SRH"] },
  { name: "لایمینگ", nameEn: "Liming", country: "China", industries: ["QUARRY_CRUSHING"], aliases: ["لایمینگ"] },
  { name: "هنان دایا", nameEn: "Henan Deya", country: "China", industries: ["QUARRY_CRUSHING"], aliases: ["هنان دایا"] },
  { name: "اس‌بی‌ام", nameEn: "SBM", country: "Austria", industries: ["QUARRY_CRUSHING"], aliases: ["SBM"] },
  { name: "دینگ‌شنگ", nameEn: "Dingsheng", country: "China", industries: ["QUARRY_CRUSHING"], aliases: ["دینگ‌شنگ"] },

  // ─────────────────────────────────────────────────────────
  // §12 LIFTING / CRANES (new brands — Liebherr/Kobelco/Sumitomo/XCMG/SANY/Zoomlion/Terex already seeded with LIFTING)
  // ─────────────────────────────────────────────────────────
  { name: "مانیتووک", nameEn: "Manitowoc", country: "USA", industries: ["LIFTING"], aliases: ["مانیتووک"] },
  { name: "گروو", nameEn: "Grove", country: "USA", industries: ["LIFTING"], aliases: ["گروو"] },
  { name: "پوتن", nameEn: "Potain", country: "France", industries: ["LIFTING"], aliases: ["پوتن"] },
  { name: "تادانو", nameEn: "Tadano", country: "Japan", industries: ["LIFTING"], aliases: ["تادانو"] },
  { name: "کاتو", nameEn: "Kato", country: "Japan", industries: ["LIFTING"], aliases: ["کاتو"] },
  { name: "دمگ", nameEn: "Demag", country: "Germany", industries: ["LIFTING"], aliases: ["دمگ"] },
  {
    name: "زنه‌بوگن", nameEn: "Sennebogen", country: "Germany",
    industries: ["LIFTING", "MATERIAL_HANDLING"],
    aliases: ["زنه‌بوگن"],
  },
  { name: "لینک-بلت", nameEn: "Link-Belt", country: "USA", industries: ["LIFTING"], aliases: ["لینک-بلت"] },
  {
    name: "پالفینگر", nameEn: "Palfinger", country: "Austria",
    industries: ["LIFTING", "RAILWAY"],
    aliases: ["پالفینگر"],
  },
  { name: "هیاب", nameEn: "Hiab", country: "Sweden", industries: ["LIFTING"], aliases: ["هیاب"] },
  { name: "فسی", nameEn: "Fassi", country: "Italy", industries: ["LIFTING"], aliases: ["فسی"] },
  { name: "افر", nameEn: "Effer", country: "Italy", industries: ["LIFTING"], aliases: ["افر"] },
  { name: "پی‌ام", nameEn: "PM", country: "Italy", industries: ["LIFTING"], aliases: ["PM"] },
  {
    name: "کارگوتک", nameEn: "Cargotec", country: "Finland",
    industries: ["LIFTING", "MATERIAL_HANDLING"],
    aliases: ["کارگوتک"],
  },
  {
    name: "کالما", nameEn: "Kalmar", country: "Finland",
    industries: ["LIFTING", "MATERIAL_HANDLING", "MARINE"],
    aliases: ["کالما"],
  },
  { name: "جی‌ال‌جی", nameEn: "JLG", country: "USA", industries: ["LIFTING"], aliases: ["جی‌ال‌جی"] },
  { name: "جنی", nameEn: "Genie", country: "USA", industries: ["LIFTING"], aliases: ["جنی"] },
  { name: "هولوت", nameEn: "Haulotte", country: "France", industries: ["LIFTING"], aliases: ["هولوت"] },
  {
    name: "مانیتو", nameEn: "Manitou", country: "France",
    industries: ["LIFTING", "MATERIAL_HANDLING", "AGRICULTURE"],
    aliases: ["مانیتو"],
  },
  { name: "ماگنی", nameEn: "Magni", country: "Italy", industries: ["LIFTING"], aliases: ["ماگنی"] },
  {
    name: "مرلو", nameEn: "Merlo", country: "Italy",
    industries: ["LIFTING", "AGRICULTURE", "MATERIAL_HANDLING"],
    aliases: ["مرلو"],
  },

  // ─────────────────────────────────────────────────────────
  // §13 MATERIAL HANDLING / FORKLIFTS (specialists → INDUSTRIAL_BRAND; Komatsu/Doosan/Hyundai/Lonking/Kalmar/Manitou/Merlo/JCB/Bobcat already seeded with MATERIAL_HANDLING)
  // ─────────────────────────────────────────────────────────
  {
    name: "تویوتا", nameEn: "Toyota Material Handling", country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["MATERIAL_HANDLING"],
    aliases: ["تویوتا"],
  },
  { name: "کیون", nameEn: "KION", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["کیون"] },
  { name: "لینده", nameEn: "Linde", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["لینده"] },
  { name: "استیل", nameEn: "Still", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["استیل"] },
  {
    name: "یونگ‌هاین‌ریش", nameEn: "Jungheinrich", country: "Germany", type: "INDUSTRIAL_BRAND",
    industries: ["MATERIAL_HANDLING"],
    aliases: ["یونگ‌هاین‌ریش"],
  },
  { name: "هیستر", nameEn: "Hyster", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["هیستر"] },
  { name: "یل", nameEn: "Yale", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["یل"] },
  { name: "کراون", nameEn: "Crown", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["کراون"] },
  { name: "کلارک", nameEn: "Clark", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["کلارک"] },
  {
    name: "میتسوبیشی", nameEn: "Mitsubishi Logisnext", country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["MATERIAL_HANDLING"],
    aliases: ["میتسوبیشی"],
  },
  {
    name: "نیسان فورک‌لیفت", nameEn: "Nissan Forklift", country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["MATERIAL_HANDLING"],
    aliases: ["نیسان فورک‌لیفت"],
  },
  { name: "تی‌سی‌ام", nameEn: "TCM", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["TCM"] },
  { name: "هانگچا", nameEn: "Hangcha", country: "China", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["هانگچا"] },
  { name: "هلی", nameEn: "HELI", country: "China", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["HELI"] },
  { name: "ای‌پی Eq", nameEn: "EP Equipment", country: "China", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["EP Equipment"] },
  { name: "ماکسیمال", nameEn: "Maximal", country: "China", type: "INDUSTRIAL_BRAND", industries: ["MATERIAL_HANDLING"], aliases: ["ماکسیمال"] },

  // ─────────────────────────────────────────────────────────
  // §14 ROAD MACHINERY (new brands only — Caterpillar/Komatsu/Volvo CE/John Deere/CASE/New Holland/LiuGong/XCMG/Shantui/SDLG/SANY/Zoomlion/Sumitomo/Hidromek/JCB already with ROAD_MACHINERY)
  // Bomag/Vögele/Dynapac later add CONCRETE_ASPHALT (§15) → merged here. Ammann appears here before Ammann Group in §15 (parent).
  // ─────────────────────────────────────────────────────────
  {
    name: "داینپاک", nameEn: "Dynapac", country: "Sweden",
    industries: ["ROAD_MACHINERY", "CONCRETE_ASPHALT"],
    aliases: ["داینپاک"],
  },
  {
    name: "بومگ", nameEn: "Bomag", country: "Germany",
    industries: ["ROAD_MACHINERY", "CONCRETE_ASPHALT"],
    aliases: ["بومگ"],
  },
  { name: "هام", nameEn: "Hamm", country: "Germany", industries: ["ROAD_MACHINERY"], aliases: ["هام"] },
  {
    name: "فگله", nameEn: "Vögele", country: "Germany",
    industries: ["ROAD_MACHINERY", "CONCRETE_ASPHALT"],
    aliases: ["فگله"],
  },
  {
    name: "آمان", nameEn: "Ammann", country: "Switzerland",
    industries: ["ROAD_MACHINERY", "CONCRETE_ASPHALT"],
    aliases: ["آمان"],
  },
  { name: "ساکای", nameEn: "Sakai", country: "Japan", industries: ["ROAD_MACHINERY"], aliases: ["ساکای"] },

  // ─────────────────────────────────────────────────────────
  // §15 CONCRETE / ASPHALT (new brands — SANY/Zoomlion/Liebherr/Kleemann/Wirtgen/Vögele/Dynapac/Bomag/Ammann/Astec already with CONCRETE_ASPHALT)
  // Ammann Group → parent: ammann (above in §14)
  // ─────────────────────────────────────────────────────────
  {
    name: "پوتس‌مایستر", nameEn: "Putzmeister", country: "Germany",
    industries: ["CONCRETE_ASPHALT", "PUMPS"],
    aliases: ["پوتس‌مایستر"],
  },
  { name: "شوینگ", nameEn: "Schwing", country: "Germany", industries: ["CONCRETE_ASPHALT"], aliases: ["شوینگ"] },
  { name: "چیفا", nameEn: "CIFA", country: "Italy", industries: ["CONCRETE_ASPHALT"], aliases: ["چیفا"] },
  { name: "کی‌سی‌پی", nameEn: "KCP", country: "South Korea", industries: ["CONCRETE_ASPHALT"], aliases: ["KCP"] },
  { name: "جونجین", nameEn: "Junjin", country: "South Korea", industries: ["CONCRETE_ASPHALT"], aliases: ["جونجین"] },
  {
    name: "مک", nameEn: "Mack", country: "USA",
    industries: ["CONCRETE_ASPHALT", "TRUCKS"],
    aliases: ["مک"],
  },
  { name: "سرماک", nameEn: "Sermac", country: "Italy", industries: ["CONCRETE_ASPHALT"], aliases: ["سرماک"] },
  { name: "مارینی", nameEn: "Marini", country: "Italy", industries: ["CONCRETE_ASPHALT"], aliases: ["مارینی"] },
  {
    name: "آمان گروپ", nameEn: "Ammann Group", parent: "ammann", country: "Switzerland",
    industries: ["CONCRETE_ASPHALT"],
    aliases: ["آمان گروپ"],
  },
  { name: "فایات", nameEn: "Fayat", country: "France", industries: ["CONCRETE_ASPHALT"], aliases: ["فایات"] },
  { name: "بنینگهوون", nameEn: "Benninghoven", country: "Germany", industries: ["CONCRETE_ASPHALT"], aliases: ["بنینگهوون"] },

  // ─────────────────────────────────────────────────────────
  // §16 AGRICULTURE (parents first: CNH → Case IH / New Holland Agriculture ; AGCO → Fendt / Massey Ferguson / Valtra / Challenger ; Deutz → Deutz-Fahr)
  // John Deere/Kubota/Yanmar/Lovol already seeded with AGRICULTURE.
  // Zoomlion already in §8 — used as parent for Zoomlion Agriculture below.
  // ─────────────────────────────────────────────────────────
  {
    name: "سی‌ان‌اچ", nameEn: "CNH", family: "cnh-industrial", country: "Italy", type: "CORPORATE_BRAND",
    industries: ["AGRICULTURE"],
    aliases: ["CNH"],
  },
  {
    name: "کیس آچ", nameEn: "Case IH", family: "cnh-industrial", country: "USA",
    industries: ["AGRICULTURE"],
    aliases: ["کیس ایچ"],
  },
  {
    name: "نیو هالند کشاورزی", nameEn: "New Holland Agriculture", family: "cnh-industrial", country: "USA",
    industries: ["AGRICULTURE"],
    aliases: ["نیو هالند کشاورزی"],
  },
  {
    name: "نیو هالند", nameEn: "New Holland", family: "cnh-industrial", country: "USA",
    industries: ["AGRICULTURE"],
    aliases: ["نیو هالند"],
  },
  {
    name: "ای‌جی‌سی‌او", nameEn: "AGCO", family: "agco-corporation", country: "USA", type: "CORPORATE_BRAND",
    industries: ["AGRICULTURE"],
    aliases: ["AGCO"],
  },
  {
    name: "فندت", nameEn: "Fendt", family: "agco-corporation", country: "Germany",
    industries: ["AGRICULTURE"],
    aliases: ["فندت"],
  },
  {
    name: "مسی‌فرگوسن", nameEn: "Massey Ferguson", family: "agco-corporation", country: "USA",
    industries: ["AGRICULTURE"],
    aliases: ["مسی‌فرگوسن"],
  },
  {
    name: "والترا", nameEn: "Valtra", family: "agco-corporation", country: "Finland",
    industries: ["AGRICULTURE"],
    aliases: ["والترا"],
  },
  {
    name: "چلنجر", nameEn: "Challenger", family: "agco-corporation", country: "USA",
    industries: ["AGRICULTURE"],
    aliases: ["چلنجر"],
  },
  { name: "کلاس", nameEn: "Claas", country: "Germany", industries: ["AGRICULTURE"], aliases: ["کلاس"] },
  {
    name: "دویتز", nameEn: "Deutz", country: "Germany", type: "ENGINE_BRAND",
    industries: ["AGRICULTURE", "ENGINES"],
    aliases: ["دویتز"],
  },
  {
    name: "دویتز-فار", nameEn: "Deutz-Fahr", parent: "deutz", country: "Germany",
    industries: ["AGRICULTURE"],
    aliases: ["دویتز-فار"],
  },
  { name: "سام", nameEn: "Same", country: "Italy", industries: ["AGRICULTURE"], aliases: ["سام"] },
  { name: "لمبورگینی تراتوری", nameEn: "Lamborghini Trattori", country: "Italy", industries: ["AGRICULTURE"], aliases: ["لمبورگینی تراکتور"] },
  { name: "مک‌کورمیک", nameEn: "McCormick", country: "UK", industries: ["AGRICULTURE"], aliases: ["مک‌کورمیک"] },
  { name: "لاندینی", nameEn: "Landini", country: "Italy", industries: ["AGRICULTURE"], aliases: ["لاندینی"] },
  { name: "ایسکی", nameEn: "Iseki", country: "Japan", industries: ["AGRICULTURE"], aliases: ["ایسکی"] },
  { name: "ماهیندرا", nameEn: "Mahindra", country: "India", industries: ["AGRICULTURE"], aliases: ["ماهیندرا"] },
  { name: "سونالیکا", nameEn: "Sonalika", country: "India", industries: ["AGRICULTURE"], aliases: ["سونالیکا"] },
  { name: "تاف", nameEn: "TAFE", country: "India", industries: ["AGRICULTURE"], aliases: ["TAFE"] },
  {
    name: "زوملایون کشاورزی", nameEn: "Zoomlion Agriculture", parent: "zoomlion", country: "China",
    industries: ["AGRICULTURE"],
    aliases: ["زوملایون کشاورزی"],
  },
  { name: "دونگ‌فنگ", nameEn: "Dongfeng", country: "China", industries: ["AGRICULTURE"], aliases: ["دونگ‌فنگ"] },
  { name: "فوتن", nameEn: "Foton", country: "China", industries: ["AGRICULTURE"], aliases: ["فوتن"] },
  {
    name: "بلاروس", nameEn: "Belarus / MTZ", slug: "belarus-mtz", country: "Belarus",
    industries: ["AGRICULTURE"],
    aliases: ["بلاروس", "MTZ", "ام‌تی‌زد"],
  },
  { name: "زتور", nameEn: "Zetor", country: "Czech", industries: ["AGRICULTURE"], aliases: ["زتور"] },
  { name: "فارمترک", nameEn: "Farmtrac", country: "India", industries: ["AGRICULTURE"], aliases: ["فارمترک"] },
  { name: "سولیس", nameEn: "Solis", country: "Spain", industries: ["AGRICULTURE"], aliases: ["سولیس"] },
  { name: "کیوتی", nameEn: "Kioti", country: "South Korea", industries: ["AGRICULTURE"], aliases: ["کیوتی"] },
  { name: "ال‌اس تراکتور", nameEn: "LS Tractor", country: "South Korea", industries: ["AGRICULTURE"], aliases: ["ال‌اس تراکتور"] },
  { name: "آربوس", nameEn: "Arbos", country: "China", industries: ["AGRICULTURE"], aliases: ["آربوس"] },
  { name: "کارارو", nameEn: "Carraro", country: "Italy", industries: ["AGRICULTURE"], aliases: ["کارارو"] },
  {
    name: "بی‌کی‌تی", nameEn: "BKT", country: "India", type: "TIRE_BRAND",
    industries: ["AGRICULTURE", "TIRES"],
    aliases: ["BKT", "بی‌کی‌تی"],
  },

  // ─────────────────────────────────────────────────────────
  // §17 FORESTRY (new brands — John Deere/Caterpillar/Volvo CE/Hitachi/Liebherr/JCB/Vermeer already with FORESTRY)
  // Komatsu already in §8 — used as parent for Komatsu Forest below.
  // ─────────────────────────────────────────────────────────
  {
    name: "کوماتسو فورست", nameEn: "Komatsu Forest", parent: "komatsu", family: "komatsu-ltd", country: "Sweden",
    industries: ["FORESTRY"],
    aliases: ["کوماتسو فورست"],
  },
  { name: "پونسه", nameEn: "Ponsse", country: "Finland", industries: ["FORESTRY"], aliases: ["پونسه"] },
  { name: "روتنه", nameEn: "Rottne", country: "Sweden", industries: ["FORESTRY"], aliases: ["روتنه"] },
  { name: "تایگرکت", nameEn: "Tigercat", country: "Canada", industries: ["FORESTRY"], aliases: ["تایگرکت"] },
  { name: "لاگست", nameEn: "Logset", country: "Finland", industries: ["FORESTRY"], aliases: ["لاگست"] },
  { name: "کسلا", nameEn: "Kesla", country: "Finland", industries: ["FORESTRY"], aliases: ["کسلا"] },
  { name: "واراتا", nameEn: "Waratah", country: "New Zealand", industries: ["FORESTRY"], aliases: ["واراتا"] },
  { name: "تیمبرپرو", nameEn: "TimberPro", country: "USA", industries: ["FORESTRY"], aliases: ["تیمبرپرو"] },
  {
    name: "باندیت", nameEn: "Bandit", country: "USA",
    industries: ["FORESTRY", "WASTE_RECYCLING"],
    aliases: ["باندیت"],
  },
];

// ════════════════════════════════════════════════════════════
// UPSERT HELPERS
// ════════════════════════════════════════════════════════════
async function upsertBrand(b: BrandSeed) {
  const slug = b.slug ?? slugifyEn(b.nameEn);
  const type = b.type ?? "MACHINE_BRAND";
  const status = b.status ?? "ACTIVE";

  const brand = await db.brand.upsert({
    where: { slug },
    create: {
      name: b.name,
      nameEn: b.nameEn,
      slug,
      country: b.country ?? null,
      type,
      status,
      verification: "DATABASE_VERIFIED",
      website: b.website ?? null,
      featured: !!b.featured,
      brandFamily: b.family ? { connect: { slug: b.family } } : undefined,
      parentBrand: b.parent ? { connect: { slug: b.parent } } : undefined,
    },
    update: {
      name: b.name,
      nameEn: b.nameEn,
      country: b.country ?? null,
      type,
      status,
      verification: "DATABASE_VERIFIED",
      website: b.website ?? null,
      featured: !!b.featured,
      brandFamily: b.family ? { connect: { slug: b.family } } : undefined,
      parentBrand: b.parent ? { connect: { slug: b.parent } } : undefined,
    },
  });

  // Industries — upsert each (idempotent; never removes existing rows)
  for (const ind of b.industries) {
    await db.brandIndustry.upsert({
      where: { brandId_industry: { brandId: brand.id, industry: ind } },
      create: { brandId: brand.id, industry: ind },
      update: {},
    });
  }

  // Aliases — upsert by [brandId, normalizedValue]
  if (b.aliases) {
    for (const a of b.aliases) {
      const norm = normalizeAlias(a);
      if (!norm) continue;
      const language =
        /[a-zA-Z]/.test(a) && /[\u0600-\u06FF]/.test(a)
          ? "mixed"
          : /[\u0600-\u06FF]/.test(a)
          ? "fa"
          : "en";
      await db.brandAlias.upsert({
        where: { brandId_normalizedValue: { brandId: brand.id, normalizedValue: norm } },
        create: {
          brandId: brand.id,
          value: a,
          normalizedValue: norm,
          language,
          type: "COMMON",
          confidence: 80,
        },
        update: {},
      });
    }
  }

  return brand;
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
async function main() {
  console.log("Seeding industries...");
  for (const ind of INDUSTRIES) {
    await db.industry.upsert({ where: { key: ind.key }, create: ind, update: ind });
  }
  console.log(`  ✓ ${INDUSTRIES.length} industries`);

  console.log("Seeding families...");
  for (const f of FAMILIES) {
    await db.brandFamily.upsert({ where: { slug: f.slug }, create: f, update: f });
  }
  console.log(`  ✓ ${FAMILIES.length} families`);

  console.log("Seeding brands (Phase A: industries 1-10)...");
  let i = 0;
  for (const b of BRANDS) {
    try {
      await upsertBrand(b);
    } catch (e: any) {
      console.error(`  ✗ Failed on brand "${b.nameEn}" (slug=${b.slug ?? slugifyEn(b.nameEn)}): ${e.message}`);
      throw e;
    }
    i++;
    if (i % 50 === 0) console.log(`  ${i}/${BRANDS.length}`);
  }
  console.log(`✓ ${BRANDS.length} brands`);

  const counts = await Promise.all([
    db.brand.count(),
    db.brandAlias.count(),
    db.brandFamily.count(),
    db.industry.count(),
    db.brandIndustry.count(),
  ]);
  console.log(
    JSON.stringify({
      brands: counts[0],
      aliases: counts[1],
      families: counts[2],
      industries: counts[3],
      brandIndustries: counts[4],
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
