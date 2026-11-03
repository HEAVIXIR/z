/**
 * HEAVIX Store — COMPREHENSIVE seed script
 * =========================================
 * Real-world brands across 4 sectors + realistic parts.
 *
 * Run:  cd /home/z/my-project && bun scripts/seed-store-comprehensive.ts
 *
 * Sectors covered:
 *   - Auto Parts            (~25 brands, ~95 parts)
 *   - Heavy Machinery       (~25 brands, ~70 parts)
 *   - Oil/Gas/Petrochemical (~15 brands, ~35 parts)
 *   - Industrial            (~18 brands, ~55 parts)
 *
 * Brands, Categories and CarModels use `upsert` (re-runnable).
 * Parts use `upsert` by SKU (re-runnable).
 */
import { storeDb } from "../src/lib/store-db";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
type CategorySeed = {
  name: string;
  nameFa: string;
  slug: string;
  icon?: string;
};

type BrandSeed = {
  name: string;
  nameFa: string;
  slug: string;
  country: string;
};

type CarModelSeed = {
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  type: "PASSENGER" | "HEAVY";
};

type PartSeed = {
  name: string; // English name
  nameFa: string; // Persian name (natural)
  sku: string;
  brandSlug: string;
  categorySlug: string;
  priceUsd: number;
  oldPriceUsd?: number; // for discount badges
  stock?: number;
  featured?: boolean;
  description: string; // short Persian description
  compatibleCars?: string[]; // car model names for auto parts
};

// ---------------------------------------------------------------------------
// CATEGORIES (20)
// ---------------------------------------------------------------------------
const CATEGORIES: CategorySeed[] = [
  // --- Auto categories (10) ---
  { name: "Filters", nameFa: "فیلترها", slug: "filters", icon: "Filter" },
  { name: "Brake System", nameFa: "سیستم ترمز", slug: "brakes", icon: "Disc" },
  { name: "Suspension", nameFa: "سیستم تعلیق", slug: "suspension", icon: "Gauge" },
  { name: "Engine", nameFa: "موتور", slug: "engine", icon: "Cog" },
  { name: "Gearbox", nameFa: "گیربکس", slug: "gearbox", icon: "Settings2" },
  { name: "Electrical", nameFa: "الکتریکی", slug: "electrical", icon: "Zap" },
  { name: "Cooling", nameFa: "خنک‌کننده", slug: "cooling", icon: "Thermometer" },
  { name: "Exhaust", nameFa: "اگزوز", slug: "exhaust", icon: "Wind" },
  { name: "Body & Lights", nameFa: "بدنه و چراغ", slug: "body", icon: "Car" },
  { name: "Tires", nameFa: "لاستیک", slug: "tires", icon: "Circle" },
  // --- Industrial categories (10) ---
  { name: "Hydraulic", nameFa: "هیدرولیک", slug: "hydraulic", icon: "Droplets" },
  { name: "Compressor", nameFa: "کمپرسور", slug: "compressor", icon: "Fan" },
  { name: "Pump", nameFa: "پمپ", slug: "pump", icon: "Waves" },
  { name: "Industrial Valves", nameFa: "شیرآلات صنعتی", slug: "valves", icon: "Pipe" },
  { name: "Instrumentation", nameFa: "ابزار دقیق", slug: "instrumentation", icon: "GaugeCircle" },
  { name: "Electric Motor", nameFa: "الکتروموتور", slug: "electric-motor", icon: "RotateCw" },
  { name: "Industrial Gearbox", nameFa: "گیربکس صنعتی", slug: "industrial-gearbox", icon: "Settings" },
  { name: "Coupling", nameFa: "کوپلینگ و یوپیت", slug: "coupling", icon: "Link" },
  { name: "Industrial Bearing", nameFa: "بلبرینگ صنعتی", slug: "industrial-bearing", icon: "CircleDot" },
  { name: "Conveyor Belt", nameFa: "تسمه نقاله", slug: "conveyor-belt", icon: "MoveHorizontal" },
];

// ---------------------------------------------------------------------------
// BRANDS (82) — grouped by sector
// ---------------------------------------------------------------------------
const AUTO_BRANDS: BrandSeed[] = [
  { name: "Bosch", nameFa: "بوش", slug: "bosch", country: "آلمان" },
  { name: "Denso", nameFa: "دنسو", slug: "denso", country: "ژاپن" },
  { name: "Mahle", nameFa: "ماله", slug: "mahle", country: "آلمان" },
  { name: "Continental", nameFa: "کنتیننتال", slug: "continental", country: "آلمان" },
  { name: "ZF", nameFa: "زد‌اف", slug: "zf", country: "آلمان" },
  { name: "Valeo", nameFa: "والئو", slug: "valeo", country: "فرانسه" },
  { name: "Delphi", nameFa: "دلفی", slug: "delphi", country: "آمریکا" },
  { name: "NGK", nameFa: "ان‌جی‌کی", slug: "ngk", country: "ژاپن" },
  { name: "Brembo", nameFa: "برمبو", slug: "brembo", country: "ایتالیا" },
  { name: "Sachs", nameFa: "زاکس", slug: "sachs", country: "آلمان" },
  { name: "Febi Bilstein", nameFa: "فبی بیلشتاین", slug: "febi-bilstein", country: "آلمان" },
  { name: "Mann-Filter", nameFa: "مان فیلتر", slug: "mann-filter", country: "آلمان" },
  { name: "Knecht", nameFa: "کنخت", slug: "knecht", country: "آلمان" },
  { name: "Pierburg", nameFa: "پیربورگ", slug: "pierburg", country: "آلمان" },
  { name: "Hella", nameFa: "هلا", slug: "hella", country: "آلمان" },
  { name: "FAG", nameFa: "فاگ", slug: "fag", country: "آلمان" },
  { name: "SKF", nameFa: "اس‌کی‌اف", slug: "skf", country: "سوئد" },
  { name: "INA", nameFa: "اینا", slug: "ina", country: "آلمان" },
  { name: "NTN", nameFa: "ان‌تی‌ان", slug: "ntn", country: "ژاپن" },
  { name: "Timken", nameFa: "تیمکن", slug: "timken", country: "آمریکا" },
  { name: "Gates", nameFa: "گیتس", slug: "gates", country: "آمریکا" },
  { name: "Dayco", nameFa: "دایکو", slug: "dayco", country: "آمریکا" },
  { name: "Pirelli", nameFa: "پیرلی", slug: "pirelli", country: "ایتالیا" },
  { name: "Michelin", nameFa: "میشلن", slug: "michelin", country: "فرانسه" },
  { name: "Goodyear", nameFa: "گودیر", slug: "goodyear", country: "آمریکا" },
];

const HEAVY_BRANDS: BrandSeed[] = [
  { name: "Caterpillar", nameFa: "کاترپیلار", slug: "caterpillar", country: "آمریکا" },
  { name: "Komatsu", nameFa: "کوماتسو", slug: "komatsu", country: "ژاپن" },
  { name: "Volvo CE", nameFa: "وولوو", slug: "volvo-ce", country: "سوئد" },
  { name: "Hitachi", nameFa: "هیتاچی", slug: "hitachi", country: "ژاپن" },
  { name: "John Deere", nameFa: "جان دییر", slug: "john-deere", country: "آمریکا" },
  { name: "Liebherr", nameFa: "لایبهر", slug: "liebherr", country: "آلمان" },
  { name: "Doosan", nameFa: "دووسان", slug: "doosan", country: "کره جنوبی" },
  { name: "Hyundai Heavy Industries", nameFa: "هیوندای", slug: "hyundai-hi", country: "کره جنوبی" },
  { name: "Kobelco", nameFa: "کوبلکو", slug: "kobelco", country: "ژاپن" },
  { name: "JCB", nameFa: "جی‌سی‌بی", slug: "jcb", country: "انگلیس" },
  { name: "Case", nameFa: "کیس", slug: "case", country: "آمریکا" },
  { name: "New Holland", nameFa: "نیو هالند", slug: "new-holland", country: "آمریکا" },
  { name: "Kubota", nameFa: "کوبوتا", slug: "kubota", country: "ژاپن" },
  { name: "Terex", nameFa: "ترکس", slug: "terex", country: "آمریکا" },
  { name: "Bobcat", nameFa: "بابکت", slug: "bobcat", country: "آمریکا" },
  { name: "Wirtgen", nameFa: "ویرتگن", slug: "wirtgen", country: "آلمان" },
  { name: "Bomag", nameFa: "بومگ", slug: "bomag", country: "آلمان" },
  { name: "Ammann", nameFa: "آمان", slug: "ammann", country: "سوئیس" },
  { name: "Sandvik", nameFa: "سندویک", slug: "sandvik", country: "سوئد" },
  { name: "Atlas Copco", nameFa: "اطلس کوپکو", slug: "atlas-copco", country: "سوئد" },
  { name: "Metso", nameFa: "متسو", slug: "metso", country: "فنلاند" },
  { name: "Sany", nameFa: "سانی", slug: "sany", country: "چین" },
  { name: "XCMG", nameFa: "اکس‌سی‌ام‌جی", slug: "xcmg", country: "چین" },
  { name: "LiuGong", nameFa: "لیوگونگ", slug: "liugong", country: "چین" },
];

const OIL_GAS_BRANDS: BrandSeed[] = [
  { name: "Schlumberger", nameFa: "اشلومبرژه", slug: "schlumberger", country: "فرانسه" },
  { name: "Halliburton", nameFa: "هالیبرتن", slug: "halliburton", country: "آمریکا" },
  { name: "Baker Hughes", nameFa: "بیکر هیوز", slug: "baker-hughes", country: "آمریکا" },
  { name: "Weatherford", nameFa: "ودرفورد", slug: "weatherford", country: "آمریکا" },
  { name: "ABB", nameFa: "ای‌بی‌بی", slug: "abb", country: "سوئیس" },
  { name: "Siemens Energy", nameFa: "زیمنس انرژی", slug: "siemens-energy", country: "آلمان" },
  { name: "Emerson", nameFa: "امرسون", slug: "emerson", country: "آمریکا" },
  { name: "Honeywell", nameFa: "هانیول", slug: "honeywell", country: "آمریکا" },
  { name: "Flowserve", nameFa: "فلو سرو", slug: "flowserve", country: "آمریکا" },
  { name: "Cameron", nameFa: "کامرون", slug: "cameron", country: "آمریکا" },
  { name: "FMC Technologies", nameFa: "اف‌ام‌سی", slug: "fmc-technologies", country: "آمریکا" },
  { name: "NOV", nameFa: "ان‌او‌وی", slug: "nov", country: "آمریکا" },
  { name: "Weir Group", nameFa: "ویر", slug: "weir-group", country: "اسکاتلند" },
  { name: "Spirax Sarco", nameFa: "اسپیرکس سارکو", slug: "spirax-sarco", country: "انگلیس" },
  { name: "Parker Hannifin", nameFa: "پارکر هانیفین", slug: "parker-hannifin", country: "آمریکا" },
];

const INDUSTRIAL_BRANDS: BrandSeed[] = [
  { name: "Siemens", nameFa: "زیمنس", slug: "siemens", country: "آلمان" },
  { name: "Schneider Electric", nameFa: "اشنایدر الکتریک", slug: "schneider-electric", country: "فرانسه" },
  { name: "Eaton", nameFa: "ایتون", slug: "eaton", country: "آمریکا" },
  { name: "Bosch Rexroth", nameFa: "بوش رکسروت", slug: "bosch-rexroth", country: "آلمان" },
  { name: "Danfoss", nameFa: "دانفوس", slug: "danfoss", country: "دانمارک" },
  { name: "Yaskawa", nameFa: "یاسکاوا", slug: "yaskawa", country: "ژاپن" },
  { name: "Mitsubishi Electric", nameFa: "میتسوبیشی الکتریک", slug: "mitsubishi-electric", country: "ژاپن" },
  { name: "Omron", nameFa: "اومرون", slug: "omron", country: "ژاپن" },
  { name: "Festo", nameFa: "فستو", slug: "festo", country: "آلمان" },
  { name: "SMC", nameFa: "اس‌ام‌سی", slug: "smc", country: "ژاپن" },
  { name: "Norgren", nameFa: "نورگرن", slug: "norgren", country: "انگلیس" },
  { name: "Legris", nameFa: "لگریس", slug: "legris", country: "فرانسه" },
  { name: "Camozzi", nameFa: "کاموتسی", slug: "camozzi", country: "ایتالیا" },
  { name: "SEW-Eurodrive", nameFa: "اس‌ای‌او-یورودرایو", slug: "sew-eurodrive", country: "آلمان" },
  { name: "NORD Drivesystems", nameFa: "نورد", slug: "nord-drivesystems", country: "آلمان" },
  { name: "Bonfiglioli", nameFa: "بونفیلیولی", slug: "bonfiglioli", country: "ایتالیا" },
  { name: "Lenze", nameFa: "لنتسه", slug: "lenze", country: "آلمان" },
  { name: "Vacon", nameFa: "واکون", slug: "vacon", country: "فنلاند" },
];

const ALL_BRANDS: BrandSeed[] = [
  ...AUTO_BRANDS,
  ...HEAVY_BRANDS,
  ...OIL_GAS_BRANDS,
  ...INDUSTRIAL_BRANDS,
];

// ---------------------------------------------------------------------------
// CAR MODELS (20) — Iranian + common
// ---------------------------------------------------------------------------
const CAR_MODELS: CarModelSeed[] = [
  // PASSENGER
  { brand: "پژو", model: "۲۰۶", yearFrom: 2001, yearTo: 2024, type: "PASSENGER" },
  { brand: "پژو", model: "پارس", yearFrom: 1999, yearTo: 2024, type: "PASSENGER" },
  { brand: "ایران خودرو", model: "سمند", yearFrom: 2000, yearTo: 2018, type: "PASSENGER" },
  { brand: "ایران خودرو", model: "دنا", yearFrom: 2015, yearTo: 2024, type: "PASSENGER" },
  { brand: "سایپا", model: "پراید", yearFrom: 1996, yearTo: 2024, type: "PASSENGER" },
  { brand: "سایپا", model: "ساینا", yearFrom: 2014, yearTo: 2024, type: "PASSENGER" },
  { brand: "سایپا", model: "تیبا", yearFrom: 2008, yearTo: 2024, type: "PASSENGER" },
  { brand: "رنو", model: "L90 (تندر ۹۰)", yearFrom: 2007, yearTo: 2024, type: "PASSENGER" },
  { brand: "هیوندای", model: "الانترا", yearFrom: 2016, yearTo: 2024, type: "PASSENGER" },
  { brand: "تویوتا", model: "کرولا", yearFrom: 2014, yearTo: 2024, type: "PASSENGER" },
  // HEAVY
  { brand: "وولوو", model: "FH16", yearFrom: 2010, yearTo: 2024, type: "HEAVY" },
  { brand: "اسکانیا", model: "R500", yearFrom: 2012, yearTo: 2024, type: "HEAVY" },
  { brand: "MAN", model: "TGX", yearFrom: 2014, yearTo: 2024, type: "HEAVY" },
  { brand: "مرسدس بنز", model: "اکتروس", yearFrom: 2012, yearTo: 2024, type: "HEAVY" },
  { brand: "مرسدس بنز", model: "آتگو", yearFrom: 2010, yearTo: 2024, type: "HEAVY" },
  { brand: "داف", model: "XF", yearFrom: 2013, yearTo: 2024, type: "HEAVY" },
  { brand: "رنو تراک", model: "T-High", yearFrom: 2014, yearTo: 2024, type: "HEAVY" },
  { brand: "کاماز", model: "6520", yearFrom: 2010, yearTo: 2024, type: "HEAVY" },
  { brand: "ایسوزو", model: "FRR", yearFrom: 2012, yearTo: 2024, type: "HEAVY" },
  { brand: "ماک", model: "تی‌آر", yearFrom: 2015, yearTo: 2024, type: "HEAVY" },
];

// ---------------------------------------------------------------------------
// PARTS (200+) — real manufacturer + real part names
// ---------------------------------------------------------------------------
const PARTS: PartSeed[] = [
  // ===== AUTO: Bosch =====
  { name: "Bosch Oil Filter", nameFa: "فیلتر روغن موتور بوش", sku: "BSH-OF-001", brandSlug: "bosch", categorySlug: "filters", priceUsd: 7.5, oldPriceUsd: 9, stock: 240, featured: true, description: "فیلتر روغن بوش با قابلیت جداسازی ذرات تا ۱۰ میکرون، مناسب اکثر خودروهای سواری داخلی.", compatibleCars: ["پژو ۲۰۶", "پژو پارس", "سمند", "پراید"] },
  { name: "Bosch Air Filter", nameFa: "فیلتر هوا بوش", sku: "BSH-AF-001", brandSlug: "bosch", categorySlug: "filters", priceUsd: 12, stock: 180, description: "فیلتر هوا بوش با کاغذ باکیفیت برای جلوگیری از ورود گردوغبار به موتور." },
  { name: "Bosch Spark Plug", nameFa: "شمع موتور بوش", sku: "BSH-SP-001", brandSlug: "bosch", categorySlug: "engine", priceUsd: 9, stock: 320, description: "شمع موتور بوش با الکترود نیکل، احتراق پایدار و مصرف بهینه." },
  { name: "Bosch Fuel Pump", nameFa: "پمپ سوخت بوش", sku: "BSH-FP-001", brandSlug: "bosch", categorySlug: "engine", priceUsd: 85, stock: 28, description: "پمپ سوخت الکتریکی بوش، فشار پایدار برای سیستم انژکشن." },
  { name: "Bosch Battery 60Ah", nameFa: "باتری بوش ۶۰ آمپر", sku: "BSH-BAT-60", brandSlug: "bosch", categorySlug: "electrical", priceUsd: 75, stock: 45, featured: true, description: "باتری ۶۰ آمپر سیلد بوش، مناسب خودروهای سواری با استارت مطمئن در سرما." },
  { name: "Bosch Alternator", nameFa: "دینام بوش", sku: "BSH-ALT-001", brandSlug: "bosch", categorySlug: "electrical", priceUsd: 180, stock: 12, description: "دینام ۹۰ آمپر بوش، شارژ پایدار باتری در تمام شرایط." },
  { name: "Bosch Wiper Blade", nameFa: "تیغه برف‌پاک‌کن بوش", sku: "BSH-WP-001", brandSlug: "bosch", categorySlug: "body", priceUsd: 14, stock: 95, description: "تیغه برف‌پاک‌کن بوش با پوشش گرافیتی، عملکرد بی‌صدا و تمیز." },

  // ===== AUTO: Denso =====
  { name: "Denso Iridium Spark Plug", nameFa: "شمع ایریدیم دنسو", sku: "DEN-SP-001", brandSlug: "denso", categorySlug: "engine", priceUsd: 12.5, stock: 180, featured: true, description: "شمع ایریدیم دنسو با عمر بالا تا ۱۰۰ هزار کیلومتر." },
  { name: "Denso Cabin Filter", nameFa: "فیلتر کابین دنسو", sku: "DEN-CF-001", brandSlug: "denso", categorySlug: "filters", priceUsd: 15, stock: 130, description: "فیلتر کابین دنسو با لایه کربن فعال برای حذف بو و آلاینده‌ها." },
  { name: "Denso Fuel Injector", nameFa: "انژکتور دنسو", sku: "DEN-INJ-001", brandSlug: "denso", categorySlug: "engine", priceUsd: 95, stock: 32, description: "انژکتور دنسو با الگوی پاشش دقیق، مصرف سوخت بهینه." },
  { name: "Denso Ignition Coil", nameFa: "کوئل احتراق دنسو", sku: "DEN-COIL-001", brandSlug: "denso", categorySlug: "electrical", priceUsd: 45, stock: 64, description: "کوئل احتراق دنسو، ولتاژ خروجی پایدار برای احتراق کامل." },
  { name: "Denso Starter Motor", nameFa: "استارت دنسو", sku: "DEN-STR-001", brandSlug: "denso", categorySlug: "electrical", priceUsd: 160, stock: 18, description: "استارت دنسو با گشتاور بالا برای استارت مطمئن در شرایط سرد." },
  { name: "Denso Oxygen Sensor", nameFa: "سنسور اکسیژن دنسو", sku: "DEN-O2S-001", brandSlug: "denso", categorySlug: "electrical", priceUsd: 58, stock: 25, description: "سنسور اکسیژن دنسو برای کنترل دقیق نسبت سوخت و هوا." },

  // ===== AUTO: Mahle =====
  { name: "Mahle Piston", nameFa: "پیستون ماهله", sku: "MAH-PIS-001", brandSlug: "mahle", categorySlug: "engine", priceUsd: 50, stock: 42, description: "پیستون ماهله با آلیاژ آلومینیوم مقاوم در برابر حرارت." },
  { name: "Mahle Oil Filter", nameFa: "فیلتر روغن ماهله", sku: "MAH-OF-001", brandSlug: "mahle", categorySlug: "filters", priceUsd: 8, stock: 150, description: "فیلتر روغن ماهله با کاغذ فیلتر چندلایه." },
  { name: "Mahle Piston Ring", nameFa: "رینگ پیستون ماهله", sku: "MAH-RING-001", brandSlug: "mahle", categorySlug: "engine", priceUsd: 25, stock: 80, description: "ست رینگ پیستون ماهله، آب‌بندی دقیق سیلندر." },
  { name: "Mahle Air Filter", nameFa: "فیلتر هوا ماهله", sku: "MAH-AF-001", brandSlug: "mahle", categorySlug: "filters", priceUsd: 14, stock: 110, description: "فیلتر هوا ماهله با راندمان فیلتراسیون بالا." },

  // ===== AUTO: Continental =====
  { name: "Continental Timing Belt", nameFa: "تسمه تایم کنتیننتال", sku: "CTN-TB-001", brandSlug: "continental", categorySlug: "engine", priceUsd: 55, stock: 40, featured: true, description: "تسمه تایم کنتیننتال با الیاف فایبرگلاس، عمر بالا." },
  { name: "Continental V-Ribbed Belt", nameFa: "تسمه دینام کنتیننتال", sku: "CTN-VB-001", brandSlug: "continental", categorySlug: "engine", priceUsd: 22, stock: 110, description: "تسمه دینام چندشیار کنتیننتال، عملکرد بی‌صدا." },
  { name: "Continental Tire 195/65R15", nameFa: "لاستیک کنتیننتال ۱۹۵/۶۵ آر۱۵", sku: "CTN-TR-001", brandSlug: "continental", categorySlug: "tires", priceUsd: 120, stock: 60, description: "لاستیک کنتیننتال تمام‌فصل با عملکرد عالی در شرایط مرطوب." },
  { name: "Continental Coolant Hose", nameFa: "شلنگ آب رادیاتور کنتیننتال", sku: "CTN-CH-001", brandSlug: "continental", categorySlug: "cooling", priceUsd: 18, stock: 90, description: "شلنگ رادیاتور کنتیننتال مقاوم در برابر فشار و حرارت." },

  // ===== AUTO: ZF =====
  { name: "ZF 8-Speed Automatic Transmission", nameFa: "گیربکس اتوماتیک ۸ دنده ZF", sku: "ZF-GB-001", brandSlug: "zf", categorySlug: "gearbox", priceUsd: 3500, stock: 4, description: "گیربکس اتوماتیک ۸ سرعته ZF، تعویض نرم و مصرف بهینه." },
  { name: "ZF Clutch Kit", nameFa: "کیت کلاچ ZF", sku: "ZF-CK-001", brandSlug: "zf", categorySlug: "gearbox", priceUsd: 420, stock: 14, description: "کیت کلاچ کامل ZF شامل صفحه، دیسک و غلتک." },
  { name: "ZF Power Steering Servo", nameFa: "سروو فرمان ZF", sku: "ZF-SR-001", brandSlug: "zf", categorySlug: "gearbox", priceUsd: 280, stock: 8, description: "سروو هیدرولیک فرمان ZF برای حرکت روان فرمان." },

  // ===== AUTO: Valeo =====
  { name: "Valeo Clutch Kit", nameFa: "کیت کلاچ والئو", sku: "VAL-CK-001", brandSlug: "valeo", categorySlug: "gearbox", priceUsd: 380, stock: 16, featured: true, description: "کیت کلاچ والئو، دوام و عملکرد عالی." },
  { name: "Valeo Alternator", nameFa: "دینام والئو", sku: "VAL-ALT-001", brandSlug: "valeo", categorySlug: "electrical", priceUsd: 200, stock: 12, description: "دینام والئو با راندمان بالا و خنک‌کاری بهینه." },
  { name: "Valeo Starter Motor", nameFa: "استارت والئو", sku: "VAL-STR-001", brandSlug: "valeo", categorySlug: "electrical", priceUsd: 170, stock: 18, description: "استارت والئو با گشتاور بالا." },
  { name: "Valeo Brake Caliper", nameFa: "کالیپر ترمز والئو", sku: "VAL-BC-001", brandSlug: "valeo", categorySlug: "brakes", priceUsd: 90, stock: 24, description: "کالیپر ترمز جلو والئو، توقف مطمئن." },

  // ===== AUTO: Delphi =====
  { name: "Delphi Fuel Pump", nameFa: "پمپ سوخت دلفی", sku: "DEL-FP-001", brandSlug: "delphi", categorySlug: "engine", priceUsd: 110, stock: 22, description: "پمپ سوخت دلفی درون باک، فشار پایدار." },
  { name: "Delphi Oxygen Sensor", nameFa: "سنسور اکسیژن دلفی", sku: "DEL-O2S-001", brandSlug: "delphi", categorySlug: "electrical", priceUsd: 55, stock: 36, description: "سنسور اکسیژن دلفی برای کنترل احتراق." },
  { name: "Delphi Fuel Injector", nameFa: "انژکتور دلفی", sku: "DEL-INJ-001", brandSlug: "delphi", categorySlug: "engine", priceUsd: 85, stock: 28, description: "انژکتور دلفی با پاشش دقیق." },
  { name: "Delphi Ignition Coil", nameFa: "کوئل دلفی", sku: "DEL-COIL-001", brandSlug: "delphi", categorySlug: "electrical", priceUsd: 42, stock: 50, description: "کوئل احتراق دلفی، ولتاژ پایدار." },

  // ===== AUTO: NGK =====
  { name: "NGK Standard Spark Plug", nameFa: "شمع موتور NGK", sku: "NGK-SP-001", brandSlug: "ngk", categorySlug: "engine", priceUsd: 7, stock: 480, description: "شمع موتور استاندارد NGK، احتراق پایدار." },
  { name: "NGK Iridium Spark Plug", nameFa: "شمع ایریدیم NGK", sku: "NGK-SP-002", brandSlug: "ngk", categorySlug: "engine", priceUsd: 13, oldPriceUsd: 15, stock: 220, featured: true, description: "شمع ایریدیم NGK با الکترود فوق‌نازک، عمر تا ۱۰۰ هزار کیلومتر." },
  { name: "NGK Platinum Spark Plug", nameFa: "شمع پلاتین NGK", sku: "NGK-SP-003", brandSlug: "ngk", categorySlug: "engine", priceUsd: 15, stock: 140, description: "شمع پلاتین NGK با دوام بالا." },
  { name: "NGK Oxygen Sensor", nameFa: "سنسور اکسیژن NGK", sku: "NGK-O2S-001", brandSlug: "ngk", categorySlug: "electrical", priceUsd: 48, stock: 32, description: "سنسور اکسیژن NGK برای تشخیص دقیق احتراق." },

  // ===== AUTO: Brembo =====
  { name: "Brembo Front Brake Pads", nameFa: "لنت ترمز جلو برمبو", sku: "BRM-BP-001", brandSlug: "brembo", categorySlug: "brakes", priceUsd: 45, oldPriceUsd: 55, stock: 60, featured: true, description: "لنت ترمز جلو برمبو، قدرت توقف بالا بدون صدا." },
  { name: "Brembo Rear Brake Pads", nameFa: "لنت ترمز عقب برمبو", sku: "BRM-BP-002", brandSlug: "brembo", categorySlug: "brakes", priceUsd: 38, stock: 55, description: "لنت ترمز عقب برمبو با ترکیب سرامیک." },
  { name: "Brembo Brake Disc", nameFa: "دیسک ترمز برمبو", sku: "BRM-BD-001", brandSlug: "brembo", categorySlug: "brakes", priceUsd: 85, stock: 40, description: "دیسک ترمز برمبو با طراحی تهویه‌شده." },
  { name: "Brembo Brake Caliper", nameFa: "کالیپر ترمز برمبو", sku: "BRM-BC-001", brandSlug: "brembo", categorySlug: "brakes", priceUsd: 180, stock: 16, description: "کالیپر ترمز برمبو ۶ پیستونه." },

  // ===== AUTO: Sachs =====
  { name: "Sachs Clutch Kit", nameFa: "کیت کلاچ زاکس", sku: "SAC-CK-001", brandSlug: "sachs", categorySlug: "gearbox", priceUsd: 360, stock: 18, description: "کیت کلاچ زاکس، انتقال قدرت نرم." },
  { name: "Sachs Shock Absorber", nameFa: "ضربه‌گیر زاکس", sku: "SAC-SA-001", brandSlug: "sachs", categorySlug: "suspension", priceUsd: 42, stock: 70, description: "ضربه‌گیر گازی زاکس برای تعلیق راحت." },
  { name: "Sachs Wheel Bearing", nameFa: "بلبرینگ چرخ زاکس", sku: "SAC-WB-001", brandSlug: "sachs", categorySlug: "suspension", priceUsd: 28, stock: 90, description: "بلبرینگ چرخ زاکس با آب‌بندی دائمی." },
  { name: "Sachs Clutch Damper", nameFa: "دمپر کلاچ زاکس", sku: "SAC-CD-001", brandSlug: "sachs", categorySlug: "gearbox", priceUsd: 55, stock: 30, description: "دمپر کلاچ زاکس برای کاهش لرزش." },

  // ===== AUTO: Febi Bilstein =====
  { name: "Febi Axle Joint", nameFa: "لنگ اکسل فبی بیلشتاین", sku: "FEB-AJ-001", brandSlug: "febi-bilstein", categorySlug: "suspension", priceUsd: 65, stock: 36, description: "لنگ اکسل فبی بیلشتاین با دوام بالا." },
  { name: "Febi Wheel Bearing", nameFa: "بلبرینگ چرخ فبی بیلشتاین", sku: "FEB-WB-001", brandSlug: "febi-bilstein", categorySlug: "suspension", priceUsd: 22, stock: 80, description: "بلبرینگ چرخ فبی بیلشتاین." },
  { name: "Febi Tie Rod End", nameFa: "مفصل میله تعلیق فبی بیلشتاین", sku: "FEB-TR-001", brandSlug: "febi-bilstein", categorySlug: "suspension", priceUsd: 35, stock: 60, description: "مفصل فرمان فبی بیلشتاین برای کنترل دقیق." },
  { name: "Febi Gasket Set", nameFa: "ست واشر موتور فبی بیلشتاین", sku: "FEB-GS-001", brandSlug: "febi-bilstein", categorySlug: "engine", priceUsd: 8, stock: 200, description: "واشرهای موتور فبی بیلشتاین." },

  // ===== AUTO: Mann-Filter =====
  { name: "Mann Oil Filter", nameFa: "فیلتر روغن مان فیلتر", sku: "MAN-OF-001", brandSlug: "mann-filter", categorySlug: "filters", priceUsd: 6, stock: 380, featured: true, description: "فیلتر روغن مان فیلتر، کیفیت بالا با قیمت مناسب." },
  { name: "Mann Air Filter", nameFa: "فیلتر هوا مان فیلتر", sku: "MAN-AF-001", brandSlug: "mann-filter", categorySlug: "filters", priceUsd: 13, stock: 250, description: "فیلتر هوا مان فیلتر با کاغذ فیلتر باکیفیت." },
  { name: "Mann Cabin Filter", nameFa: "فیلتر کابین مان فیلتر", sku: "MAN-CF-001", brandSlug: "mann-filter", categorySlug: "filters", priceUsd: 18, stock: 180, description: "فیلتر کابین مان فیلتر با لایه آنتی‌باکتریال." },
  { name: "Mann Fuel Filter", nameFa: "فیلتر سوخت مان فیلتر", sku: "MAN-FF-001", brandSlug: "mann-filter", categorySlug: "filters", priceUsd: 20, stock: 110, description: "فیلتر سوخت مان فیلتر برای موتورهای دیزلی و بنزینی." },

  // ===== AUTO: Knecht =====
  { name: "Knecht Oil Filter", nameFa: "فیلتر روغن کنخت", sku: "KNT-OF-001", brandSlug: "knecht", categorySlug: "filters", priceUsd: 9, stock: 180, description: "فیلتر روغن کنخت (ماله) با عملکرد بالا." },
  { name: "Knecht Air Filter", nameFa: "فیلتر هوا کنخت", sku: "KNT-AF-001", brandSlug: "knecht", categorySlug: "filters", priceUsd: 16, stock: 140, description: "فیلتر هوا کنخت با راندمان فیلتراسیون ۹۹٪." },
  { name: "Knecht Cabin Filter", nameFa: "فیلتر کابین کنخت", sku: "KNT-CF-001", brandSlug: "knecht", categorySlug: "filters", priceUsd: 22, stock: 95, description: "فیلتر کابین کنخت با کربن فعال." },

  // ===== AUTO: Pierburg =====
  { name: "Pierburg Oil Pump", nameFa: "پمپ روغن پیربورگ", sku: "PIE-OP-001", brandSlug: "pierburg", categorySlug: "engine", priceUsd: 145, stock: 14, description: "پمپ روغن موتور پیربورگ با فشار پایدار." },
  { name: "Pierburg Vacuum Pump", nameFa: "پمپ وکیوم پیربورگ", sku: "PIE-VP-001", brandSlug: "pierburg", categorySlug: "engine", priceUsd: 95, stock: 20, description: "پمپ وکیوم پیربورگ برای سیستم ترمز کمکی." },
  { name: "Pierburg Control Valve", nameFa: "شیر کنترل پیربورگ", sku: "PIE-CV-001", brandSlug: "pierburg", categorySlug: "engine", priceUsd: 68, stock: 28, description: "شیر کنترل هوای پیربورگ برای سیستم تنفسی موتور." },

  // ===== AUTO: Hella =====
  { name: "Hella Headlight", nameFa: "چراغ جلو هلا", sku: "HEL-HL-001", brandSlug: "hella", categorySlug: "body", priceUsd: 180, stock: 22, description: "چراغ جلو هالوژن هلا با نورپردازی قوی." },
  { name: "Hella Taillight", nameFa: "چراغ عقب هلا", sku: "HEL-TL-001", brandSlug: "hella", categorySlug: "body", priceUsd: 95, stock: 30, description: "چراغ عقب هلا با طراحی LED." },
  { name: "Hella Relay", nameFa: "رله هلا", sku: "HEL-RL-001", brandSlug: "hella", categorySlug: "electrical", priceUsd: 12, stock: 220, description: "رله ۱۲ ولت هلا برای کاربردهای عمومی." },
  { name: "Hella Heater Blower", nameFa: "موتور بخاری هلا", sku: "HEL-HB-001", brandSlug: "hella", categorySlug: "electrical", priceUsd: 65, stock: 36, description: "موتور فن بخاری هلا برای گرمایش کابین." },

  // ===== AUTO: FAG =====
  { name: "FAG Wheel Bearing", nameFa: "بلبرینگ چرخ فاگ", sku: "FAG-WB-001", brandSlug: "fag", categorySlug: "suspension", priceUsd: 32, stock: 110, description: "بلبرینگ چرخ فاگ با آب‌بندی دائمی." },
  { name: "FAG Alternator Bearing", nameFa: "بلبرینگ دینام فاگ", sku: "FAG-AB-001", brandSlug: "fag", categorySlug: "electrical", priceUsd: 18, stock: 180, description: "بلبرینگ دینام فاگ با روانکاری دائمی." },
  { name: "FAG Gearbox Bearing", nameFa: "بلبرینگ گیربکس فاگ", sku: "FAG-GB-001", brandSlug: "fag", categorySlug: "gearbox", priceUsd: 45, stock: 60, description: "بلبرینگ گیربکس فاگ برای تحمل بارهای ضربه‌ای." },

  // ===== AUTO: SKF =====
  { name: "SKF Wheel Bearing", nameFa: "بلبرینگ چرخ اس‌کی‌اف", sku: "SKF-WB-001", brandSlug: "skf", categorySlug: "suspension", priceUsd: 35, stock: 130, featured: true, description: "بلبرینگ چرخ اس‌کی‌اف، کیفیت سوئدی." },
  { name: "SKF Engine Bearing", nameFa: "بلبرینگ موتور اس‌کی‌اف", sku: "SKF-EB-001", brandSlug: "skf", categorySlug: "engine", priceUsd: 48, stock: 50, description: "بلبرینگ یاتاقان موتور اس‌کی‌اف." },
  { name: "SKF Oil Seal", nameFa: "سیل روغن اس‌کی‌اف", sku: "SKF-OS-001", brandSlug: "skf", categorySlug: "engine", priceUsd: 9, stock: 280, description: "سیل روغن اس‌کی‌اف با لاستیک NBR." },
  { name: "SKF Industrial Bearing", nameFa: "بلبرینگ صنعتی اس‌کی‌اف", sku: "SKF-IB-001", brandSlug: "skf", categorySlug: "industrial-bearing", priceUsd: 25, stock: 90, description: "بلبرینگ صنعتی اس‌کی‌اف ۶۲۰۴." },

  // ===== AUTO: INA =====
  { name: "INA Wheel Bearing", nameFa: "بلبرینگ چرخ اینا", sku: "INA-WB-001", brandSlug: "ina", categorySlug: "suspension", priceUsd: 30, stock: 110, description: "بلبرینگ چرخ اینا با آب‌بندی دائمی." },
  { name: "INA Timing Belt", nameFa: "تسمه تایم اینا", sku: "INA-TB-001", brandSlug: "ina", categorySlug: "engine", priceUsd: 52, stock: 60, description: "تسمه تایم اینا با الیاف فایبرگلاس." },
  { name: "INA Belt Tensioner", nameFa: "کشیده تسمه اینا", sku: "INA-BT-001", brandSlug: "ina", categorySlug: "engine", priceUsd: 18, stock: 95, description: "کشیده تسمه دینام اینا." },
  { name: "INA Idler Pulley", nameFa: "رولیک اینا", sku: "INA-IP-001", brandSlug: "ina", categorySlug: "engine", priceUsd: 24, stock: 80, description: "رولیک کمکی اینا برای تسمه تایم." },

  // ===== AUTO: NTN =====
  { name: "NTN Wheel Bearing", nameFa: "بلبرینگ چرخ NTN", sku: "NTN-WB-001", brandSlug: "ntn", categorySlug: "suspension", priceUsd: 28, stock: 130, description: "بلبرینگ چرخ NTN ژاپنی." },
  { name: "NTN Industrial Bearing", nameFa: "بلبرینگ صنعتی NTN", sku: "NTN-IB-001", brandSlug: "ntn", categorySlug: "industrial-bearing", priceUsd: 22, stock: 160, description: "بلبرینگ صنعتی NTN ۶۲۰۳." },
  { name: "NTN Clutch Bearing", nameFa: "بلبرینگ کلاچ NTN", sku: "NTN-CB-001", brandSlug: "ntn", categorySlug: "gearbox", priceUsd: 35, stock: 70, description: "بلبرینگ آزادکننده کلاچ NTN." },

  // ===== AUTO: Timken =====
  { name: "Timken Tapered Roller Bearing", nameFa: "بلبرینگ مخروطی تیمکن", sku: "TMK-TRB-001", brandSlug: "timken", categorySlug: "industrial-bearing", priceUsd: 42, stock: 80, description: "بلبرینگ غلتکی مخروطی تیمکن برای بارهای ترکیبی." },
  { name: "Timken Roller Bearing", nameFa: "یاتاقان غلتکی تیمکن", sku: "TMK-RB-001", brandSlug: "timken", categorySlug: "industrial-bearing", priceUsd: 55, stock: 60, description: "یاتاقان غلتکی استوانه‌ای تیمکن." },
  { name: "Timken Wheel Bearing", nameFa: "بلبرینگ چرخ تیمکن", sku: "TMK-WB-001", brandSlug: "timken", categorySlug: "suspension", priceUsd: 48, stock: 50, description: "بلبرینگ چرخ تیمکن برای خودروهای سنگین." },

  // ===== AUTO: Gates =====
  { name: "Gates V-Belt", nameFa: "تسمه دینام گیتس", sku: "GAT-VB-001", brandSlug: "gates", categorySlug: "engine", priceUsd: 18, stock: 200, description: "تسمه دینام گیتس با لاستیک EPDM." },
  { name: "Gates Timing Belt", nameFa: "تسمه تایم گیتس", sku: "GAT-TB-001", brandSlug: "gates", categorySlug: "engine", priceUsd: 48, stock: 70, featured: true, description: "تسمه تایم گیتس با الیاف فایبرگلاس." },
  { name: "Gates Coolant Hose", nameFa: "شلنگ آب گیتس", sku: "GAT-CH-001", brandSlug: "gates", categorySlug: "cooling", priceUsd: 12, stock: 180, description: "شلنگ رادیاتور گیتس مقاوم در برابر حرارت." },
  { name: "Gates Brake Hose", nameFa: "شلنگ ترمز گیتس", sku: "GAT-BH-001", brandSlug: "gates", categorySlug: "brakes", priceUsd: 14, stock: 130, description: "شلنگ ترمز گیتس با لایه‌های فشار قوی." },

  // ===== AUTO: Dayco =====
  { name: "Dayco V-Ribbed Belt", nameFa: "تسمه دینام دایکو", sku: "DAY-VB-001", brandSlug: "dayco", categorySlug: "engine", priceUsd: 20, stock: 150, description: "تسمه دینام چندشیار دایکو." },
  { name: "Dayco Timing Belt", nameFa: "تسمه تایم دایکو", sku: "DAY-TB-001", brandSlug: "dayco", categorySlug: "engine", priceUsd: 52, stock: 80, description: "تسمه تایم دایکو با دوام بالا." },
  { name: "Dayco Belt Tensioner", nameFa: "کشیده تسمه دایکو", sku: "DAY-BT-001", brandSlug: "dayco", categorySlug: "engine", priceUsd: 28, stock: 90, description: "کشیده خودکار تسمه دایکو." },

  // ===== AUTO: Pirelli =====
  { name: "Pirelli Tire 205/55R16", nameFa: "لاستیک پیرلی ۲۰۵/۵۵ آر۱۶", sku: "PIR-TR-001", brandSlug: "pirelli", categorySlug: "tires", priceUsd: 135, stock: 80, featured: true, description: "لاستیک پیرلی تمام‌فصل با عملکرد عالی در شرایط مرطوب." },
  { name: "Pirelli All-Season Tire 215/60R16", nameFa: "لاستیک تمام‌فصل پیرلی ۲۱۵/۶۰ آر۱۶", sku: "PIR-TR-002", brandSlug: "pirelli", categorySlug: "tires", priceUsd: 145, stock: 60, description: "لاستیک تمام‌فصل پیرلی با عمر بالا." },
  { name: "Pirelli Winter Tire 195/65R15", nameFa: "لاستیک زمستانی پیرلی ۱۹۵/۶۵ آر۱۵", sku: "PIR-TR-003", brandSlug: "pirelli", categorySlug: "tires", priceUsd: 160, stock: 40, description: "لاستیک زمستانی پیرلی با کشش عالی روی برف." },

  // ===== AUTO: Michelin =====
  { name: "Michelin Tire 185/65R15", nameFa: "لاستیک میشلن ۱۸۵/۶۵ آر۱۵", sku: "MIC-TR-001", brandSlug: "michelin", categorySlug: "tires", priceUsd: 140, stock: 70, featured: true, description: "لاستیک میشلن با مصرف سوخت بهینه و عمر بالا." },
  { name: "Michelin All-Season Tire 205/60R16", nameFa: "لاستیک تمام‌فصل میشلن ۲۰۵/۶۰ آر۱۶", sku: "MIC-TR-002", brandSlug: "michelin", categorySlug: "tires", priceUsd: 150, stock: 50, description: "لاستیک تمام‌فصل میشلن برای خودروهای سواری." },
  { name: "Michelin Truck Tire 295/80R22.5", nameFa: "لاستیک تجاری میشلن ۲۹۵/۸۰ آر۲۲.۵", sku: "MIC-TR-003", brandSlug: "michelin", categorySlug: "tires", priceUsd: 220, stock: 20, description: "لاستیک کامیونی میشلن با دوام بالا." },

  // ===== AUTO: Goodyear =====
  { name: "Goodyear Tire 195/65R15", nameFa: "لاستیک گودیر ۱۹۵/۶۵ آر۱۵", sku: "GDY-TR-001", brandSlug: "goodyear", categorySlug: "tires", priceUsd: 125, stock: 90, description: "لاستیک گودیر با عملکرد متعادل." },
  { name: "Goodyear All-Season Tire 215/55R17", nameFa: "لاستیک تمام‌فصل گودیر ۲۱۵/۵۵ آر۱۷", sku: "GDY-TR-002", brandSlug: "goodyear", categorySlug: "tires", priceUsd: 135, stock: 60, description: "لاستیک تمام‌فصل گودیر برای شرایط متنوع." },
  { name: "Goodyear Rain Tire 205/55R16", nameFa: "لاستیک بارانی گودیر ۲۰۵/۵۵ آر۱۶", sku: "GDY-TR-003", brandSlug: "goodyear", categorySlug: "tires", priceUsd: 145, stock: 35, description: "لاستیک بارانی گودیر با کشش عالی در شرایط مرطوب." },

  // ===== HEAVY: Caterpillar =====
  { name: "CAT Engine Oil Filter", nameFa: "فیلتر روغن موتور کاترپیلار", sku: "CAT-OF-001", brandSlug: "caterpillar", categorySlug: "filters", priceUsd: 35, stock: 80, featured: true, description: "فیلتر روغن موتور کاترپیلار برای موتورهای C9 و C13." },
  { name: "CAT Hydraulic Filter", nameFa: "فیلتر هیدرولیک کاترپیلار", sku: "CAT-HF-001", brandSlug: "caterpillar", categorySlug: "hydraulic", priceUsd: 48, stock: 65, description: "فیلتر هیدرولیک کاترپیلار برای سیستم‌های فشار بالا." },
  { name: "CAT Air Filter", nameFa: "فیلتر هوای کاترپیلار", sku: "CAT-AF-001", brandSlug: "caterpillar", categorySlug: "filters", priceUsd: 65, stock: 50, description: "فیلتر هوای کاترپیلار برای محیط‌های پرگردوغبار." },
  { name: "CAT Hydraulic Pump", nameFa: "پمپ هیدرولیک کاترپیلار", sku: "CAT-HP-001", brandSlug: "caterpillar", categorySlug: "hydraulic", priceUsd: 480, stock: 8, description: "پمپ هیدرولیک پیستونی کاترپیلار با فشار ۳۵۰ بار." },
  { name: "CAT Hydraulic Cylinder Seal", nameFa: "سیل جک هیدرولیک کاترپیلار", sku: "CAT-HCS-001", brandSlug: "caterpillar", categorySlug: "hydraulic", priceUsd: 85, stock: 30, description: "کیت سیل جک هیدرولیک کاترپیلار." },
  { name: "CAT Conveyor Belt", nameFa: "تسمه نقاله کاترپیلار", sku: "CAT-CB-001", brandSlug: "caterpillar", categorySlug: "conveyor-belt", priceUsd: 320, stock: 12, description: "تسمه نقاله کاترپیلار با لاستیک مقاوم در برابر سایش." },

  // ===== HEAVY: Komatsu =====
  { name: "Komatsu Engine Oil Filter", nameFa: "فیلتر روغن موتور کوماتسو", sku: "KOM-OF-001", brandSlug: "komatsu", categorySlug: "filters", priceUsd: 38, stock: 75, description: "فیلتر روغن موتور کوماتسو برای موتورهای SAA6D." },
  { name: "Komatsu Hydraulic Filter", nameFa: "فیلتر هیدرولیک کوماتسو", sku: "KOM-HF-001", brandSlug: "komatsu", categorySlug: "hydraulic", priceUsd: 52, stock: 60, description: "فیلتر هیدرولیک کوماتسو با راندمان فیلتراسیون بالا." },
  { name: "Komatsu Hydraulic Pump", nameFa: "پمپ هیدرولیک کوماتسو", sku: "KOM-HP-001", brandSlug: "komatsu", categorySlug: "hydraulic", priceUsd: 510, stock: 6, description: "پمپ هیدرولیک پیستونی کوماتسو." },
  { name: "Komatsu Engine Crankshaft", nameFa: "لنگ موتور کوماتسو", sku: "KOM-CS-001", brandSlug: "komatsu", categorySlug: "engine", priceUsd: 280, stock: 4, description: "لنگ موتور کوماتسو برای موتور ۶ سیلندر." },

  // ===== HEAVY: Volvo CE =====
  { name: "Volvo CE Oil Filter", nameFa: "فیلتر روغن موتور وولوو", sku: "VCE-OF-001", brandSlug: "volvo-ce", categorySlug: "filters", priceUsd: 40, stock: 70, description: "فیلتر روغن موتور وولوو برای موتورهای D16." },
  { name: "Volvo CE Hydraulic Filter", nameFa: "فیلتر هیدرولیک وولوو", sku: "VCE-HF-001", brandSlug: "volvo-ce", categorySlug: "hydraulic", priceUsd: 55, stock: 55, description: "فیلتر هیدرولیک وولوو CE." },
  { name: "Volvo CE Cylinder Seal", nameFa: "سیل جک هیدرولیک وولوو", sku: "VCE-CS-001", brandSlug: "volvo-ce", categorySlug: "hydraulic", priceUsd: 95, stock: 25, description: "کیت سیل جک هیدرولیک وولوو." },
  { name: "Volvo CE Water Pump", nameFa: "پمپ آب وولوو", sku: "VCE-WP-001", brandSlug: "volvo-ce", categorySlug: "pump", priceUsd: 68, stock: 30, description: "پمپ آب موتور وولوو CE." },

  // ===== HEAVY: Hitachi =====
  { name: "Hitachi Hydraulic Filter", nameFa: "فیلتر هیدرولیک هیتاچی", sku: "HIT-HF-001", brandSlug: "hitachi", categorySlug: "hydraulic", priceUsd: 50, stock: 50, description: "فیلتر هیدرولیک هیتاچی برای بیل مکانیکی." },
  { name: "Hitachi Cylinder Seal", nameFa: "سیل جک هیدرولیک هیتاچی", sku: "HIT-CS-001", brandSlug: "hitachi", categorySlug: "hydraulic", priceUsd: 88, stock: 28, description: "کیت سیل جک هیدرولیک هیتاچی." },
  { name: "Hitachi Hydraulic Pump", nameFa: "پمپ هیدرولیک هیتاچی", sku: "HIT-HP-001", brandSlug: "hitachi", categorySlug: "hydraulic", priceUsd: 490, stock: 6, description: "پمپ هیدرولیک هیتاچی با راندمان بالا." },

  // ===== HEAVY: John Deere =====
  { name: "John Deere Oil Filter", nameFa: "فیلتر روغن موتور جان دییر", sku: "JD-OF-001", brandSlug: "john-deere", categorySlug: "filters", priceUsd: 36, stock: 65, description: "فیلتر روغن موتور جان دییر برای تراکتورهای کشاورزی." },
  { name: "John Deere Air Filter", nameFa: "فیلتر هوای جان دییر", sku: "JD-AF-001", brandSlug: "john-deere", categorySlug: "filters", priceUsd: 58, stock: 50, description: "فیلتر هوای جان دییر با مساحت فیلتراسیون بزرگ." },
  { name: "John Deere Conveyor Belt", nameFa: "تسمه نقاله جان دییر", sku: "JD-CB-001", brandSlug: "john-deere", categorySlug: "conveyor-belt", priceUsd: 285, stock: 14, description: "تسمه نقاله جان دییر با مقاومت بالا." },
  { name: "John Deere Water Pump", nameFa: "پمپ آب جان دییر", sku: "JD-WP-001", brandSlug: "john-deere", categorySlug: "pump", priceUsd: 72, stock: 28, description: "پمپ آب موتور جان دییر." },

  // ===== HEAVY: Liebherr =====
  { name: "Liebherr Hydraulic Pump", nameFa: "پمپ هیدرولیک لایبهر", sku: "LIB-HP-001", brandSlug: "liebherr", categorySlug: "hydraulic", priceUsd: 620, stock: 4, featured: true, description: "پمپ هیدرولیک لایبهر برای جرثقیل‌های سخت‌کار." },
  { name: "Liebherr Hydraulic Filter", nameFa: "فیلتر هیدرولیک لایبهر", sku: "LIB-HF-001", brandSlug: "liebherr", categorySlug: "hydraulic", priceUsd: 62, stock: 45, description: "فیلتر هیدرولیک لایبهر با راندمان فیلتراسیون بالا." },
  { name: "Liebherr Cylinder Seal", nameFa: "سیل جک هیدرولیک لایبهر", sku: "LIB-CS-001", brandSlug: "liebherr", categorySlug: "hydraulic", priceUsd: 110, stock: 22, description: "کیت سیل جک هیدرولیک لایبهر." },

  // ===== HEAVY: Doosan =====
  { name: "Doosan Oil Filter", nameFa: "فیلتر روغن موتور دووسان", sku: "DOO-OF-001", brandSlug: "doosan", categorySlug: "filters", priceUsd: 34, stock: 70, description: "فیلتر روغن موتور دووسان برای بیل مکانیکی." },
  { name: "Doosan Hydraulic Filter", nameFa: "فیلتر هیدرولیک دووسان", sku: "DOO-HF-001", brandSlug: "doosan", categorySlug: "hydraulic", priceUsd: 48, stock: 60, description: "فیلتر هیدرولیک دووسان." },
  { name: "Doosan Hydraulic Pump", nameFa: "پمپ هیدرولیک دووسان", sku: "DOO-HP-001", brandSlug: "doosan", categorySlug: "hydraulic", priceUsd: 460, stock: 6, description: "پمپ هیدرولیک دووسان." },

  // ===== HEAVY: Hyundai HI =====
  { name: "Hyundai HI Oil Filter", nameFa: "فیلتر روغن موتور هیوندای", sku: "HHI-OF-001", brandSlug: "hyundai-hi", categorySlug: "filters", priceUsd: 33, stock: 75, description: "فیلتر روغن موتور هیوندای برای لودر." },
  { name: "Hyundai HI Hydraulic Filter", nameFa: "فیلتر هیدرولیک هیوندای", sku: "HHI-HF-001", brandSlug: "hyundai-hi", categorySlug: "hydraulic", priceUsd: 46, stock: 60, description: "فیلتر هیدرولیک هیوندای HI." },
  { name: "Hyundai HI Hydraulic Pump", nameFa: "پمپ هیدرولیک هیوندای", sku: "HHI-HP-001", brandSlug: "hyundai-hi", categorySlug: "hydraulic", priceUsd: 450, stock: 6, description: "پمپ هیدرولیک هیوندای HI." },

  // ===== HEAVY: Kobelco =====
  { name: "Kobelco Hydraulic Filter", nameFa: "فیلتر هیدرولیک کوبلکو", sku: "KOB-HF-001", brandSlug: "kobelco", categorySlug: "hydraulic", priceUsd: 50, stock: 55, description: "فیلتر هیدرولیک کوبلکو برای بیل مکانیکی." },
  { name: "Kobelco Cylinder Seal", nameFa: "سیل جک هیدرولیک کوبلکو", sku: "KOB-CS-001", brandSlug: "kobelco", categorySlug: "hydraulic", priceUsd: 86, stock: 30, description: "کیت سیل جک هیدرولیک کوبلکو." },
  { name: "Kobelco Hydraulic Pump", nameFa: "پمپ هیدرولیک کوبلکو", sku: "KOB-HP-001", brandSlug: "kobelco", categorySlug: "hydraulic", priceUsd: 475, stock: 5, description: "پمپ هیدرولیک کوبلکو." },

  // ===== HEAVY: JCB =====
  { name: "JCB Oil Filter", nameFa: "فیلتر روغن موتور JCB", sku: "JCB-OF-001", brandSlug: "jcb", categorySlug: "filters", priceUsd: 32, stock: 80, description: "فیلتر روغن موتور JCB برای بیل بک‌هو." },
  { name: "JCB Hydraulic Filter", nameFa: "فیلتر هیدرولیک JCB", sku: "JCB-HF-001", brandSlug: "jcb", categorySlug: "hydraulic", priceUsd: 45, stock: 65, description: "فیلتر هیدرولیک JCB." },
  { name: "JCB Hydraulic Pump", nameFa: "پمپ هیدرولیک JCB", sku: "JCB-HP-001", brandSlug: "jcb", categorySlug: "hydraulic", priceUsd: 440, stock: 6, description: "پمپ هیدرولیک JCB." },
  { name: "JCB Hydraulic Hose", nameFa: "شلنگ هیدرولیک JCB", sku: "JCB-HH-001", brandSlug: "jcb", categorySlug: "hydraulic", priceUsd: 35, stock: 80, description: "شلنگ هیدرولیک JCB با فشار کاری ۴۰۰ بار." },

  // ===== HEAVY: Case =====
  { name: "Case Oil Filter", nameFa: "فیلتر روغن موتور کیس", sku: "CAS-OF-001", brandSlug: "case", categorySlug: "filters", priceUsd: 30, stock: 70, description: "فیلتر روغن موتور کیس برای تراکتور." },
  { name: "Case Air Filter", nameFa: "فیلتر هوای کیس", sku: "CAS-AF-001", brandSlug: "case", categorySlug: "filters", priceUsd: 48, stock: 50, description: "فیلتر هوای کیس با ظرفیت گردوغبار بالا." },
  { name: "Case Hydraulic Pump", nameFa: "پمپ هیدرولیک کیس", sku: "CAS-HP-001", brandSlug: "case", categorySlug: "hydraulic", priceUsd: 430, stock: 5, description: "پمپ هیدرولیک کیس." },

  // ===== HEAVY: New Holland =====
  { name: "New Holland Oil Filter", nameFa: "فیلتر روغن موتور نیو هالند", sku: "NH-OF-001", brandSlug: "new-holland", categorySlug: "filters", priceUsd: 31, stock: 70, description: "فیلتر روغن موتور نیو هالند برای تراکتور." },
  { name: "New Holland Air Filter", nameFa: "فیلتر هوای نیو هالند", sku: "NH-AF-001", brandSlug: "new-holland", categorySlug: "filters", priceUsd: 50, stock: 55, description: "فیلتر هوای نیو هالند." },
  { name: "New Holland Hydraulic Pump", nameFa: "پمپ هیدرولیک نیو هالند", sku: "NH-HP-001", brandSlug: "new-holland", categorySlug: "hydraulic", priceUsd: 445, stock: 5, description: "پمپ هیدرولیک نیو هالند." },

  // ===== HEAVY: Kubota =====
  { name: "Kubota Oil Filter", nameFa: "فیلتر روغن موتور کوبوتا", sku: "KUB-OF-001", brandSlug: "kubota", categorySlug: "filters", priceUsd: 22, stock: 90, description: "فیلتر روغن موتور کوبوتا برای تراکتور کوچک." },
  { name: "Kubota Air Filter", nameFa: "فیلتر هوای کوبوتا", sku: "KUB-AF-001", brandSlug: "kubota", categorySlug: "filters", priceUsd: 35, stock: 70, description: "فیلتر هوای کوبوتا." },
  { name: "Kubota Water Pump", nameFa: "پمپ آب کوبوتا", sku: "KUB-WP-001", brandSlug: "kubota", categorySlug: "pump", priceUsd: 48, stock: 35, description: "پمپ آب موتور کوبوتا." },

  // ===== HEAVY: Terex =====
  { name: "Terex Hydraulic Filter", nameFa: "فیلتر هیدرولیک ترکس", sku: "TRX-HF-001", brandSlug: "terex", categorySlug: "hydraulic", priceUsd: 54, stock: 45, description: "فیلتر هیدرولیک ترکس برای ماشین‌آلات ساختمانی." },
  { name: "Terex Cylinder Seal", nameFa: "سیل جک هیدرولیک ترکس", sku: "TRX-CS-001", brandSlug: "terex", categorySlug: "hydraulic", priceUsd: 90, stock: 25, description: "کیت سیل جک هیدرولیک ترکس." },

  // ===== HEAVY: Bobcat =====
  { name: "Bobcat Oil Filter", nameFa: "فیلتر روغن موتور بابکت", sku: "BOB-OF-001", brandSlug: "bobcat", categorySlug: "filters", priceUsd: 25, stock: 85, description: "فیلتر روغن موتور بابکت برای بیل مینی." },
  { name: "Bobcat Hydraulic Filter", nameFa: "فیلتر هیدرولیک بابکت", sku: "BOB-HF-001", brandSlug: "bobcat", categorySlug: "hydraulic", priceUsd: 42, stock: 60, description: "فیلتر هیدرولیک بابکت." },
  { name: "Bobcat Hydraulic Hose", nameFa: "شلنگ هیدرولیک بابکت", sku: "BOB-HH-001", brandSlug: "bobcat", categorySlug: "hydraulic", priceUsd: 28, stock: 90, description: "شلنگ هیدرولیک بابکت." },

  // ===== HEAVY: Wirtgen =====
  { name: "Wirtgen Conveyor Belt", nameFa: "تسمه نقاله ویرتگن", sku: "WIR-CB-001", brandSlug: "wirtgen", categorySlug: "conveyor-belt", priceUsd: 310, stock: 12, description: "تسمه نقاله ویرتگن برای ماشین فرز آسفالت." },
  { name: "Wirtgen Oil Filter", nameFa: "فیلتر روغن موتور ویرتگن", sku: "WIR-OF-001", brandSlug: "wirtgen", categorySlug: "filters", priceUsd: 38, stock: 50, description: "فیلتر روغن موتور ویرتگن." },
  { name: "Wirtgen Milling Drum Tool", nameFa: "کاتر فرز ویرتگن", sku: "WIR-MDT-001", brandSlug: "wirtgen", categorySlug: "engine", priceUsd: 185, stock: 80, description: "کاتر فرز ویرتگن با نوک کاربید." },

  // ===== HEAVY: Bomag =====
  { name: "Bomag Oil Filter", nameFa: "فیلتر روغن موتور بومگ", sku: "BOM-OF-001", brandSlug: "bomag", categorySlug: "filters", priceUsd: 35, stock: 60, description: "فیلتر روغن موتور بومگ برای غلتک کمپرسور." },
  { name: "Bomag Hydraulic Filter", nameFa: "فیلتر هیدرولیک بومگ", sku: "BOM-HF-001", brandSlug: "bomag", categorySlug: "hydraulic", priceUsd: 48, stock: 50, description: "فیلتر هیدرولیک بومگ." },
  { name: "Bomag Hydraulic Hose", nameFa: "شلنگ هیدرولیک بومگ", sku: "BOM-HH-001", brandSlug: "bomag", categorySlug: "hydraulic", priceUsd: 32, stock: 70, description: "شلنگ هیدرولیک بومگ." },

  // ===== HEAVY: Ammann =====
  { name: "Ammann Oil Filter", nameFa: "فیلتر روغن موتور آمان", sku: "AMM-OF-001", brandSlug: "ammann", categorySlug: "filters", priceUsd: 33, stock: 55, description: "فیلتر روغن موتور آمان برای غلتک کمپرسور." },
  { name: "Ammann Air Filter", nameFa: "فیلتر هوای آمان", sku: "AMM-AF-001", brandSlug: "ammann", categorySlug: "filters", priceUsd: 52, stock: 45, description: "فیلتر هوای آمان." },
  { name: "Ammann Vibrator", nameFa: "لرزاننده آمان", sku: "AMM-VB-001", brandSlug: "ammann", categorySlug: "engine", priceUsd: 145, stock: 18, description: "موتور لرزاننده آمان برای غلتک." },

  // ===== HEAVY: Sandvik =====
  { name: "Sandvik Rock Drill Bit", nameFa: "کاتر سنگ سندویک", sku: "SDV-RB-001", brandSlug: "sandvik", categorySlug: "engine", priceUsd: 240, stock: 20, description: "کاتر سنگ سندویک با نوک کاربید برای حفاری." },
  { name: "Sandvik Hydraulic Filter", nameFa: "فیلتر هیدرولیک سندویک", sku: "SDV-HF-001", brandSlug: "sandvik", categorySlug: "hydraulic", priceUsd: 56, stock: 40, description: "فیلتر هیدرولیک سندویک." },
  { name: "Sandvik Conveyor Belt", nameFa: "تسمه نقاله سندویک", sku: "SDV-CB-001", brandSlug: "sandvik", categorySlug: "conveyor-belt", priceUsd: 295, stock: 10, description: "تسمه نقاله سندویک برای معدن." },

  // ===== HEAVY: Atlas Copco =====
  { name: "Atlas Copco Oil Filter", nameFa: "فیلتر روغن موتور اطلس کوپکو", sku: "AC-OF-001", brandSlug: "atlas-copco", categorySlug: "filters", priceUsd: 38, stock: 55, description: "فیلتر روغن کمپرسور اطلس کوپکو." },
  { name: "Atlas Copco Air Filter", nameFa: "فیلتر هوای اطلس کوپکو", sku: "AC-AF-001", brandSlug: "atlas-copco", categorySlug: "filters", priceUsd: 62, stock: 45, description: "فیلتر هوای کمپرسور اطلس کوپکو." },
  { name: "Atlas Copco Control Valve", nameFa: "شیر کنترل اطلس کوپکو", sku: "AC-CV-001", brandSlug: "atlas-copco", categorySlug: "valves", priceUsd: 85, stock: 30, description: "شیر کنترل کمپرسور اطلس کوپکو." },

  // ===== HEAVY: Metso =====
  { name: "Metso Control Valve", nameFa: "شیر کنترل متسو", sku: "MET-CV-001", brandSlug: "metso", categorySlug: "valves", priceUsd: 115, stock: 22, description: "شیر کنترل متسو برای صنایع معدنی." },
  { name: "Metso Hydraulic Filter", nameFa: "فیلتر هیدرولیک متسو", sku: "MET-HF-001", brandSlug: "metso", categorySlug: "hydraulic", priceUsd: 58, stock: 35, description: "فیلتر هیدرولیک متسو." },
  { name: "Metso Conveyor Belt", nameFa: "تسمه نقاله متسو", sku: "MET-CB-001", brandSlug: "metso", categorySlug: "conveyor-belt", priceUsd: 340, stock: 8, description: "تسمه نقاله متسو برای کارخانه سنگ‌شکن." },

  // ===== HEAVY: Sany =====
  { name: "Sany Oil Filter", nameFa: "فیلتر روغن موتور سانی", sku: "SNY-OF-001", brandSlug: "sany", categorySlug: "filters", priceUsd: 30, stock: 60, description: "فیلتر روغن موتور سانی." },
  { name: "Sany Hydraulic Filter", nameFa: "فیلتر هیدرولیک سانی", sku: "SNY-HF-001", brandSlug: "sany", categorySlug: "hydraulic", priceUsd: 44, stock: 50, description: "فیلتر هیدرولیک سانی." },
  { name: "Sany Hydraulic Pump", nameFa: "پمپ هیدرولیک سانی", sku: "SNY-HP-001", brandSlug: "sany", categorySlug: "hydraulic", priceUsd: 420, stock: 5, description: "پمپ هیدرولیک سانی." },

  // ===== HEAVY: XCMG =====
  { name: "XCMG Oil Filter", nameFa: "فیلتر روغن موتور XCMG", sku: "XCM-OF-001", brandSlug: "xcmg", categorySlug: "filters", priceUsd: 28, stock: 60, description: "فیلتر روغن موتور XCMG." },
  { name: "XCMG Hydraulic Filter", nameFa: "فیلتر هیدرولیک XCMG", sku: "XCM-HF-001", brandSlug: "xcmg", categorySlug: "hydraulic", priceUsd: 42, stock: 50, description: "فیلتر هیدرولیک XCMG." },
  { name: "XCMG Hydraulic Pump", nameFa: "پمپ هیدرولیک XCMG", sku: "XCM-HP-001", brandSlug: "xcmg", categorySlug: "hydraulic", priceUsd: 410, stock: 5, description: "پمپ هیدرولیک XCMG." },

  // ===== HEAVY: LiuGong =====
  { name: "LiuGong Oil Filter", nameFa: "فیلتر روغن موتور لیوگونگ", sku: "LIG-OF-001", brandSlug: "liugong", categorySlug: "filters", priceUsd: 29, stock: 60, description: "فیلتر روغن موتور لیوگونگ." },
  { name: "LiuGong Hydraulic Filter", nameFa: "فیلتر هیدرولیک لیوگونگ", sku: "LIG-HF-001", brandSlug: "liugong", categorySlug: "hydraulic", priceUsd: 43, stock: 50, description: "فیلتر هیدرولیک لیوگونگ." },
  { name: "LiuGong Hydraulic Pump", nameFa: "پمپ هیدرولیک لیوگونگ", sku: "LIG-HP-001", brandSlug: "liugong", categorySlug: "hydraulic", priceUsd: 415, stock: 5, description: "پمپ هیدرولیک لیوگونگ." },

  // ===== OIL/GAS: Schlumberger =====
  { name: "Schlumberger Control Valve", nameFa: "شیر کنترل اشلومبرژه", sku: "SLB-CV-001", brandSlug: "schlumberger", categorySlug: "valves", priceUsd: 1850, stock: 6, featured: true, description: "شیر کنترل اشلومبرژه برای چاه‌های نفت با فشار بالا." },
  { name: "Schlumberger Pressure Sensor", nameFa: "سنسور فشار اشلومبرژه", sku: "SLB-PS-001", brandSlug: "schlumberger", categorySlug: "instrumentation", priceUsd: 680, stock: 12, description: "سنسور فشار اشلومبرژه برای محیط‌های خورنده." },
  { name: "Schlumberger Pressure Gauge", nameFa: "مانومتر اشلومبرژه", sku: "SLB-PG-001", brandSlug: "schlumberger", categorySlug: "instrumentation", priceUsd: 245, stock: 20, description: "مانومتر اشلومبرژه با دقت ۰.۱٪." },

  // ===== OIL/GAS: Halliburton =====
  { name: "Halliburton Cementing Pump", nameFa: "پمپ سیمان‌کاری هالیبرتن", sku: "HAL-CP-001", brandSlug: "halliburton", categorySlug: "pump", priceUsd: 8500, stock: 2, description: "پمپ سیمان‌کاری هالیبرتن برای عملیات سیمان‌کاری چاه." },
  { name: "Halliburton Control Valve", nameFa: "شیر کنترل هالیبرتن", sku: "HAL-CV-001", brandSlug: "halliburton", categorySlug: "valves", priceUsd: 1620, stock: 8, description: "شیر کنترل هالیبرتن با تحمل فشار ۱۰۰۰۰ psi." },
  { name: "Halliburton Temperature Sensor", nameFa: "سنسور دما هالیبرتن", sku: "HAL-TS-001", brandSlug: "halliburton", categorySlug: "instrumentation", priceUsd: 540, stock: 14, description: "سنسور دما هالیبرتن برای محیط‌های دما بالا." },

  // ===== OIL/GAS: Baker Hughes =====
  { name: "Baker Hughes Control Valve", nameFa: "شیر کنترل بیکر هیوز", sku: "BKR-CV-001", brandSlug: "baker-hughes", categorySlug: "valves", priceUsd: 1750, stock: 7, description: "شیر کنترل بیکر هیوز با دوام بالا." },
  { name: "Baker Hughes Pressure Sensor", nameFa: "سنسور فشار بیکر هیوز", sku: "BKR-PS-001", brandSlug: "baker-hughes", categorySlug: "instrumentation", priceUsd: 620, stock: 12, description: "سنسور فشار بیکر هیوز." },
  { name: "Baker Hughes Pressure Gauge", nameFa: "مانومتر بیکر هیوز", sku: "BKR-PG-001", brandSlug: "baker-hughes", categorySlug: "instrumentation", priceUsd: 230, stock: 18, description: "مانومتر بیکر هیوز." },

  // ===== OIL/GAS: Weatherford =====
  { name: "Weatherford Control Valve", nameFa: "شیر کنترل ودرفورد", sku: "WFD-CV-001", brandSlug: "weatherford", categorySlug: "valves", priceUsd: 1480, stock: 9, description: "شیر کنترل ودرفورد." },
  { name: "Weatherford Flow Sensor", nameFa: "سنسور جریان ودرفورد", sku: "WFD-FS-001", brandSlug: "weatherford", categorySlug: "instrumentation", priceUsd: 720, stock: 10, description: "سنسور جریان ودرفورد برای اندازه‌گیری دقیق." },

  // ===== OIL/GAS: ABB =====
  { name: "ABB Electric Motor", nameFa: "الکتروموتور ABB", sku: "ABB-EM-001", brandSlug: "abb", categorySlug: "electric-motor", priceUsd: 850, stock: 14, featured: true, description: "الکتروموتور ۳ فاز ABB ۳۰ کیلووات." },
  { name: "ABB VFD Inverter", nameFa: "اینورتر ABB", sku: "ABB-VFD-001", brandSlug: "abb", categorySlug: "electrical", priceUsd: 2400, stock: 8, description: "اینورتر ABB ACS580 برای کنترل سرعت موتور." },
  { name: "ABB Contactor", nameFa: "کنتاکتور ABB", sku: "ABB-CT-001", brandSlug: "abb", categorySlug: "electrical", priceUsd: 85, stock: 60, description: "کنتاکتور ABB ۴۰ آمپر." },
  { name: "ABB Miniature Breaker", nameFa: "کلید مینیاتوری ABB", sku: "ABB-MB-001", brandSlug: "abb", categorySlug: "electrical", priceUsd: 35, stock: 120, description: "کلید مینیاتوری ABB ۱۶ آمپر." },

  // ===== OIL/GAS: Siemens Energy =====
  { name: "Siemens Energy Control Valve", nameFa: "شیر کنترل زیمنس انرژی", sku: "SIE-EN-CV-001", brandSlug: "siemens-energy", categorySlug: "valves", priceUsd: 1280, stock: 10, description: "شیر کنترل زیمنس انرژی برای پالایشگاه." },
  { name: "Siemens Energy Pressure Sensor", nameFa: "سنسور فشار زیمنس انرژی", sku: "SIE-EN-PS-001", brandSlug: "siemens-energy", categorySlug: "instrumentation", priceUsd: 580, stock: 14, description: "سنسور فشار زیمنس انرژی." },
  { name: "Siemens Energy VFD", nameFa: "اینورتر زیمنس انرژی", sku: "SIE-EN-VFD-001", brandSlug: "siemens-energy", categorySlug: "electrical", priceUsd: 2200, stock: 6, description: "اینورتر زیمنس انرژی SINAMICS." },

  // ===== OIL/GAS: Emerson =====
  { name: "Emerson Pressure Sensor", nameFa: "سنسور فشار امرسون", sku: "EMR-PS-001", brandSlug: "emerson", categorySlug: "instrumentation", priceUsd: 540, stock: 14, description: "سنسور فشار امرسون سری Rosemount." },
  { name: "Emerson Control Valve", nameFa: "شیر کنترل امرسون", sku: "EMR-CV-001", brandSlug: "emerson", categorySlug: "valves", priceUsd: 1450, stock: 8, description: "شیر کنترل امرسون Fisher." },
  { name: "Emerson Transmitter", nameFa: "ترانسمیتر امرسون", sku: "EMR-TR-001", brandSlug: "emerson", categorySlug: "instrumentation", priceUsd: 680, stock: 10, description: "ترانسمیتر دما و فشار امرسون." },

  // ===== OIL/GAS: Honeywell =====
  { name: "Honeywell Temperature Sensor", nameFa: "سنسور دما هانیول", sku: "HON-TS-001", brandSlug: "honeywell", categorySlug: "instrumentation", priceUsd: 420, stock: 16, description: "سنسور دما هانیول برای صنایع نفت و گاز." },
  { name: "Honeywell Controller", nameFa: "کنترلر هانیول", sku: "HON-CT-001", brandSlug: "honeywell", categorySlug: "instrumentation", priceUsd: 950, stock: 8, description: "کنترلر هانیول برای اتوماسیون صنعتی." },
  { name: "Honeywell Control Valve", nameFa: "شیر کنترل هانیول", sku: "HON-CV-001", brandSlug: "honeywell", categorySlug: "valves", priceUsd: 1320, stock: 7, description: "شیر کنترل هانیول." },

  // ===== OIL/GAS: Flowserve =====
  { name: "Flowserve Centrifugal Pump", nameFa: "پمپ سانتریفیوژ فلو سرو", sku: "FLS-CP-001", brandSlug: "flowserve", categorySlug: "pump", priceUsd: 4800, stock: 4, featured: true, description: "پمپ سانتریفیوژ فلو سرو برای انتقال سیالات." },
  { name: "Flowserve Control Valve", nameFa: "شیر کنترل فلو سرو", sku: "FLS-CV-001", brandSlug: "flowserve", categorySlug: "valves", priceUsd: 1650, stock: 8, description: "شیر کنترل فلو سرو." },
  { name: "Flowserve Mechanical Seal", nameFa: "مکانیکال سیل فلو سرو", sku: "FLS-MS-001", brandSlug: "flowserve", categorySlug: "pump", priceUsd: 280, stock: 22, description: "مکانیکال سیل فلو سرو برای پمپ‌های صنعتی." },

  // ===== OIL/GAS: Cameron =====
  { name: "Cameron Gate Valve", nameFa: "شیر گیت کامرون", sku: "CAM-GV-001", brandSlug: "cameron", categorySlug: "valves", priceUsd: 1820, stock: 6, description: "شیر گیت کامرون برای خطوط لوله." },
  { name: "Cameron Ball Valve", nameFa: "شیر توپی کامرون", sku: "CAM-BV-001", brandSlug: "cameron", categorySlug: "valves", priceUsd: 2150, stock: 4, description: "شیر توپی کامرون با تحمل فشار بالا." },
  { name: "Cameron Seal Kit", nameFa: "کیت سیل کامرون", sku: "CAM-SK-001", brandSlug: "cameron", categorySlug: "valves", priceUsd: 145, stock: 25, description: "کیت سیل کامرون برای شیرهای گازی." },

  // ===== OIL/GAS: FMC Technologies =====
  { name: "FMC Control Valve", nameFa: "شیر کنترل FMC", sku: "FMC-CV-001", brandSlug: "fmc-technologies", categorySlug: "valves", priceUsd: 1580, stock: 7, description: "شیر کنترل FMC Technologies." },
  { name: "FMC Fitting", nameFa: "اتصال FMC", sku: "FMC-FI-001", brandSlug: "fmc-technologies", categorySlug: "valves", priceUsd: 320, stock: 30, description: "اتصال FMC Technologies برای خطوط لوله." },
  { name: "FMC Seal Kit", nameFa: "کیت سیل FMC", sku: "FMC-SK-001", brandSlug: "fmc-technologies", categorySlug: "valves", priceUsd: 135, stock: 28, description: "کیت سیل FMC Technologies." },

  // ===== OIL/GAS: NOV =====
  { name: "NOV Centrifugal Pump", nameFa: "پمپ گریز از مرکز NOV", sku: "NOV-CP-001", brandSlug: "nov", categorySlug: "pump", priceUsd: 5200, stock: 3, description: "پمپ گریز از مرکز NOV برای گنیوه." },
  { name: "NOV Control Valve", nameFa: "شیر کنترل NOV", sku: "NOV-CV-001", brandSlug: "nov", categorySlug: "valves", priceUsd: 1480, stock: 8, description: "شیر کنترل NOV." },
  { name: "NOV Seal Kit", nameFa: "کیت سیل NOV", sku: "NOV-SK-001", brandSlug: "nov", categorySlug: "valves", priceUsd: 165, stock: 22, description: "کیت سیل NOV." },

  // ===== OIL/GAS: Weir Group =====
  { name: "Weir Group Pump", nameFa: "پمپ ویر", sku: "WEI-PUMP-001", brandSlug: "weir-group", categorySlug: "pump", priceUsd: 4500, stock: 4, description: "پمپ ویر برای صنایع معدنی." },
  { name: "Weir Group Control Valve", nameFa: "شیر کنترل ویر", sku: "WEI-CV-001", brandSlug: "weir-group", categorySlug: "valves", priceUsd: 1390, stock: 8, description: "شیر کنترل ویر." },
  { name: "Weir Group Mechanical Seal", nameFa: "مکانیکال سیل ویر", sku: "WEI-MS-001", brandSlug: "weir-group", categorySlug: "pump", priceUsd: 265, stock: 20, description: "مکانیکال سیل ویر." },

  // ===== OIL/GAS: Spirax Sarco =====
  { name: "Spirax Sarco Steam Valve", nameFa: "شیر بخار اسپیرکس سارکو", sku: "SPI-SV-001", brandSlug: "spirax-sarco", categorySlug: "valves", priceUsd: 580, stock: 16, description: "شیر بخار اسپیرکس سارکو برای خطوط بخار." },
  { name: "Spirax Sarco Steam Trap", nameFa: "تله بخار اسپیرکس سارکو", sku: "SPI-ST-001", brandSlug: "spirax-sarco", categorySlug: "valves", priceUsd: 245, stock: 30, description: "تله بخار اسپیرکس سارکو." },
  { name: "Spirax Sarco Control Valve", nameFa: "شیر کنترل اسپیرکس سارکو", sku: "SPI-CV-001", brandSlug: "spirax-sarco", categorySlug: "valves", priceUsd: 720, stock: 12, description: "شیر کنترل اسپیرکس سارکو." },

  // ===== OIL/GAS: Parker Hannifin =====
  { name: "Parker Hydraulic Hose", nameFa: "شلنگ هیدرولیک پارکر", sku: "PH-HH-001", brandSlug: "parker-hannifin", categorySlug: "hydraulic", priceUsd: 45, stock: 80, description: "شلنگ هیدرولیک پارکر با فشار کاری ۴۰۰ بار." },
  { name: "Parker Fitting", nameFa: "اتصال پارکر", sku: "PH-FI-001", brandSlug: "parker-hannifin", categorySlug: "hydraulic", priceUsd: 28, stock: 150, description: "اتصال پارکر برای شلنگ‌های هیدرولیک." },
  { name: "Parker Control Valve", nameFa: "شیر کنترل پارکر", sku: "PH-CV-001", brandSlug: "parker-hannifin", categorySlug: "valves", priceUsd: 385, stock: 18, description: "شیر کنترل پارکر جهت‌دار." },
  { name: "Parker Seal", nameFa: "سیل پارکر", sku: "PH-SE-001", brandSlug: "parker-hannifin", categorySlug: "hydraulic", priceUsd: 18, stock: 200, description: "سیل پارکر O-Ring." },

  // ===== INDUSTRIAL: Siemens =====
  { name: "Siemens Electric Motor", nameFa: "الکتروموتور زیمنس", sku: "SIE-EM-001", brandSlug: "siemens", categorySlug: "electric-motor", priceUsd: 780, stock: 16, featured: true, description: "الکتروموتور ۳ فاز زیمنس ۲۲ کیلووات." },
  { name: "Siemens VFD Inverter", nameFa: "اینورتر زیمنس", sku: "SIE-VFD-001", brandSlug: "siemens", categorySlug: "electrical", priceUsd: 2100, stock: 8, description: "اینورتر زیمنس SINAMICS G120." },
  { name: "Siemens Contactor", nameFa: "کنتاکتور زیمنس", sku: "SIE-CT-001", brandSlug: "siemens", categorySlug: "electrical", priceUsd: 75, stock: 80, description: "کنتاکتور زیمنس ۳۲ آمپر." },
  { name: "Siemens MCB", nameFa: "کلید اتومات زیمنس", sku: "SIE-MCB-001", brandSlug: "siemens", categorySlug: "electrical", priceUsd: 32, stock: 130, description: "کلید اتومات زیمنس ۱۶ آمپر." },
  { name: "Siemens PLC", nameFa: "پی‌ال‌سی زیمنس", sku: "SIE-PLC-001", brandSlug: "siemens", categorySlug: "electrical", priceUsd: 1450, stock: 6, description: "پی‌ال‌سی زیمنس S7-1200." },

  // ===== INDUSTRIAL: Schneider Electric =====
  { name: "Schneider MCB", nameFa: "کلید اتومات اشنایدر", sku: "SCH-MCB-001", brandSlug: "schneider-electric", categorySlug: "electrical", priceUsd: 28, stock: 150, description: "کلید اتومات اشنایدر Acti9." },
  { name: "Schneider Contactor", nameFa: "کنتاکتور اشنایدر", sku: "SCH-CT-001", brandSlug: "schneider-electric", categorySlug: "electrical", priceUsd: 65, stock: 90, description: "کنتاکتور اشنایدر ۲۵ آمپر." },
  { name: "Schneider VFD", nameFa: "اینورتر اشنایدر", sku: "SCH-VFD-001", brandSlug: "schneider-electric", categorySlug: "electrical", priceUsd: 1850, stock: 8, description: "اینورتر اشنایدر Altivar 320." },
  { name: "Schneider Miniature Breaker", nameFa: "کلید مینیاتوری اشنایدر", sku: "SCH-MB-001", brandSlug: "schneider-electric", categorySlug: "electrical", priceUsd: 22, stock: 200, description: "کلید مینیاتوری اشنایدر ۱۰ آمپر." },

  // ===== INDUSTRIAL: Eaton =====
  { name: "Eaton MCB", nameFa: "کلید اتومات ایتون", sku: "EAT-MCB-001", brandSlug: "eaton", categorySlug: "electrical", priceUsd: 35, stock: 120, description: "کلید اتومات ایتون ۲۰ آمپر." },
  { name: "Eaton Contactor", nameFa: "کنتاکتور ایتون", sku: "EAT-CT-001", brandSlug: "eaton", categorySlug: "electrical", priceUsd: 78, stock: 70, description: "کنتاکتور ایتون ۴۰ آمپر." },
  { name: "Eaton VFD", nameFa: "اینورتر ایتون", sku: "EAT-VFD-001", brandSlug: "eaton", categorySlug: "electrical", priceUsd: 1950, stock: 6, description: "اینورتر ایتون PowerXL." },
  { name: "Eaton UPS", nameFa: "یوپی‌اس ایتون", sku: "EAT-UPS-001", brandSlug: "eaton", categorySlug: "electrical", priceUsd: 850, stock: 12, description: "یوپی‌اس ایتون ۳ کاوا ۳ فاز." },

  // ===== INDUSTRIAL: Bosch Rexroth =====
  { name: "Bosch Rexroth Hydraulic Pump", nameFa: "پمپ هیدرولیک بوش رکسروت", sku: "BR-HP-001", brandSlug: "bosch-rexroth", categorySlug: "hydraulic", priceUsd: 1250, stock: 8, featured: true, description: "پمپ هیدرولیک پیستونی بوش رکسروت A10VSO." },
  { name: "Bosch Rexroth Hydraulic Valve", nameFa: "شیر هیدرولیک بوش رکسروت", sku: "BR-HV-001", brandSlug: "bosch-rexroth", categorySlug: "hydraulic", priceUsd: 680, stock: 14, description: "شیر کنترل هیدرولیک بوش رکسروت ۴.way 3.position." },
  { name: "Bosch Rexroth Hydraulic Cylinder", nameFa: "سیلندر هیدرولیک بوش رکسروت", sku: "BR-HC-001", brandSlug: "bosch-rexroth", categorySlug: "hydraulic", priceUsd: 540, stock: 10, description: "جک هیدرولیک بوش رکسروت با کورس ۵۰۰ میلی‌متر." },
  { name: "Bosch Rexroth Hydraulic Motor", nameFa: "موتور هیدرولیک بوش رکسروت", sku: "BR-HM-001", brandSlug: "bosch-rexroth", categorySlug: "hydraulic", priceUsd: 1850, stock: 5, description: "موتور هیدرولیک بوش رکسروت A6VM." },

  // ===== INDUSTRIAL: Danfoss =====
  { name: "Danfoss VFD", nameFa: "اینورتر دانفوس", sku: "DAN-VFD-001", brandSlug: "danfoss", categorySlug: "electrical", priceUsd: 1750, stock: 8, description: "اینورتر دانفوس FC-302." },
  { name: "Danfoss Control Valve", nameFa: "شیر کنترل دانفوس", sku: "DAN-CV-001", brandSlug: "danfoss", categorySlug: "valves", priceUsd: 420, stock: 22, description: "شیر کنترل دانفوس برای سیستم‌های حرارتی." },
  { name: "Danfoss Pump", nameFa: "پمپ دانفوس", sku: "DAN-PU-001", brandSlug: "danfoss", categorySlug: "pump", priceUsd: 680, stock: 12, description: "پمپ دانفوس برای سیستم‌های صنعتی." },
  { name: "Danfoss Pressure Sensor", nameFa: "سنسور فشار دانفوس", sku: "DAN-PS-001", brandSlug: "danfoss", categorySlug: "instrumentation", priceUsd: 245, stock: 24, description: "سنسور فشار دانفوس MBS3000." },

  // ===== INDUSTRIAL: Yaskawa =====
  { name: "Yaskawa VFD", nameFa: "اینورتر یاسکاوا", sku: "YAS-VFD-001", brandSlug: "yaskawa", categorySlug: "electrical", priceUsd: 2050, stock: 6, description: "اینورتر یاسکاوا A1000." },
  { name: "Yaskawa Servo Motor", nameFa: "سروو موتور یاسکاوا", sku: "YAS-SM-001", brandSlug: "yaskawa", categorySlug: "electric-motor", priceUsd: 1450, stock: 8, description: "سروو موتور یاسکاوا ۲ کیلووات." },
  { name: "Yaskawa Servo Drive", nameFa: "سروو درایو یاسکاوا", sku: "YAS-SD-001", brandSlug: "yaskawa", categorySlug: "electrical", priceUsd: 1280, stock: 6, description: "سروو درایو یاسکاوا SGDV." },

  // ===== INDUSTRIAL: Mitsubishi Electric =====
  { name: "Mitsubishi VFD", nameFa: "اینورتر میتسوبیشی", sku: "MIT-VFD-001", brandSlug: "mitsubishi-electric", categorySlug: "electrical", priceUsd: 1900, stock: 7, description: "اینورتر میتسوبیشی FR-A800." },
  { name: "Mitsubishi PLC", nameFa: "پی‌ال‌سی میتسوبیشی", sku: "MIT-PLC-001", brandSlug: "mitsubishi-electric", categorySlug: "electrical", priceUsd: 980, stock: 8, description: "پی‌ال‌سی میتسوبیشی FX5U." },
  { name: "Mitsubishi Servo Motor", nameFa: "سروو موتور میتسوبیشی", sku: "MIT-SM-001", brandSlug: "mitsubishi-electric", categorySlug: "electric-motor", priceUsd: 1320, stock: 6, description: "سروو موتور میتسوبیشی HG-KR." },
  { name: "Mitsubishi Contactor", nameFa: "کنتاکتور میتسوبیشی", sku: "MIT-CT-001", brandSlug: "mitsubishi-electric", categorySlug: "electrical", priceUsd: 58, stock: 60, description: "کنتاکتور میتسوبیشی ۳۲ آمپر." },

  // ===== INDUSTRIAL: Omron =====
  { name: "Omron PLC", nameFa: "پی‌ال‌سی اومرون", sku: "OMR-PLC-001", brandSlug: "omron", categorySlug: "electrical", priceUsd: 850, stock: 10, description: "پی‌ال‌سی اومرون CP1H." },
  { name: "Omron Proximity Sensor", nameFa: "سنسور نزدیکی اومرون", sku: "OMR-PS-001", brandSlug: "omron", categorySlug: "instrumentation", priceUsd: 85, stock: 60, description: "سنسور نزدیکی القایی اومرون E2E." },
  { name: "Omron Photoelectric Sensor", nameFa: "سنسور فوتوالکتریک اومرون", sku: "OMR-PH-001", brandSlug: "omron", categorySlug: "instrumentation", priceUsd: 120, stock: 40, description: "سنسور فوتوالکتریک اومرون E3Z." },
  { name: "Omron Timer", nameFa: "تایمر اومرون", sku: "OMR-TM-001", brandSlug: "omron", categorySlug: "electrical", priceUsd: 42, stock: 90, description: "تایمر اومرون H3Y." },

  // ===== INDUSTRIAL: Festo =====
  { name: "Festo Pneumatic Cylinder", nameFa: "سیلندر پنوماتیک فستو", sku: "FES-PC-001", brandSlug: "festo", categorySlug: "hydraulic", priceUsd: 185, stock: 30, description: "سیلندر پنوماتیک فستو ADVU." },
  { name: "Festo Pneumatic Valve", nameFa: "شیر پنوماتیک فستو", sku: "FES-PV-001", brandSlug: "festo", categorySlug: "valves", priceUsd: 145, stock: 35, description: "شیر پنوماتیک فستو VUVG." },
  { name: "Festo Air Filter", nameFa: "فیلتر هوا فستو", sku: "FES-AF-001", brandSlug: "festo", categorySlug: "filters", priceUsd: 68, stock: 40, description: "فیلتر هوا فستو LF." },
  { name: "Festo Solenoid Valve", nameFa: "شیر برقی فستو", sku: "FES-SV-001", brandSlug: "festo", categorySlug: "valves", priceUsd: 98, stock: 45, description: "شیر برقی پنوماتیک فستو VUVS." },

  // ===== INDUSTRIAL: SMC =====
  { name: "SMC Pneumatic Cylinder", nameFa: "سیلندر پنوماتیک SMC", sku: "SMC-PC-001", brandSlug: "smc", categorySlug: "hydraulic", priceUsd: 165, stock: 35, description: "سیلندر پنوماتیک SMC CDQ2." },
  { name: "SMC Solenoid Valve", nameFa: "شیر برقی SMC", sku: "SMC-SV-001", brandSlug: "smc", categorySlug: "valves", priceUsd: 125, stock: 40, description: "شیر برقی SMC SY5000." },
  { name: "SMC Air Filter", nameFa: "فیلتر هوا SMC", sku: "SMC-AF-001", brandSlug: "smc", categorySlug: "filters", priceUsd: 58, stock: 45, description: "فیلتر هوا SMC AW30." },
  { name: "SMC Pressure Regulator", nameFa: "رگلاتور فشار SMC", sku: "SMC-PR-001", brandSlug: "smc", categorySlug: "instrumentation", priceUsd: 85, stock: 50, description: "رگلاتور فشار SMC AR30." },

  // ===== INDUSTRIAL: Norgren =====
  { name: "Norgren Pneumatic Cylinder", nameFa: "سیلندر پنوماتیک نورگرن", sku: "NOR-PC-001", brandSlug: "norgren", categorySlug: "hydraulic", priceUsd: 175, stock: 28, description: "سیلندر پنوماتیک نورگرن PRA." },
  { name: "Norgren Solenoid Valve", nameFa: "شیر برقی نورگرن", sku: "NOR-SV-001", brandSlug: "norgren", categorySlug: "valves", priceUsd: 135, stock: 32, description: "شیر برقی نورگرن ۱۵۲." },
  { name: "Norgren Air Filter", nameFa: "فیلتر هوا نورگرن", sku: "NOR-AF-001", brandSlug: "norgren", categorySlug: "filters", priceUsd: 62, stock: 38, description: "فیلتر هوا نورگرن Olympian Plus." },

  // ===== INDUSTRIAL: Legris =====
  { name: "Legris Pneumatic Fitting", nameFa: "اتصال پنوماتیک لگریس", sku: "LEG-FI-001", brandSlug: "legris", categorySlug: "hydraulic", priceUsd: 18, stock: 250, description: "اتصال پنوماتیک لگریس سری ۳۱۰." },
  { name: "Legris Pneumatic Hose", nameFa: "شلنگ پنوماتیک لگریس", sku: "LEG-HO-001", brandSlug: "legris", categorySlug: "hydraulic", priceUsd: 12, stock: 300, description: "شلنگ پنوماتیک لگریس ۸ میلی‌متر." },
  { name: "Legris Push-in Fitting", nameFa: "فیتینگ لگریس", sku: "LEG-PF-001", brandSlug: "legris", categorySlug: "coupling", priceUsd: 15, stock: 280, description: "فیتینگ پنوماتیک لگریس Push-in." },

  // ===== INDUSTRIAL: Camozzi =====
  { name: "Camozzi Pneumatic Cylinder", nameFa: "سیلندر پنوماتیک کاموتسی", sku: "CAM-PC-001", brandSlug: "camozzi", categorySlug: "hydraulic", priceUsd: 155, stock: 30, description: "سیلندر پنوماتیک کاموتسی سری ۲۴." },
  { name: "Camozzi Solenoid Valve", nameFa: "شیر برقی کاموتسی", sku: "CAM-SV-001", brandSlug: "camozzi", categorySlug: "valves", priceUsd: 115, stock: 35, description: "شیر برقی کاموتسی سری ۹." },
  { name: "Camozzi Air Filter", nameFa: "فیلتر هوا کاموتسی", sku: "CAM-AF-001", brandSlug: "camozzi", categorySlug: "filters", priceUsd: 55, stock: 42, description: "فیلتر هوا کاموتسی سری ۳۱." },

  // ===== INDUSTRIAL: SEW-Eurodrive =====
  { name: "SEW Industrial Gearbox", nameFa: "گیربکس صنعتی SEW", sku: "SEW-IG-001", brandSlug: "sew-eurodrive", categorySlug: "industrial-gearbox", priceUsd: 1450, stock: 8, featured: true, description: "گیربکس صنعتی SEW Helical-Bevel K37." },
  { name: "SEW Gearmotor", nameFa: "الکتروموتور گیربکسی SEW", sku: "SEW-GM-001", brandSlug: "sew-eurodrive", categorySlug: "electric-motor", priceUsd: 1850, stock: 6, description: "الکتروموتور گیربکسی SEW K37DV100." },
  { name: "SEW VFD", nameFa: "اینورتر SEW", sku: "SEW-VFD-001", brandSlug: "sew-eurodrive", categorySlug: "electrical", priceUsd: 2150, stock: 5, description: "اینورتر SEW MOVITRAC." },

  // ===== INDUSTRIAL: NORD Drivesystems =====
  { name: "NORD Industrial Gearbox", nameFa: "گیربکس صنعتی NORD", sku: "NORD-IG-001", brandSlug: "nord-drivesystems", categorySlug: "industrial-gearbox", priceUsd: 1280, stock: 8, description: "گیربکس صنعتی NORD Helical-Bevel." },
  { name: "NORD Gearmotor", nameFa: "الکتروموتور گیربکسی NORD", sku: "NORD-GM-001", brandSlug: "nord-drivesystems", categorySlug: "electric-motor", priceUsd: 1650, stock: 6, description: "الکتروموتور گیربکسی NORD." },
  { name: "NORD VFD", nameFa: "اینورتر NORD", sku: "NORD-VFD-001", brandSlug: "nord-drivesystems", categorySlug: "electrical", priceUsd: 1950, stock: 5, description: "اینورتر NORD NORDAC." },

  // ===== INDUSTRIAL: Bonfiglioli =====
  { name: "Bonfiglioli Industrial Gearbox", nameFa: "گیربکس صنعتی بونفیلیولی", sku: "BON-IG-001", brandSlug: "bonfiglioli", categorySlug: "industrial-gearbox", priceUsd: 1620, stock: 6, description: "گیربکس صنعتی بونفیلیولی C302." },
  { name: "Bonfiglioli Gearmotor", nameFa: "الکتروموتور گیربکسی بونفیلیولی", sku: "BON-GM-001", brandSlug: "bonfiglioli", categorySlug: "electric-motor", priceUsd: 1950, stock: 5, description: "الکتروموتور گیربکسی بونفیلیولی." },
  { name: "Bonfiglioli Reducer Gearbox", nameFa: "گیربکس کاهنده بونفیلیولی", sku: "BON-RG-001", brandSlug: "bonfiglioli", categorySlug: "industrial-gearbox", priceUsd: 1380, stock: 6, description: "گیربکس کاهنده بونفیلیولی برای صنایع سنگین." },

  // ===== INDUSTRIAL: Lenze =====
  { name: "Lenze VFD", nameFa: "اینورتر لنتسه", sku: "LEN-VFD-001", brandSlug: "lenze", categorySlug: "electrical", priceUsd: 1850, stock: 6, description: "اینورتر لنتسه i550." },
  { name: "Lenze Industrial Gearbox", nameFa: "گیربکس صنعتی لنتسه", sku: "LEN-IG-001", brandSlug: "lenze", categorySlug: "industrial-gearbox", priceUsd: 1320, stock: 7, description: "گیربکس صنعتی لنتسه g500." },
  { name: "Lenze Electric Motor", nameFa: "الکتروموتور لنتسه", sku: "LEN-EM-001", brandSlug: "lenze", categorySlug: "electric-motor", priceUsd: 1480, stock: 8, description: "الکتروموتور ۳ فاز لنتسه ۱۸.۵ کیلووات." },

  // ===== INDUSTRIAL: Vacon =====
  { name: "Vacon VFD", nameFa: "اینورتر واکون", sku: "VAC-VFD-001", brandSlug: "vacon", categorySlug: "electrical", priceUsd: 1750, stock: 6, description: "اینورتر واکون 100 X." },
  { name: "Vacon Industrial VFD", nameFa: "اینورتر صنعتی واکون", sku: "VAC-IV-001", brandSlug: "vacon", categorySlug: "electrical", priceUsd: 2250, stock: 4, description: "اینورتر صنعتی واکون NXP." },
];

// ---------------------------------------------------------------------------
// SEED FUNCTION
// ---------------------------------------------------------------------------
async function main() {
  console.log("================================================");
  console.log(" HEAVIX Store — Comprehensive Seed");
  console.log("================================================");
  const t0 = Date.now();

  // -- 1) Currency setting (idempotent)
  await storeDb.currencySetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      defaultRate: 230000,
      marginPercent: 3,
      autoUpdateEnabled: true,
      autoSource: "telegram",
    },
  });

  // Today's currency rate (Tehran tz)
  const now = new Date();
  const tehran = new Date(now.getTime() + (3.5 * 60 + now.getTimezoneOffset()) * 60000);
  const today = `${tehran.getUTCFullYear()}-${String(tehran.getUTCMonth() + 1).padStart(2, "0")}-${String(tehran.getUTCDate()).padStart(2, "0")}`;
  await storeDb.currencyRate.upsert({
    where: { date: today },
    update: {},
    create: { date: today, rate: 230000, marginPercent: 3, source: "MANUAL", note: "نرخ اولیه" },
  });
  console.log(`[currency] singleton + rate for ${today} ✓`);

  // -- 2) Categories (upsert by slug)
  const catMap: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await storeDb.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, nameFa: c.nameFa, icon: c.icon ?? null },
      create: { name: c.name, nameFa: c.nameFa, slug: c.slug, icon: c.icon ?? null },
    });
    catMap[c.slug] = row.id;
  }
  console.log(`[categories] ${CATEGORIES.length} upserted ✓`);

  // -- 3) Brands (upsert by slug)
  const brandMap: Record<string, string> = {};
  for (const b of ALL_BRANDS) {
    const row = await storeDb.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, nameFa: b.nameFa, country: b.country, active: true },
      create: { name: b.name, nameFa: b.nameFa, slug: b.slug, country: b.country, active: true },
    });
    brandMap[b.slug] = row.id;
  }
  console.log(`[brands] ${ALL_BRANDS.length} upserted ✓`);
  console.log(`           - auto:        ${AUTO_BRANDS.length}`);
  console.log(`           - heavy:       ${HEAVY_BRANDS.length}`);
  console.log(`           - oil/gas:     ${OIL_GAS_BRANDS.length}`);
  console.log(`           - industrial:  ${INDUSTRIAL_BRANDS.length}`);

  // -- 4) Car models (upsert by brand+model via findFirst)
  let cmCount = 0;
  for (const cm of CAR_MODELS) {
    const existing = await storeDb.carModel.findFirst({
      where: { brand: cm.brand, model: cm.model },
    });
    if (existing) {
      cmCount++;
      continue;
    }
    await storeDb.carModel.create({ data: cm });
    cmCount++;
  }
  console.log(`[car-models] ${cmCount} upserted ✓`);

  // -- 5) Parts (upsert by SKU)
  let partsCreated = 0;
  let partsUpdated = 0;
  let partsSkipped = 0;
  let idx = 0;

  for (const p of PARTS) {
    idx++;
    const brandId = brandMap[p.brandSlug];
    const categoryId = catMap[p.categorySlug];
    if (!brandId || !categoryId) {
      console.warn(`  ! skip "${p.sku}" — missing brand/category`);
      partsSkipped++;
      continue;
    }

    const stock = p.stock ?? Math.floor(5 + Math.random() * 45);
    const featured = !!p.featured;

    try {
      const existed = await storeDb.part.findUnique({ where: { sku: p.sku } });
      if (existed) {
        await storeDb.part.update({
          where: { sku: p.sku },
          data: {
            name: p.name,
            nameFa: p.nameFa,
            categoryId,
            brandId,
            description: p.description,
            priceUsd: p.priceUsd,
            oldPriceUsd: p.oldPriceUsd ?? null,
            stock,
            featured,
            active: true,
            compatibleCars: p.compatibleCars
              ? JSON.stringify(p.compatibleCars)
              : "[]",
          },
        });
        partsUpdated++;
      } else {
        await storeDb.part.create({
          data: {
            name: p.name,
            nameFa: p.nameFa,
            sku: p.sku,
            categoryId,
            brandId,
            description: p.description,
            priceUsd: p.priceUsd,
            oldPriceUsd: p.oldPriceUsd ?? null,
            stock,
            lowStockThreshold: 5,
            images: "[]",
            compatibleCars: p.compatibleCars
              ? JSON.stringify(p.compatibleCars)
              : "[]",
            active: true,
            featured,
          },
        });
        partsCreated++;
      }
    } catch (e: any) {
      console.error(`  ! part "${p.sku}" failed: ${e.message}`);
      partsSkipped++;
    }
  }
  console.log(`[parts] ${partsCreated} created, ${partsUpdated} updated, ${partsSkipped} skipped (${PARTS.length} total defined) ✓`);

  // -- Summary
  const finalBrands = await storeDb.brand.count();
  const finalCats = await storeDb.category.count();
  const finalParts = await storeDb.part.count();
  const finalCarModels = await storeDb.carModel.count();
  const featuredParts = await storeDb.part.count({ where: { featured: true } });

  console.log("");
  console.log("================================================");
  console.log(" SEED COMPLETE");
  console.log("================================================");
  console.log(`  Brands       : ${finalBrands}`);
  console.log(`  Categories   : ${finalCats}`);
  console.log(`  Car models   : ${finalCarModels}`);
  console.log(`  Parts        : ${finalParts}  (featured: ${featuredParts})`);
  console.log(`  Elapsed      : ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await storeDb.$disconnect();
  });
