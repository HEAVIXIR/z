/* MACHINE-TAXONOMY-SEED — DEFINITIVE machine taxonomy restructure
   Root: existing category slug="machinery" (name="۰۱ ماشین‌آلات")
   Restructures the machinery tree to match the definitive reference document:
   - 16 L1 groups (level=1, parentId=machinery)
   - ~172 L2 families (level=2)
   - ~97 L3 variants (level=3)

   CRITICAL RULES:
   - NEVER delete categories that have listings (9 categories: excavator, loader,
     bulldozer, grader, road-roller, concrete-machinery, dump-truck, crane, forklift).
   - Upsert by slug. Update name/parent/sortOrder/level/taxPath. Create new if missing.
   - Old L1 groups that don't fit the new 16-group structure → mark active:false
     (forestry-machinery, conveying, drilling-rigs, crushing-screening,
      forklift-warehouse, recycling, port-machinery, industrial-machinery,
      special-machinery).
   - layer="CATALOG", domain="MACHINE" for all entries.

   Run: bunx tsx prisma/seed-machine-taxonomy.ts
*/

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
type L3 = { name: string; slug: string };
type L2 = { name: string; slug: string; l3?: L3[] };
type L1 = { name: string; slug: string; sortOrder: number; l2: L2[] };

// ────────────────────────────────────────────────────────────
// THE DEFINITIVE TREE — 16 L1 groups
// ────────────────────────────────────────────────────────────
const TREE: L1[] = [
  // ─── 01 road-construction (14 L2) ───────────────────────
  {
    name: "۰۱ ماشین‌آلات راهسازی و عمرانی",
    slug: "road-construction",
    sortOrder: 1,
    l2: [
      {
        name: "بیل مکانیکی",
        slug: "excavator",
        l3: [
          { name: "زنجیری", slug: "excavator-chain" },
          { name: "چرخ لاستیکی", slug: "excavator-wheel" },
          { name: "مینی بیل", slug: "mini-excavator" },
          { name: "Long Reach", slug: "excavator-long-reach" },
          { name: "Mining", slug: "excavator-mining" },
          { name: "Demolition", slug: "excavator-demolition" },
          { name: "Material Handling", slug: "excavator-material-handling" },
          { name: "Spider", slug: "excavator-spider" },
          { name: "Zero Tail Swing", slug: "excavator-zero-tail-swing" },
          { name: "شعاع‌بلند", slug: "excavator-long-radius" },
          { name: "تلسکوپی", slug: "excavator-telescopic" },
          { name: "تخصصی", slug: "excavator-special" },
        ],
      },
      {
        name: "لودر",
        slug: "loader",
        l3: [
          { name: "چرخ لاستیکی", slug: "wheel-loader" },
          { name: "زنجیری", slug: "track-loader" },
          { name: "کامپکت", slug: "compact-loader" },
          { name: "Skid Steer", slug: "skid-steer-loader" },
          { name: "Compact Track", slug: "compact-track-loader" },
          { name: "تلسکوپی", slug: "telehandler-loader" },
          { name: "صنعتی", slug: "industrial-loader" },
          { name: "معدنی", slug: "mining-loader" },
          { name: "زیرزمینی", slug: "underground-loader" },
          { name: "چندمنظوره", slug: "multi-purpose-loader" },
        ],
      },
      {
        name: "بولدوزر",
        slug: "bulldozer",
        l3: [
          { name: "زنجیری", slug: "dozer-track" },
          { name: "چرخ لاستیکی", slug: "dozer-wheel" },
          { name: "Mini", slug: "mini-dozer" },
          { name: "Heavy", slug: "heavy-dozer" },
          { name: "Mining", slug: "mining-dozer" },
          { name: "Pipe", slug: "pipe-dozer" },
          { name: "Angle", slug: "angle-dozer" },
          { name: "Swamp", slug: "swamp-dozer" },
        ],
      },
      {
        name: "گریدر",
        slug: "grader",
        l3: [
          { name: "موتور گریدر", slug: "motor-grader" },
          { name: "کوچک", slug: "compact-grader" },
          { name: "سنگین", slug: "heavy-grader" },
          { name: "معدنی", slug: "mining-grader" },
          { name: "مخصوص معدن", slug: "quarry-grader" },
          { name: "GPS", slug: "gps-grader" },
        ],
      },
      {
        name: "بکهو لودر",
        slug: "backhoe-loader",
        l3: [
          { name: "Backhoe Loader", slug: "backhoe-loader-standard" },
          { name: "4WD", slug: "backhoe-4wd" },
          { name: "Center Mount", slug: "backhoe-center-mount" },
          { name: "Side Shift", slug: "backhoe-side-shift" },
          { name: "Compact", slug: "compact-backhoe" },
          { name: "Industrial", slug: "industrial-backhoe" },
        ],
      },
      {
        name: "اسکریپر",
        slug: "scraper",
        l3: [
          { name: "Motor Scraper", slug: "motor-scraper" },
          { name: "Towed", slug: "towed-scraper" },
          { name: "Open Bowl", slug: "open-bowl-scraper" },
          { name: "Elevating", slug: "elevating-scraper" },
          { name: "Twin Engine", slug: "twin-engine-scraper" },
          { name: "Mining", slug: "mining-scraper" },
        ],
      },
      {
        name: "غلتک",
        slug: "road-roller",
        l3: [
          { name: "تک‌درام", slug: "single-drum-roller" },
          { name: "دو‌درام", slug: "double-drum-roller" },
          { name: "ویبره", slug: "vibratory-roller" },
          { name: "پنوماتیک", slug: "pneumatic-roller" },
          { name: "خاک", slug: "soil-roller" },
          { name: "آسفالت", slug: "asphalt-roller" },
          { name: "ترکیبی", slug: "combination-roller" },
        ],
      },
      { name: "ماشین‌آلات تسطیح و خاکبرداری", slug: "grading-earthmoving" },
      { name: "ماشین‌آلات آسفالت", slug: "asphalt-machinery" },
      { name: "ماشین‌آلات بتن", slug: "concrete-machinery" },
      { name: "ماشین‌آلات شمع‌کوبی و پی‌سازی", slug: "piling-foundation" },
      { name: "ماشین‌آلات حمل کارگاهی", slug: "site-haulage" },
      { name: "ماشین‌آلات چندمنظوره عمرانی", slug: "multi-purpose-civil" },
      { name: "سایر ماشین‌آلات عمرانی", slug: "other-civil" },
    ],
  },

  // ─── 02 mining-machinery (15 L2) ────────────────────────
  {
    name: "۰۲ ماشین‌آلات معدنی",
    slug: "mining-machinery",
    sortOrder: 2,
    l2: [
      {
        name: "دامپتراک معدنی",
        slug: "mining-dump-truck",
        l3: [
          { name: "Rigid", slug: "rigid-mining-truck" },
          { name: "Articulated", slug: "articulated-mining-truck" },
          { name: "Underground", slug: "underground-dump-truck" },
          { name: "Electric", slug: "electric-mining-truck" },
          { name: "Diesel", slug: "diesel-mining-truck" },
          { name: "Hybrid", slug: "hybrid-mining-truck" },
          { name: "Ultra-Class", slug: "ultra-class-mining-truck" },
        ],
      },
      { name: "بیل معدنی", slug: "mining-excavator-machine" },
      {
        name: "شاول",
        slug: "shovel",
        l3: [
          { name: "Hydraulic", slug: "hydraulic-shovel" },
          { name: "Electric Rope", slug: "electric-rope-shovel" },
          { name: "Mining", slug: "mining-shovel" },
          { name: "Front", slug: "front-shovel" },
          { name: "Backhoe", slug: "backhoe-shovel" },
        ],
      },
      { name: "لودر معدنی", slug: "mining-loader-machine" },
      { name: "ماشین‌آلات بارگیری", slug: "loading-machinery" },
      { name: "ماشین‌آلات استخراج", slug: "extraction-machinery" },
      { name: "ماشین‌آلات حمل معدنی", slug: "mining-transport" },
      { name: "ماشین‌آلات زیرزمینی", slug: "underground-machinery" },
      {
        name: "LHD",
        slug: "lhd",
        l3: [
          { name: "Diesel", slug: "diesel-lhd" },
          { name: "Electric", slug: "electric-lhd" },
          { name: "Battery", slug: "battery-lhd" },
          { name: "Low Profile", slug: "low-profile-lhd" },
        ],
      },
      { name: "ماشین‌آلات حفاری معدنی", slug: "mining-drilling" },
      { name: "ماشین‌آلات انفجار و خرج‌گذاری", slug: "blasting-machinery" },
      { name: "ماشین‌آلات نگهداری معدن", slug: "mine-maintenance" },
      { name: "ماشین‌آلات فرآوری سیار", slug: "mobile-processing" },
      { name: "ماشین‌آلات خدمات معدن", slug: "mine-services" },
      { name: "سایر ماشین‌آلات معدنی", slug: "other-mining" },
    ],
  },

  // ─── 03 drilling (13 L2) ────────────────────────────────
  {
    name: "۰۳ ماشین‌آلات حفاری",
    slug: "drilling",
    sortOrder: 3,
    l2: [
      { name: "Drill Rig", slug: "drill-rig" },
      { name: "Rotary Drill", slug: "rotary-drill" },
      { name: "DTH Drill", slug: "dth-drill" },
      { name: "Top Hammer Drill", slug: "top-hammer-drill" },
      { name: "Core Drill", slug: "core-drill" },
      { name: "RC Drill", slug: "rc-drill" },
      { name: "Water Well Drill", slug: "water-well-drill" },
      { name: "Oil & Gas Drilling", slug: "oil-gas-drilling" },
      { name: "Geotechnical Drill", slug: "geotechnical-drill" },
      { name: "Blast Hole Drill", slug: "blast-hole-drill" },
      { name: "Underground Drill", slug: "underground-drill" },
      { name: "Jumbo Drill", slug: "jumbo-drill" },
      { name: "Drilling Accessories", slug: "drilling-accessories" },
    ],
  },

  // ─── 04 crushing-processing (18 L2) ─────────────────────
  {
    name: "۰۴ خردایش، دانه‌بندی و فرآوری",
    slug: "crushing-processing",
    sortOrder: 4,
    l2: [
      { name: "سنگ‌شکن فکی", slug: "jaw-crusher" },
      { name: "سنگ‌شکن مخروطی", slug: "cone-crusher" },
      { name: "سنگ‌شکن ضربه‌ای", slug: "impact-crusher" },
      { name: "کوبیت", slug: "cubiti-crusher" },
      { name: "سنگ‌شکن چکشی", slug: "hammer-crusher" },
      { name: "سنگ‌شکن ژیراتوری", slug: "gyratory-crusher" },
      { name: "سنگ‌شکن غلتکی", slug: "roll-crusher" },
      { name: "سرند", slug: "screen" },
      { name: "فیدر", slug: "feeder" },
      { name: "نوار نقاله", slug: "conveyor" },
      { name: "اسکالپر", slug: "scalper" },
      { name: "دستگاه شست‌وشو", slug: "washing-plant" },
      { name: "ماسه‌شور", slug: "sand-washer" },
      { name: "هیدروسیکلون", slug: "hydrocyclone" },
      { name: "تجهیزات مغناطیسی", slug: "magnetic-equipment" },
      { name: "خطوط خردایش", slug: "crushing-line" },
      { name: "خطوط دانه‌بندی", slug: "screening-line" },
      { name: "خطوط فرآوری سیار", slug: "mobile-processing-line" },
    ],
  },

  // ─── 05 concrete-asphalt (12 L2) ────────────────────────
  {
    name: "۰۵ ماشین‌آلات بتن و آسفالت",
    slug: "concrete-asphalt",
    sortOrder: 5,
    l2: [
      { name: "بچینگ پلانت", slug: "batching-plant" },
      { name: "تراک میکسر", slug: "transit-mixer" },
      {
        name: "پمپ بتن",
        slug: "concrete-pump",
        l3: [
          { name: "Truck Mounted", slug: "truck-mounted-pump" },
          { name: "Trailer", slug: "trailer-pump" },
          { name: "Line", slug: "line-pump" },
          { name: "Boom", slug: "boom-pump" },
          { name: "Stationary", slug: "stationary-pump" },
        ],
      },
      { name: "میکسر بتن", slug: "concrete-mixer" },
      { name: "شاتکریت", slug: "shotcrete" },
      { name: "ماشین‌آلات تولید بتن", slug: "concrete-production" },
      { name: "تجهیزات بتن‌ریزی", slug: "concrete-placing" },
      {
        name: "آسفالت فینیشر",
        slug: "asphalt-finisher",
        l3: [
          { name: "چرخ زنجیری", slug: "track-paver" },
          { name: "چرخ لاستیکی", slug: "wheel-paver" },
          { name: "Mini", slug: "mini-paver" },
          { name: "Highway", slug: "highway-paver" },
        ],
      },
      { name: "کارخانه آسفالت", slug: "asphalt-plant" },
      { name: "ماشین‌آلات پخش آسفالت", slug: "asphalt-distributor" },
      { name: "ماشین‌آلات بازیافت آسفالت", slug: "asphalt-recycling" },
      { name: "تجهیزات قیر", slug: "bitumen-equipment" },
    ],
  },

  // ─── 06 cranes-lifting (14 L2) ──────────────────────────
  {
    name: "۰۶ جرثقیل، بالابر و لیفتینگ",
    slug: "cranes-lifting",
    sortOrder: 6,
    l2: [
      { name: "جرثقیل موبایل", slug: "mobile-crane" },
      { name: "جرثقیل زنجیری", slug: "crawler-crane" },
      { name: "جرثقیل کامیونی", slug: "truck-crane" },
      { name: "جرثقیل تلسکوپی", slug: "telescopic-crane" },
      { name: "جرثقیل Rough Terrain", slug: "rough-terrain-crane" },
      { name: "جرثقیل All Terrain", slug: "all-terrain-crane" },
      { name: "جرثقیل Tower", slug: "tower-crane" },
      { name: "جرثقیل دریایی", slug: "marine-crane" },
      { name: "جرثقیل صنعتی", slug: "industrial-crane" },
      { name: "جرثقیل سقفی", slug: "overhead-crane" },
      { name: "جرثقیل دروازه‌ای", slug: "gantry-crane" },
      { name: "وینچ", slug: "winch" },
      { name: "بالابر", slug: "hoist" },
      { name: "تجهیزات لیفتینگ", slug: "lifting-equipment" },
    ],
  },

  // ─── 07 forklift-material (9 L2) ────────────────────────
  {
    name: "۰۷ لیفتراک و جابه‌جایی مواد",
    slug: "forklift-material",
    sortOrder: 7,
    l2: [
      {
        name: "لیفتراک",
        slug: "forklift",
        l3: [
          { name: "Diesel", slug: "diesel-forklift" },
          { name: "LPG", slug: "lpg-forklift" },
          { name: "Gasoline", slug: "gasoline-forklift" },
          { name: "Electric", slug: "electric-forklift" },
          { name: "Heavy Duty", slug: "heavy-duty-forklift" },
          { name: "Rough Terrain", slug: "rough-terrain-forklift" },
          { name: "Side Loader", slug: "side-loader-forklift" },
          { name: "Container", slug: "container-forklift" },
        ],
      },
      { name: "Reach Truck", slug: "reach-truck" },
      { name: "Pallet Truck", slug: "pallet-truck" },
      { name: "Stackers", slug: "stackers" },
      { name: "Telehandler", slug: "telehandler" },
      { name: "Material Handler", slug: "material-handler" },
      { name: "Container Handler", slug: "container-handler" },
      { name: "Reach Stacker", slug: "reach-stacker" },
      { name: "تجهیزات انبار", slug: "warehouse-equipment" },
    ],
  },

  // ─── 08 industrial-haulage (8 L2) ───────────────────────
  {
    name: "۰۸ ماشین‌آلات حمل و باربری صنعتی",
    slug: "industrial-haulage",
    sortOrder: 8,
    l2: [
      { name: "دامپتراک کارگاهی", slug: "site-dump-truck" },
      { name: "ماشین حمل کارگاهی", slug: "site-transport" },
      { name: "Haul Truck", slug: "haul-truck" },
      { name: "Off-Highway Truck", slug: "off-highway-truck" },
      { name: "کامیون معدنی", slug: "mining-truck" },
      { name: "کشنده صنعتی", slug: "industrial-tractor" },
      { name: "ماشین حمل فوق‌سنگین", slug: "heavy-haulage" },
      { name: "ماشین حمل پروژه", slug: "project-transport" },
    ],
  },

  // ─── 09 port-marine (9 L2) ──────────────────────────────
  {
    name: "۰۹ ماشین‌آلات بندری و دریایی",
    slug: "port-marine",
    sortOrder: 9,
    l2: [
      { name: "Reach Stacker", slug: "port-reach-stacker" },
      { name: "Empty Container Handler", slug: "empty-container-handler" },
      { name: "Straddle Carrier", slug: "straddle-carrier" },
      { name: "Port Crane", slug: "port-crane" },
      { name: "Ship Loader", slug: "ship-loader" },
      { name: "Ship Unloader", slug: "ship-unloader" },
      { name: "Mobile Harbor Crane", slug: "mobile-harbor-crane" },
      { name: "تجهیزات بارگیری بندری", slug: "port-loading-equipment" },
      { name: "تجهیزات خدمات دریایی", slug: "marine-service-equipment" },
    ],
  },

  // ─── 10 recycling-waste (11 L2) ─────────────────────────
  {
    name: "۱۰ ماشین‌آلات بازیافت و پسماند",
    slug: "recycling-waste",
    sortOrder: 10,
    l2: [
      { name: "دستگاه خردکن", slug: "shredder-machine" },
      { name: "Shredder", slug: "industrial-shredder" },
      { name: "Baler", slug: "baler" },
      { name: "Sorting Machine", slug: "sorting-machine" },
      { name: "Recycling Plant", slug: "recycling-plant" },
      { name: "Waste Compactor", slug: "waste-compactor" },
      { name: "Glass Recycling", slug: "glass-recycling" },
      { name: "Plastic Recycling", slug: "plastic-recycling" },
      { name: "Metal Recycling", slug: "metal-recycling" },
      { name: "Construction Waste Recycling", slug: "construction-waste-recycling" },
      { name: "Asphalt Recycling", slug: "asphalt-recycling-machine" },
    ],
  },

  // ─── 11 tunnel-underground (10 L2) ──────────────────────
  {
    name: "۱۱ ماشین‌آلات تونل و زیرزمینی",
    slug: "tunnel-underground",
    sortOrder: 11,
    l2: [
      { name: "Tunnel Boring Machine", slug: "tbm" },
      { name: "Roadheader", slug: "roadheader" },
      { name: "Jumbo Drill", slug: "tunnel-jumbo" },
      { name: "Underground LHD", slug: "underground-lhd" },
      { name: "Underground Truck", slug: "underground-truck-machine" },
      { name: "Bolter", slug: "bolter" },
      { name: "Shotcrete Machine", slug: "shotcrete-machine" },
      { name: "Scaling Machine", slug: "scaling-machine" },
      { name: "Underground Utility Vehicle", slug: "underground-utility-vehicle" },
      { name: "Tunnel Equipment", slug: "tunnel-equipment" },
    ],
  },

  // ─── 12 industrial-heavy (10 L2) ────────────────────────
  {
    name: "۱۲ ماشین‌آلات صنعتی و تولیدی سنگین",
    slug: "industrial-heavy",
    sortOrder: 12,
    l2: [
      { name: "ماشین‌آلات فولاد", slug: "steel-machinery" },
      { name: "ماشین‌آلات سیمان", slug: "cement-machinery" },
      { name: "ماشین‌آلات معدن و فرآوری", slug: "mineral-processing-machinery" },
      { name: "ماشین‌آلات سنگ‌بری", slug: "stone-cutting-machinery" },
      { name: "ماشین‌آلات شیشه", slug: "glass-machinery" },
      { name: "ماشین‌آلات سرامیک", slug: "ceramic-machinery" },
      { name: "ماشین‌آلات تولید صنعتی", slug: "industrial-production" },
      { name: "ماشین‌آلات بسته‌بندی صنعتی", slug: "industrial-packaging" },
      { name: "ماشین‌آلات خطوط تولید", slug: "production-line" },
      { name: "تجهیزات کارخانه‌ای سنگین", slug: "heavy-factory-equipment" },
    ],
  },

  // ─── 13 power-energy (8 L2) ─────────────────────────────
  {
    name: "۱۳ نیرو، انرژی و تأسیسات سیار",
    slug: "power-energy",
    sortOrder: 13,
    l2: [
      {
        name: "ژنراتور",
        slug: "generator",
        l3: [
          { name: "Diesel", slug: "diesel-generator" },
          { name: "Gas", slug: "gas-generator" },
          { name: "Natural Gas", slug: "natural-gas-generator" },
          { name: "Bi-Fuel", slug: "bi-fuel-generator" },
          { name: "Hybrid", slug: "hybrid-generator" },
          { name: "Mobile", slug: "mobile-generator" },
          { name: "Silent", slug: "silent-generator" },
          { name: "Containerized", slug: "containerized-generator" },
          { name: "Trailer", slug: "trailer-generator" },
        ],
      },
      { name: "کمپرسور", slug: "compressor" },
      { name: "پمپ", slug: "pump" },
      { name: "Power Pack", slug: "power-pack" },
      { name: "تجهیزات برق سیار", slug: "portable-power" },
      { name: "تجهیزات جوشکاری صنعتی", slug: "industrial-welding" },
      { name: "تجهیزات روشنایی پروژه", slug: "project-lighting" },
      { name: "تجهیزات سرمایش و گرمایش صنعتی", slug: "industrial-hvac" },
    ],
  },

  // ─── 14 municipal-environment (9 L2) ────────────────────
  {
    name: "۱۴ ماشین‌آلات خدمات شهری و محیط‌زیست",
    slug: "municipal-environment",
    sortOrder: 14,
    l2: [
      { name: "ماشین حمل زباله", slug: "garbage-truck" },
      { name: "جاروب شهری", slug: "street-sweeper" },
      { name: "ماشین شست‌وشوی خیابان", slug: "street-washer" },
      { name: "ماشین مکنده", slug: "vacuum-truck" },
      { name: "ماشین برف‌روب", slug: "snow-plow" },
      { name: "ماشین نمک‌پاش", slug: "salt-spreader" },
      { name: "ماشین خدمات شهری", slug: "municipal-service-truck" },
      { name: "تجهیزات فضای سبز سنگین", slug: "heavy-green-space" },
      { name: "ماشین‌آلات محیط‌زیست", slug: "environmental-machinery" },
    ],
  },

  // ─── 15 special-project (7 L2) ──────────────────────────
  {
    name: "۱۵ ماشین‌آلات ویژه پروژه",
    slug: "special-project",
    sortOrder: 15,
    l2: [
      { name: "ماشین‌آلات امدادی صنعتی", slug: "industrial-rescue" },
      { name: "ماشین‌آلات مهندسی نظامی غیرنظامی", slug: "military-engineering" },
      { name: "ماشین‌آلات آتش‌نشانی صنعتی", slug: "industrial-fire-truck" },
      { name: "ماشین‌آلات فرودگاهی", slug: "airport-machinery" },
      { name: "ماشین‌آلات پروژه‌های خاص", slug: "special-project-machinery" },
      { name: "ماشین‌آلات سفارشی", slug: "custom-machinery" },
      { name: "Prototype/Special Purpose", slug: "prototype-machinery" },
    ],
  },

  // ─── 16 other-special-machines (5 L2) ───────────────────
  {
    name: "۱۶ سایر ماشین‌آلات تخصصی",
    slug: "other-special-machines",
    sortOrder: 16,
    l2: [
      { name: "ماشین تخصصی جدید", slug: "new-special" },
      { name: "ماشین ناشناخته", slug: "unknown-machine" },
      { name: "ماشین ترکیبی", slug: "combination-machine" },
      { name: "ماشین سفارشی", slug: "custom-machine" },
      { name: "نیازمند بررسی", slug: "needs-review" },
    ],
  },
];

// ────────────────────────────────────────────────────────────
// Old L1 slugs under machinery that do NOT exist in the new 16-group structure.
// These are renamed or removed → mark active:false (NEVER delete).
// ────────────────────────────────────────────────────────────
const OLD_L1_TO_DEACTIVATE = [
  "forestry-machinery",   // removed (forestry = Application/Industry, not a machine category)
  "conveying",            // removed (نوار نقاله moved to crushing-processing L2 as `conveyor`)
  "drilling-rigs",        // renamed → drilling
  "crushing-screening",   // renamed → crushing-processing
  "forklift-warehouse",   // renamed → forklift-material
  "recycling",            // renamed → recycling-waste
  "port-machinery",       // renamed → port-marine
  "industrial-machinery", // renamed → industrial-heavy
  "special-machinery",    // renamed → other-special-machines
];

// ────────────────────────────────────────────────────────────
// Upsert helper — upsert by slug, set parent/name/level/taxPath/sortOrder/layer/domain/active
// ────────────────────────────────────────────────────────────
async function upsertCat(
  name: string,
  slug: string,
  parentId: string | null,
  level: number,
  taxPath: string,
  sortOrder: number,
  layer = "CATALOG",
  domain = "MACHINE",
  active = true
) {
  return db.category.upsert({
    where: { slug },
    create: { name, slug, parentId, level, taxPath, sortOrder, layer, domain, active },
    update: { name, parentId, level, taxPath, sortOrder, layer, domain, active },
  });
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 MACHINE-TAXONOMY-SEED: definitive machine taxonomy restructure...\n");

  // 1. Locate machinery root (must already exist)
  const root = await db.category.findUnique({ where: { slug: "machinery" } });
  if (!root) {
    throw new Error(
      'machinery root category not found. Run seed-taxonomy-v11.ts first to create the "machinery" root.'
    );
  }
  // Normalize root: taxPath="machinery", level=0
  await db.category.update({
    where: { id: root.id },
    data: { taxPath: "machinery", level: 0, layer: "CATALOG", domain: "MACHINE" },
  });
  console.log(`✓ Root: ${root.slug} (id=${root.id}) taxPath=machinery level=0\n`);

  // 2. Snapshot listings-on-categories BEFORE restructure (for verification)
  const listingsBefore = await db.listing.findMany({
    where: { category: { parent: { parentId: root.id } } },
    select: { id: true, title: true, categoryId: true, category: { select: { slug: true, name: true } } },
  });
  console.log(`📋 Listings attached to machinery-tree categories (BEFORE): ${listingsBefore.length}`);
  const beforeByCatSlug = new Map<string, number>();
  for (const l of listingsBefore) {
    const s = l.category?.slug ?? "(null)";
    beforeByCatSlug.set(s, (beforeByCatSlug.get(s) ?? 0) + 1);
  }
  for (const [slug, n] of beforeByCatSlug) console.log(`   ${slug}: ${n}`);
  console.log();

  // 3. Upsert the 16 L1 groups + their L2/L3 subtrees
  let l1Created = 0, l1Updated = 0;
  let l2Created = 0, l2Updated = 0;
  let l3Created = 0, l3Updated = 0;

  for (const l1 of TREE) {
    const existed = await db.category.findUnique({ where: { slug: l1.slug } });
    const l1Cat = await upsertCat(
      l1.name,
      l1.slug,
      root.id,
      1,
      `machinery.${l1.slug}`,
      l1.sortOrder
    );
    if (existed) l1Updated++; else l1Created++;

    for (let i = 0; i < l1.l2.length; i++) {
      const l2 = l1.l2[i];
      const l2Existed = await db.category.findUnique({ where: { slug: l2.slug } });
      const l2Cat = await upsertCat(
        l2.name,
        l2.slug,
        l1Cat.id,
        2,
        `machinery.${l1.slug}.${l2.slug}`,
        i + 1
      );
      if (l2Existed) l2Updated++; else l2Created++;

      if (l2.l3 && l2.l3.length > 0) {
        for (let j = 0; j < l2.l3.length; j++) {
          const l3 = l2.l3[j];
          const l3Existed = await db.category.findUnique({ where: { slug: l3.slug } });
          await upsertCat(
            l3.name,
            l3.slug,
            l2Cat.id,
            3,
            `machinery.${l1.slug}.${l2.slug}.${l3.slug}`,
            j + 1
          );
          if (l3Existed) l3Updated++; else l3Created++;
        }
      }
    }
  }
  console.log(
    `✓ Upserted 16 L1 groups: ${l1Created} created, ${l1Updated} updated`
  );
  console.log(
    `✓ Upserted L2 families: ${l2Created} created, ${l2Updated} updated`
  );
  console.log(
    `✓ Upserted L3 variants: ${l3Created} created, ${l3Updated} updated\n`
  );

  // 4. Deactivate old L1 groups that don't fit the new 16-group structure
  let deactivated = 0;
  for (const slug of OLD_L1_TO_DEACTIVATE) {
    const cat = await db.category.findUnique({ where: { slug } });
    if (cat) {
      await db.category.update({ where: { id: cat.id }, data: { active: false } });
      deactivated++;
      console.log(`   ✗ Deactivated old L1: ${slug} (id=${cat.id})`);
    }
  }
  console.log(`✓ Deactivated ${deactivated} old L1 groups\n`);

  // 4b. Comprehensive cleanup: deactivate any remaining active category under the
  // machinery tree whose slug is NOT part of the new TREE (and has NO listings).
  // Per CRITICAL RULE #1: "old categories that don't fit the new structure →
  // active:false (but keep)". This catches stale L2/L3 orphans from older seeds
  // (e.g. Persian-suffixed slugs like `excavator-بیل-زنجیری` with stale level=1)
  // that are now superseded by the definitive taxonomy. Categories with listings
  // are ALWAYS preserved (rule #1).
  const treeSlugs = new Set<string>();
  for (const l1 of TREE) {
    treeSlugs.add(l1.slug);
    for (const l2 of l1.l2) {
      treeSlugs.add(l2.slug);
      if (l2.l3) for (const l3 of l2.l3) treeSlugs.add(l3.slug);
    }
  }

  // Walk every active category whose ancestor chain leads back to machinery root.
  // We do this by traversing the tree level by level (SQLite has no recursive CTE
  // via Prisma, so we walk manually).
  let cleanupL2 = 0;
  let cleanupL3 = 0;
  let cleanupDeeper = 0;

  const walkAndClean = async (parentId: string, depth: number) => {
    // Traverse ALL children (active or inactive) so we reach orphans under
    // already-deactivated L1s too. We only DEACTIVATE active ones below.
    const children = await db.category.findMany({
      where: { parentId },
      select: { id: true, slug: true, active: true },
    });
    for (const child of children) {
      // Recurse first (depth-first) so we clean descendants before potentially
      // deactivating this node.
      await walkAndClean(child.id, depth + 1);

      if (!treeSlugs.has(child.slug) && child.active) {
        // This slug is not in the new TREE and is currently active.
        // Safety: NEVER deactivate if it has listings.
        const listingCount = await db.listing.count({ where: { categoryId: child.id } });
        if (listingCount > 0) {
          // Preserved with listings — keep active.
          continue;
        }
        await db.category.update({ where: { id: child.id }, data: { active: false } });
        if (depth === 1) cleanupL2++;
        else if (depth === 2) cleanupL3++;
        else cleanupDeeper++;
      }
    }
  };

  await walkAndClean(root.id, 0);
  console.log(
    `✓ Cleanup: deactivated ${cleanupL2} stale L2 + ${cleanupL3} stale L3 + ${cleanupDeeper} deeper orphans (not in TREE, no listings)\n`
  );

  // 5. Verify listings are still attached (NEVER deleted)
  const listingsAfter = await db.listing.findMany({
    where: { category: { parent: { parentId: root.id } } },
    select: { id: true, title: true, categoryId: true, category: { select: { slug: true, name: true, active: true } } },
  });
  console.log(`📋 Listings attached to machinery-tree categories (AFTER): ${listingsAfter.length}`);
  const afterByCatSlug = new Map<string, number>();
  for (const l of listingsAfter) {
    const s = l.category?.slug ?? "(null)";
    afterByCatSlug.set(s, (afterByCatSlug.get(s) ?? 0) + 1);
  }
  for (const [slug, n] of afterByCatSlug) console.log(`   ${slug}: ${n}`);
  if (listingsAfter.length !== listingsBefore.length) {
    console.warn(
      `⚠ WARNING: listing count changed (${listingsBefore.length} → ${listingsAfter.length})!`
    );
  } else {
    console.log(`✓ All ${listingsAfter.length} listings preserved.\n`);
  }

  // 6. Final counts
  const l1Count = await db.category.count({
    where: { parentId: root.id, active: true },
  });
  const l2Count = await db.category.count({
    where: { parent: { parentId: root.id }, active: true },
  });
  const l3Count = await db.category.count({
    where: { parent: { parent: { parentId: root.id } }, active: true },
  });

  // Also count the 16 expected L1 slugs specifically (sanity)
  const expectedL1Slugs = TREE.map((t) => t.slug);
  const foundL1 = await db.category.findMany({
    where: { slug: { in: expectedL1Slugs } },
    select: { slug: true, active: true, level: true, parentId: true },
  });
  const missingL1 = expectedL1Slugs.filter(
    (s) => !foundL1.find((c) => c.slug === s && c.active && c.level === 1 && c.parentId === root.id)
  );

  const summary = {
    l1: l1Count,
    l2: l2Count,
    l3: l3Count,
    deactivatedOldL1: deactivated,
    listingsPreserved: listingsAfter.length,
    missingL1Slugs: missingL1,
  };
  console.log("════════════════════════════════════════════════════");
  console.log("  MACHINE-TAXONOMY-SEED FINAL COUNTS");
  console.log("════════════════════════════════════════════════════");
  console.log(JSON.stringify(summary, null, 2));
  console.log("════════════════════════════════════════════════════\n");

  if (missingL1.length > 0) {
    throw new Error(`Missing or misconfigured L1 slugs: ${missingL1.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error("✗ SEED FAILED:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
