/* HEAVIX — Catalog Seed (P0-CATALOG-SEED)
   Seeds the empty catalog entities: ProductModel, Product, Attachment, Part,
   Machine, CompatibilityEdge.

   CRITICAL RULES:
   - Look up brand IDs from DB (by slug). Never hardcode IDs.
   - Look up category IDs from DB (by slug). Never hardcode IDs.
   - Use upsert by natural key for full idempotency:
       • ProductModel: upsert by (brandId, slug)  [@@unique([brandId, slug])]
       • Product:      upsert by slug              [@unique]
       • Attachment:   upsert by (productId, attachmentType) — via findFirst/upsert pattern
       • Part:         upsert by (productId, partNumber)    — via findFirst/upsert pattern
       • Machine:      upsert by (productId, serialNumber)
       • CompatibilityEdge: upsert by composite key
         (@@unique([sourceEntityType, sourceEntityId, targetEntityType, targetEntityId, relationType]))
   - NEVER delete existing rows. Additive only.
   - Status defaults: ProductModel.status="ACTIVE", Product.status="ACTIVE".

   Run:  bunx tsx prisma/seed-catalog.ts
   or:   bun run db:seed-catalog
*/
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const slugifyEn = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

/** Brand slugs we expect to already exist in the DB. */
const BRAND_SLUGS = {
  caterpillar: "caterpillar",
  komatsu: "komatsu",
  volvo: "volvo-ce",
  hitachi: "hitachi",
  liebherr: "liebherr",
  jcb: "jcb",
  doosan: "doosan",
  bobcat: "bobcat",
  sany: "sany",
} as const;

type BrandKey = keyof typeof BRAND_SLUGS;

/** Category slugs we expect to already exist in the DB. */
const CATEGORY_SLUGS = {
  excavator: "excavator",
  loader: "loader",
  bulldozer: "bulldozer",
  grader: "grader",
  backhoeLoader: "backhoe-loader",
  crane: "crane",
  dumpTruck: "dump-truck",
  miniExcavator: "mini-excavator",
  wheelLoader: "wheel-loader",
  skidSteerLoader: "skid-steer-loader",
  miningDumpTruck: "mining-dump-truck",
} as const;

type CategoryKey = keyof typeof CATEGORY_SLUGS;

// ────────────────────────────────────────────────────────────
// 1) PRODUCT MODELS — 35 models across 9 brands
// ────────────────────────────────────────────────────────────
type ModelSeed = {
  brand: BrandKey;
  name: string;        // Persian/display name (we use the OEM code, e.g. "320D")
  nameEn: string;      // English name
  category: CategoryKey;
  description?: string;
};

const MODELS: ModelSeed[] = [
  // ── Caterpillar (11) ───────────────────────────────────────
  { brand: "caterpillar", name: "320D",  nameEn: "Caterpillar 320D",  category: "excavator",  description: "کاترپیلار ۳۲۰دی — بیل مکانیکی زنجیری ۲۰ تنی، نسل دی. موتور C6.4 ACERT، وزن عملیاتی ~۲۰٬۵۰۰ کیلوگرم." },
  { brand: "caterpillar", name: "320F",  nameEn: "Caterpillar 320F",  category: "excavator",  description: "کاترپیلار ۳۲۰اف — بیل مکانیکی زنجیری نسل اف با موتور C4.4 ACERT و مصرف سوخت بهینه." },
  { brand: "caterpillar", name: "320G",  nameEn: "Caterpillar 320G",  category: "excavator",  description: "کاترپیلار ۳۲۰جی — نسل جی با کابین بزرگ‌تر، سیستم GRADE و PAYLOAD." },
  { brand: "caterpillar", name: "330D",  nameEn: "Caterpillar 330D",  category: "excavator",  description: "کاترپیلار ۳۳۰دی — بیل مکانیکی ۳۰ تنی با موتور C9 ACERT." },
  { brand: "caterpillar", name: "336F",  nameEn: "Caterpillar 336F",  category: "excavator",  description: "کاترپیلار ۳۳۶اف — بیل مکانیکی ۳۶ تنی نسل اف با فناوری هیبریدی اختیاری." },
  { brand: "caterpillar", name: "966H",  nameEn: "Caterpillar 966H",  category: "loader",     description: "کاترپیلار ۹۶۶اچ — لودر چرخ‌دار متوسط با موتور ۱۷۵ اسب بخار." },
  { brand: "caterpillar", name: "966M",  nameEn: "Caterpillar 966M",  category: "loader",     description: "کاترپیلار ۹۶۶ام — لودر چرخ‌دار نسل ام با گیربکس اتوماتیک و سیستم PAYLOAD." },
  { brand: "caterpillar", name: "D6R",   nameEn: "Caterpillar D6R",   category: "bulldozer", description: "کاترپیلار دی‌۶آر — بولدوزر زنجیری ۱۸ تنی با تیغه SU و موتور ۳۱۷۶C." },
  { brand: "caterpillar", name: "D6T",   nameEn: "Caterpillar D6T",   category: "bulldozer", description: "کاترپیلار دی‌۶تی — نسل تی با کابین جوگریدر و سیستم GRADE." },
  { brand: "caterpillar", name: "140K",  nameEn: "Caterpillar 140K",  category: "grader",     description: "کاترپیلار ۱۴۰کی — موتورگریدر با تیغه ۱۲ فوت و موتور C7 ACERT." },
  { brand: "caterpillar", name: "140M",  nameEn: "Caterpillar 140M",  category: "grader",     description: "کاترپیلار ۱۴۰ام — نسل ام با کنترل ALL-WHEEL و سیستم GRADE." },
  // ── Komatsu (7) ───────────────────────────────────────────
  { brand: "komatsu", name: "PC210-8", nameEn: "Komatsu PC210-8", category: "excavator",  description: "کوماتسو PC210-8 — بیل مکانیکی ۲۰ تنی با موتور SAA6D107E-1 و سیستم液压 PC." },
  { brand: "komatsu", name: "PC220-8", nameEn: "Komatsu PC220-8", category: "excavator",  description: "کوماتسو PC220-8 — بیل مکانیکی ۲۲ تنی با سیستم HYDRAULICS CLOSED-CENTER." },
  { brand: "komatsu", name: "PC300-8", nameEn: "Komatsu PC300-8", category: "excavator",  description: "کوماتسو PC300-8 — بیل مکانیکی ۳۰ تنی برای کار سنگین." },
  { brand: "komatsu", name: "WA380-6", nameEn: "Komatsu WA380-6", category: "loader",     description: "کوماتسو WA380-6 — لودر چرخ‌دار ۵ متر مکعبی با گیربکس ۴ دنده اتوماتیک." },
  { brand: "komatsu", name: "WA470-5", nameEn: "Komatsu WA470-5", category: "loader",     description: "کوماتسو WA470-5 — لودر چرخ‌دار ۳.۵ متر مکعبی با سیستم гидравлик Variable." },
  { brand: "komatsu", name: "D85A",    nameEn: "Komatsu D85A",    category: "bulldozer", description: "کوماتسو D85A-18 — بولدوزر زنجیری ۲۳ تنی با موتور NT855." },
  { brand: "komatsu", name: "GD825A",  nameEn: "Komatsu GD825A",  category: "grader",     description: "کوماتسو GD825A-2 — موتورگریدر با تیغه ۱۴ فوت و گیربکس ۸ دنده." },
  // ── Volvo CE (4) ──────────────────────────────────────────
  { brand: "volvo", name: "EC220D",  nameEn: "Volvo EC220D",  category: "excavator", description: "وولوو EC220D — بیل مکانیکی ۲۲ تنی با موتور D6 و سیستم OPTISHIFT." },
  { brand: "volvo", name: "EC380D",  nameEn: "Volvo EC380D",  category: "excavator", description: "وولوو EC380D — بیل مکانیکی ۳۸ تنی برای معدن." },
  { brand: "volvo", name: "L120H",   nameEn: "Volvo L120H",   category: "loader",    description: "وولوو L120H — لودر چرخ‌دار نسل اچ با موتور D6 و سیستم Torque Parallel." },
  { brand: "volvo", name: "A40G",    nameEn: "Volvo A40G",    category: "dumpTruck", description: "وولوو A40G — دامپتراک articulated ۴۰ تنی با گیربکس ۸ دنده." },
  // ── Hitachi (2) ───────────────────────────────────────────
  { brand: "hitachi", name: "ZX210LC", nameEn: "Hitachi ZX210LC", category: "excavator", description: "هیتاچی ZX210LC — بیل مکانیکی ۲۱ تنی با موتور Isuzu AA-6BG1T." },
  { brand: "hitachi", name: "ZX350LC", nameEn: "Hitachi ZX350LC", category: "excavator", description: "هیتاچی ZX350LC — بیل مکانیکی ۳۵ تنی برای کار سنگین معدنی." },
  // ── Liebherr (3) ──────────────────────────────────────────
  { brand: "liebherr", name: "R924",   nameEn: "Liebherr R924",   category: "excavator", description: "لیبهر R924 — بیل مکانیکی ۲۵ تنی با موتور D9346 A6." },
  { brand: "liebherr", name: "LR1100", nameEn: "Liebherr LR1100", category: "crane",     description: "لیبهر LR1100 — جرثقیل لاتیس بوم ردیاب ۱۰۰ تنی." },
  { brand: "liebherr", name: "280EC-H", nameEn: "Liebherr 280EC-H", category: "crane",   description: "لیبهر 280EC-H — جرثقیل برجی صنعتی ۱۲۵ متری." },
  // ── JCB (2) ───────────────────────────────────────────────
  { brand: "jcb", name: "3CX",   nameEn: "JCB 3CX",   category: "backhoeLoader", description: "جی‌سی‌بی 3CX — بکهو لودر با ۴ چرخ محرک و موتور ۱۰۰ اسب بخار." },
  { brand: "jcb", name: "JS220", nameEn: "JCB JS220", category: "excavator",     description: "جی‌سی‌بی JS220 — بیل مکانیکی ۲۲ تنی با موتور Isuzu." },
  // ── Doosan (2) ────────────────────────────────────────────
  { brand: "doosan", name: "DX255", nameEn: "Doosan DX255", category: "excavator", description: "دوسان DX255 — بیل مکانیکی ۲۵ تنی با موتور D7E." },
  { brand: "doosan", name: "DL550", nameEn: "Doosan DL550", category: "loader",    description: "دوسان DL550 — لودر چرخ‌دار ۳.۵ متر مکعبی." },
  // ── Bobcat (2) ────────────────────────────────────────────
  { brand: "bobcat", name: "E35",  nameEn: "Bobcat E35",  category: "miniExcavator", description: "بابکت E35 — مینی بیل ۳.۵ تنی با موتور Kubota." },
  { brand: "bobcat", name: "S650", nameEn: "Bobcat S650", category: "loader",       description: "بابکت S650 — اسکید استیر لودر ۷۵ اسب بخار." },
  // ── Sany (2) ──────────────────────────────────────────────
  { brand: "sany", name: "SY215C",  nameEn: "Sany SY215C",  category: "excavator", description: "سانی SY215C — بیل مکانیکی ۲۱ تنی چینی با موتور Cummins." },
  { brand: "sany", name: "SAC1300", nameEn: "Sany SAC1300", category: "crane",     description: "سانی SAC1300 — جرثقیل همه‌منظوره ۱۳۰ تنی." },
];

// ────────────────────────────────────────────────────────────
// 2) PRODUCTS — link ProductModel → Product for the most common models
//    (at least 20)
// ────────────────────────────────────────────────────────────
type ProductSeed = {
  modelBrand: BrandKey;
  modelName: string;           // matches MODELS[].name
  category: CategoryKey;       // canonical category for the product
  canonicalName: string;       // e.g. "Caterpillar 320D Excavator"
  description?: string;
};

const PRODUCTS: ProductSeed[] = [
  // ── Caterpillar products (8) ──────────────────────────────
  { modelBrand: "caterpillar", modelName: "320D",  category: "excavator",  canonicalName: "Caterpillar 320D Excavator",  description: "محصول رسمی بیل مکانیکی زنجیری کاترپیلار مدل ۳۲۰دی." },
  { modelBrand: "caterpillar", modelName: "320F",  category: "excavator",  canonicalName: "Caterpillar 320F Excavator",  description: "محصول رسمی بیل مکانیکی زنجیری کاترپیلار مدل ۳۲۰اف." },
  { modelBrand: "caterpillar", modelName: "320G",  category: "excavator",  canonicalName: "Caterpillar 320G Excavator",  description: "محصول رسمی بیل مکانیکی زنجیری کاترپیلار مدل ۳۲۰جی." },
  { modelBrand: "caterpillar", modelName: "330D",  category: "excavator",  canonicalName: "Caterpillar 330D Excavator",  description: "محصول رسمی بیل مکانیکی زنجیری کاترپیلار مدل ۳۳۰دی." },
  { modelBrand: "caterpillar", modelName: "336F",  category: "excavator",  canonicalName: "Caterpillar 336F Excavator",  description: "محصول رسمی بیل مکانیکی زنجیری کاترپیلار مدل ۳۳۶اف." },
  { modelBrand: "caterpillar", modelName: "966M",  category: "loader",     canonicalName: "Caterpillar 966M Wheel Loader", description: "محصول رسمی لودر چرخ‌دار کاترپیلار مدل ۹۶۶ام." },
  { modelBrand: "caterpillar", modelName: "D6T",   category: "bulldozer",  canonicalName: "Caterpillar D6T Bulldozer",    description: "محصول رسمی بولدوزر زنجیری کاترپیلار مدل دی‌۶تی." },
  { modelBrand: "caterpillar", modelName: "140M",  category: "grader",     canonicalName: "Caterpillar 140M Motor Grader", description: "محصول رسمی موتورگریدر کاترپیلار مدل ۱۴۰ام." },
  // ── Komatsu products (4) ──────────────────────────────────
  { modelBrand: "komatsu", modelName: "PC210-8", category: "excavator", canonicalName: "Komatsu PC210-8 Excavator", description: "محصول رسمی بیل مکانیکی کوماتسو مدل PC210-8." },
  { modelBrand: "komatsu", modelName: "PC220-8", category: "excavator", canonicalName: "Komatsu PC220-8 Excavator", description: "محصول رسمی بیل مکانیکی کوماتسو مدل PC220-8." },
  { modelBrand: "komatsu", modelName: "PC300-8", category: "excavator", canonicalName: "Komatsu PC300-8 Excavator", description: "محصول رسمی بیل مکانیکی کوماتسو مدل PC300-8." },
  { modelBrand: "komatsu", modelName: "WA380-6", category: "loader",    canonicalName: "Komatsu WA380-6 Wheel Loader", description: "محصول رسمی لودر چرخ‌دار کوماتسو مدل WA380-6." },
  // ── Volvo products (3) ────────────────────────────────────
  { modelBrand: "volvo", modelName: "EC220D", category: "excavator", canonicalName: "Volvo EC220D Excavator", description: "محصول رسمی بیل مکانیکی وولوو مدل EC220D." },
  { modelBrand: "volvo", modelName: "EC380D", category: "excavator", canonicalName: "Volvo EC380D Excavator", description: "محصول رسمی بیل مکانیکی وولوو مدل EC380D." },
  { modelBrand: "volvo", modelName: "A40G",   category: "dumpTruck", canonicalName: "Volvo A40G Articulated Dump Truck", description: "محصول رسمی دامپتراک articulated وولوو مدل A40G." },
  // ── Hitachi products (2) ──────────────────────────────────
  { modelBrand: "hitachi", modelName: "ZX210LC", category: "excavator", canonicalName: "Hitachi ZX210LC Excavator", description: "محصول رسمی بیل مکانیکی هیتاچی مدل ZX210LC." },
  { modelBrand: "hitachi", modelName: "ZX350LC", category: "excavator", canonicalName: "Hitachi ZX350LC Excavator", description: "محصول رسمی بیل مکانیکی هیتاچی مدل ZX350LC." },
  // ── JCB product (1) ───────────────────────────────────────
  { modelBrand: "jcb", modelName: "3CX", category: "backhoeLoader", canonicalName: "JCB 3CX Backhoe Loader", description: "محصول رسمی بکهو لودر جی‌سی‌بی مدل 3CX." },
  // ── Doosan product (1) ────────────────────────────────────
  { modelBrand: "doosan", modelName: "DX255", category: "excavator", canonicalName: "Doosan DX255 Excavator", description: "محصول رسمی بیل مکانیکی دوسان مدل DX255." },
  // ── Bobcat product (1) ────────────────────────────────────
  { modelBrand: "bobcat", modelName: "E35", category: "miniExcavator", canonicalName: "Bobcat E35 Mini Excavator", description: "محصول رسمی مینی بیل بابکت مدل E35." },
  // ── Sany product (1) ──────────────────────────────────────
  { modelBrand: "sany", modelName: "SY215C", category: "excavator", canonicalName: "Sany SY215C Excavator", description: "محصول رسمی بیل مکانیکی سانی مدل SY215C." },
  // ── Parts / Attachment Products (3) ───────────────────────
  // These are NOT linked to a model — they are pure accessories.
  { modelBrand: "caterpillar", modelName: "320D", category: "excavator", canonicalName: "Caterpillar General Purpose Bucket 1.19m³", description: "بکت چندمنظوره ۱.۱۹ متر مکعبی سازگار با بیل‌های کاترپیلار سری ۳۲۰." },
  { modelBrand: "caterpillar", modelName: "320D", category: "excavator", canonicalName: "Caterpillar Hydraulic Thumb", description: "شست هیدرولیک برای بیل‌های کاترپیلار سری ۳۲۰." },
  { modelBrand: "komatsu", modelName: "PC210-8", category: "excavator", canonicalName: "Komatsu PC210-8 Filter Kit", description: "کیت فیلتر روغن و هوای کوماتسو PC210-8." },
];

// ────────────────────────────────────────────────────────────
// 3) ATTACHMENTS — link to the parts/attachment Products above
// ────────────────────────────────────────────────────────────
type AttachmentSeed = {
  productCanonicalName: string;
  attachmentType: string;  // BUCKET | THUMB | COUPLER | FORK | BREAKER | RIPPER | GRAPPLE
  capacity?: string;
  condition?: string;
};

const ATTACHMENTS: AttachmentSeed[] = [
  { productCanonicalName: "Caterpillar General Purpose Bucket 1.19m³", attachmentType: "BUCKET", capacity: "1.19 m³", condition: "NEW" },
  { productCanonicalName: "Caterpillar Hydraulic Thumb", attachmentType: "THUMB", capacity: "N/A", condition: "NEW" },
];

// ────────────────────────────────────────────────────────────
// 4) PARTS — link to the parts Products above
// ────────────────────────────────────────────────────────────
type PartSeed = {
  productCanonicalName: string;
  partNumber: string;
  oemNumber?: string;
  condition?: string;
};

const PARTS: PartSeed[] = [
  { productCanonicalName: "Komatsu PC210-8 Filter Kit", partNumber: "KIT-PC210-FL", oemNumber: "600-321-4510", condition: "NEW" },
];

// ────────────────────────────────────────────────────────────
// 5) COMPATIBILITY EDGES — at least 10
// ────────────────────────────────────────────────────────────
type EntityType = "Product" | "Model" | "Attachment" | "Part";
type RelationType = "COMPATIBLE_WITH" | "FITS" | "REPLACES" | "UPGRADES" | "REQUIRES";

type EdgeSeed = {
  sourceType: EntityType;
  sourceKey: { kind: "model"; brand: BrandKey; name: string } | { kind: "product"; canonicalName: string };
  targetType: EntityType;
  targetKey: { kind: "model"; brand: BrandKey; name: string } | { kind: "product"; canonicalName: string };
  relationType: RelationType;
  confidence?: number;
  source?: string; // MANUAL | AI_SUGGESTED | OEM_DOCUMENT
  verified?: boolean;
};

const EDGES: EdgeSeed[] = [
  // — Same-family COMPATIBLE_WITH (Model ↔ Model) — Caterpillar excavators
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "320D" }, targetType: "Model", targetKey: { kind: "model", brand: "caterpillar", name: "320F" }, relationType: "COMPATIBLE_WITH", confidence: 0.95, source: "OEM_DOCUMENT", verified: true },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "320F" }, targetType: "Model", targetKey: { kind: "model", brand: "caterpillar", name: "320G" }, relationType: "COMPATIBLE_WITH", confidence: 0.9,  source: "OEM_DOCUMENT", verified: true },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "320D" }, targetType: "Model", targetKey: { kind: "model", brand: "caterpillar", name: "330D" }, relationType: "COMPATIBLE_WITH", confidence: 0.7,  source: "MANUAL" },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "330D" }, targetType: "Model", targetKey: { kind: "model", brand: "caterpillar", name: "336F" }, relationType: "UPGRADES",         confidence: 0.85, source: "OEM_DOCUMENT", verified: true },
  // — Caterpillar loaders + dozers + graders
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "966H" }, targetType: "Model", targetKey: { kind: "model", brand: "caterpillar", name: "966M" }, relationType: "UPGRADES",         confidence: 0.9,  source: "OEM_DOCUMENT", verified: true },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "D6R"  }, targetType: "Model", targetKey: { kind: "model", brand: "caterpillar", name: "D6T"  }, relationType: "UPGRADES",         confidence: 0.9,  source: "OEM_DOCUMENT", verified: true },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "140K" }, targetType: "Model", targetKey: { kind: "model", brand: "caterpillar", name: "140M" }, relationType: "UPGRADES",         confidence: 0.9,  source: "OEM_DOCUMENT", verified: true },
  // — Komatsu excavator family
  { sourceType: "Model", sourceKey: { kind: "model", brand: "komatsu", name: "PC210-8" }, targetType: "Model", targetKey: { kind: "model", brand: "komatsu", name: "PC220-8" }, relationType: "COMPATIBLE_WITH", confidence: 0.9,  source: "OEM_DOCUMENT", verified: true },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "komatsu", name: "PC220-8" }, targetType: "Model", targetKey: { kind: "model", brand: "komatsu", name: "PC300-8" }, relationType: "COMPATIBLE_WITH", confidence: 0.7,  source: "MANUAL" },
  // — Komatsu loaders
  { sourceType: "Model", sourceKey: { kind: "model", brand: "komatsu", name: "WA380-6" }, targetType: "Model", targetKey: { kind: "model", brand: "komatsu", name: "WA470-5" }, relationType: "COMPATIBLE_WITH", confidence: 0.7,  source: "MANUAL" },
  // — Volvo excavator family
  { sourceType: "Model", sourceKey: { kind: "model", brand: "volvo", name: "EC220D" }, targetType: "Model", targetKey: { kind: "model", brand: "volvo", name: "EC380D" }, relationType: "COMPATIBLE_WITH", confidence: 0.7, source: "MANUAL" },
  // — Hitachi excavator family
  { sourceType: "Model", sourceKey: { kind: "model", brand: "hitachi", name: "ZX210LC" }, targetType: "Model", targetKey: { kind: "model", brand: "hitachi", name: "ZX350LC" }, relationType: "COMPATIBLE_WITH", confidence: 0.7, source: "MANUAL" },
  // — Cross-brand same-weight-class COMPATIBLE_WITH
  { sourceType: "Model", sourceKey: { kind: "model", brand: "jcb",     name: "JS220"   }, targetType: "Model", targetKey: { kind: "model", brand: "caterpillar", name: "320D" }, relationType: "COMPATIBLE_WITH", confidence: 0.6, source: "MANUAL" },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "doosan",  name: "DX255"   }, targetType: "Model", targetKey: { kind: "model", brand: "hitachi", name: "ZX210LC" }, relationType: "COMPATIBLE_WITH", confidence: 0.6, source: "MANUAL" },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "sany",    name: "SY215C"  }, targetType: "Model", targetKey: { kind: "model", brand: "komatsu", name: "PC210-8" }, relationType: "COMPATIBLE_WITH", confidence: 0.55, source: "AI_SUGGESTED" },
  // — Model FITS Attachment (bucket) — uses Product+Attachment for the bucket
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "320D" }, targetType: "Product", targetKey: { kind: "product", canonicalName: "Caterpillar General Purpose Bucket 1.19m³" }, relationType: "FITS", confidence: 0.95, source: "OEM_DOCUMENT", verified: true },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "320F" }, targetType: "Product", targetKey: { kind: "product", canonicalName: "Caterpillar General Purpose Bucket 1.19m³" }, relationType: "FITS", confidence: 0.9,  source: "OEM_DOCUMENT", verified: true },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "320G" }, targetType: "Product", targetKey: { kind: "product", canonicalName: "Caterpillar General Purpose Bucket 1.19m³" }, relationType: "FITS", confidence: 0.85, source: "OEM_DOCUMENT", verified: true },
  { sourceType: "Model", sourceKey: { kind: "model", brand: "caterpillar", name: "320D" }, targetType: "Product", targetKey: { kind: "product", canonicalName: "Caterpillar Hydraulic Thumb" }, relationType: "FITS", confidence: 0.9, source: "OEM_DOCUMENT", verified: true },
  // — Model REQUIRES Part (filter kit)
  { sourceType: "Model", sourceKey: { kind: "model", brand: "komatsu", name: "PC210-8" }, targetType: "Product", targetKey: { kind: "product", canonicalName: "Komatsu PC210-8 Filter Kit" }, relationType: "REQUIRES", confidence: 1.0, source: "OEM_DOCUMENT", verified: true },
];

// ────────────────────────────────────────────────────────────
// Seed runner
// ────────────────────────────────────────────────────────────
async function main() {
  console.log("▸ P0-CATALOG-SEED — starting…");

  // ── Look up brand IDs ─────────────────────────────────────
  const brandSlugs = Object.values(BRAND_SLUGS);
  const brandRows = await db.brand.findMany({
    where: { slug: { in: brandSlugs } },
    select: { id: true, slug: true, nameEn: true, name: true },
  });
  const brandBySlug = new Map(brandRows.map((b) => [b.slug, b]));
  const brandIdByKey = (key: BrandKey): string => {
    const slug = BRAND_SLUGS[key];
    const b = brandBySlug.get(slug);
    if (!b) throw new Error(`Brand not found for key "${key}" (slug "${slug}"). Run seed-brands-a/b first.`);
    return b.id;
  };
  console.log(`  ✓ Resolved ${brandRows.length}/${brandSlugs.length} brands.`);

  // ── Look up category IDs ──────────────────────────────────
  const catSlugs = Object.values(CATEGORY_SLUGS);
  const catRows = await db.category.findMany({
    where: { slug: { in: catSlugs } },
    select: { id: true, slug: true, name: true, level: true },
  });
  const catBySlug = new Map(catRows.map((c) => [c.slug, c]));
  const categoryIdByKey = (key: CategoryKey): string => {
    const slug = CATEGORY_SLUGS[key];
    const c = catBySlug.get(slug);
    if (!c) throw new Error(`Category not found for key "${key}" (slug "${slug}").`);
    return c.id;
  };
  console.log(`  ✓ Resolved ${catRows.length}/${catSlugs.length} categories.`);

  // ── 1) ProductModels ──────────────────────────────────────
  console.log(`  ▸ Seeding ${MODELS.length} ProductModels…`);
  const modelKeyToId = new Map<string, string>(); // `${brandKey}:${modelName}` → modelId
  for (const m of MODELS) {
    const brandId = brandIdByKey(m.brand);
    const categoryId = categoryIdByKey(m.category);
    // slug = slugified english name WITHOUT the brand prefix (constraint is per-brand).
    // We strip leading "caterpillar-"/"komatsu-"/etc. that slugifyEn(nameEn) would emit.
    const rawSlug = slugifyEn(m.nameEn);
    const brandSlugForStrip = slugifyEn(m.nameEn.split(" ")[0]);
    const slug = rawSlug.startsWith(brandSlugForStrip + "-")
      ? rawSlug.slice(brandSlugForStrip.length + 1)
      : rawSlug;
    const created = await db.productModel.upsert({
      where: { brandId_slug: { brandId, slug } },
      update: {
        name: m.name,
        nameEn: m.nameEn,
        categoryId,
        description: m.description,
        status: "ACTIVE",
      },
      create: {
        brandId,
        categoryId,
        name: m.name,
        nameEn: m.nameEn,
        slug,
        description: m.description,
        status: "ACTIVE",
        sortOrder: 0,
      },
    });
    modelKeyToId.set(`${m.brand}:${m.name}`, created.id);
  }
  console.log(`    ✓ ${MODELS.length} ProductModels upserted.`);

  // ── 2) Products ───────────────────────────────────────────
  console.log(`  ▸ Seeding ${PRODUCTS.length} Products…`);
  const productKeyToId = new Map<string, string>(); // canonicalName → productId
  for (const p of PRODUCTS) {
    const brandId = brandIdByKey(p.modelBrand);
    const categoryId = categoryIdByKey(p.category);
    const modelId = modelKeyToId.get(`${p.modelBrand}:${p.modelName}`) ?? null;
    const slug = slugifyEn(p.canonicalName);
    const created = await db.product.upsert({
      where: { slug },
      update: {
        categoryId,
        brandId,
        modelId,
        canonicalName: p.canonicalName,
        description: p.description,
        status: "ACTIVE",
      },
      create: {
        categoryId,
        brandId,
        modelId,
        canonicalName: p.canonicalName,
        slug,
        description: p.description,
        status: "ACTIVE",
        source: "MANUAL",
        sortOrder: 0,
      },
    });
    productKeyToId.set(p.canonicalName, created.id);
  }
  console.log(`    ✓ ${PRODUCTS.length} Products upserted.`);

  // ── 3) Attachments (linked to Parts/Attachment Products) ─
  console.log(`  ▸ Seeding ${ATTACHMENTS.length} Attachments…`);
  for (const a of ATTACHMENTS) {
    const productId = productKeyToId.get(a.productCanonicalName);
    if (!productId) {
      console.warn(`    ! Skipping attachment: product "${a.productCanonicalName}" not found.`);
      continue;
    }
    // Composite uniqueness isn't enforced by schema; use findFirst+upsert-on-id pattern.
    const existing = await db.attachment.findFirst({
      where: { productId, attachmentType: a.attachmentType },
      select: { id: true },
    });
    if (existing) {
      await db.attachment.update({
        where: { id: existing.id },
        data: {
          capacity: a.capacity,
          condition: a.condition,
          status: "ACTIVE",
        },
      });
    } else {
      await db.attachment.create({
        data: {
          productId,
          attachmentType: a.attachmentType,
          capacity: a.capacity,
          condition: a.condition,
          status: "ACTIVE",
        },
      });
    }
  }
  console.log(`    ✓ ${ATTACHMENTS.length} Attachments upserted.`);

  // ── 4) Parts ──────────────────────────────────────────────
  console.log(`  ▸ Seeding ${PARTS.length} Parts…`);
  for (const p of PARTS) {
    const productId = productKeyToId.get(p.productCanonicalName);
    if (!productId) {
      console.warn(`    ! Skipping part: product "${p.productCanonicalName}" not found.`);
      continue;
    }
    const existing = await db.part.findFirst({
      where: { productId, partNumber: p.partNumber },
      select: { id: true },
    });
    if (existing) {
      await db.part.update({
        where: { id: existing.id },
        data: {
          oemNumber: p.oemNumber,
          condition: p.condition,
          status: "ACTIVE",
        },
      });
    } else {
      await db.part.create({
        data: {
          productId,
          partNumber: p.partNumber,
          oemNumber: p.oemNumber,
          condition: p.condition,
          status: "ACTIVE",
        },
      });
    }
  }
  console.log(`    ✓ ${PARTS.length} Parts upserted.`);

  // ── 5) CompatibilityEdges ─────────────────────────────────
  console.log(`  ▸ Seeding ${EDGES.length} CompatibilityEdges…`);
  const resolveEntity = (key: EdgeSeed["sourceKey"] | EdgeSeed["targetKey"]): { id: string; type: EntityType } => {
    if (key.kind === "model") {
      const id = modelKeyToId.get(`${key.brand}:${key.name}`);
      if (!id) throw new Error(`Model not found for ${key.brand}:${key.name}`);
      return { id, type: "Model" };
    }
    const id = productKeyToId.get(key.canonicalName);
    if (!id) throw new Error(`Product not found for ${key.canonicalName}`);
    return { id, type: "Product" };
  };

  let edgeCount = 0;
  for (const e of EDGES) {
    const src = resolveEntity(e.sourceKey);
    const tgt = resolveEntity(e.targetKey);
    await db.compatibilityEdge.upsert({
      where: {
        sourceEntityType_sourceEntityId_targetEntityType_targetEntityId_relationType: {
          sourceEntityType: e.sourceType,
          sourceEntityId: src.id,
          targetEntityType: e.targetType,
          targetEntityId: tgt.id,
          relationType: e.relationType,
        },
      },
      update: {
        confidence: e.confidence ?? null,
        source: e.source ?? null,
        verified: e.verified ?? false,
      },
      create: {
        sourceEntityType: e.sourceType,
        sourceEntityId: src.id,
        targetEntityType: e.targetType,
        targetEntityId: tgt.id,
        relationType: e.relationType,
        confidence: e.confidence ?? null,
        source: e.source ?? null,
        verified: e.verified ?? false,
      },
    });
    edgeCount++;
  }
  console.log(`    ✓ ${edgeCount} CompatibilityEdges upserted.`);

  // ── Summary ───────────────────────────────────────────────
  const [models, products, edges, attachments, parts, machines] = await Promise.all([
    db.productModel.count(),
    db.product.count(),
    db.compatibilityEdge.count(),
    db.attachment.count(),
    db.part.count(),
    db.machine.count(),
  ]);
  console.log("─".repeat(60));
  console.log("P0-CATALOG-SEED — done. Final row counts:");
  console.log({
    ProductModel: models,
    Product: products,
    CompatibilityEdge: edges,
    Attachment: attachments,
    Part: parts,
    Machine: machines,
  });
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error("P0-CATALOG-SEED FAILED:", e);
    await db.$disconnect();
    process.exit(1);
  });
