import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// 14 root categories with full subcategory trees per the specification document
const TAXONOMY: Array<{
  name: string;
  nameEn: string;
  slug: string;
  domain: string;
  icon: string;
  imageUrl: string;
  sortOrder: number;
  children: Array<{ name: string; nameEn?: string; children?: Array<{ name: string; nameEn?: string }> }>;
}> = [
  {
    name: "ماشین‌آلات",
    nameEn: "Machinery",
    slug: "machinery",
    domain: "MACHINE",
    icon: "🚜",
    imageUrl: "/images/machinery/excavator.png",
    sortOrder: 1,
    children: [
      { name: "ماشین‌آلات راه‌سازی و عمرانی", nameEn: "Road Construction", children: [
        { name: "بیل مکانیکی", nameEn: "Excavator" },
        { name: "لودر", nameEn: "Loader" },
        { name: "بولدوزر", nameEn: "Bulldozer" },
        { name: "گریدر", nameEn: "Grader" },
        { name: "بکهو لودر", nameEn: "Backhoe Loader" },
        { name: "اسکریپر", nameEn: "Scraper" },
        { name: "غلتک", nameEn: "Roller" },
        { name: "فینیشر آسفالت", nameEn: "Paver" },
        { name: "ماشین‌آلات آسفالت", nameEn: "Asphalt Machinery" },
        { name: "ماشین‌آلات بتن", nameEn: "Concrete Machinery" },
      ]},
      { name: "ماشین‌آلات معدنی", nameEn: "Mining Machinery", children: [
        { name: "بیل معدنی", nameEn: "Mining Excavator" },
        { name: "دامپ‌تراک", nameEn: "Dump Truck" },
        { name: "لودر معدنی", nameEn: "Mining Loader" },
        { name: "حفاری معدنی", nameEn: "Mining Drill" },
        { name: "ماشین‌آلات زیرزمینی", nameEn: "Underground Equipment" },
        { name: "شاول", nameEn: "Shovel" },
        { name: "ماشین‌آلات استخراج", nameEn: "Extraction Equipment" },
      ]},
      { name: "ماشین‌آلات حفاری", nameEn: "Drilling Equipment", children: [
        { name: "دریل rigs", nameEn: "Drill Rig" },
        { name: "Rotary Drill" },
        { name: "DTH" },
        { name: "Top Hammer" },
        { name: "حفاری چاه", nameEn: "Well Drilling" },
      ]},
      { name: "سنگ‌شکن و دانه‌بندی", nameEn: "Crusher & Screening", children: [
        { name: "سنگ‌شکن فکی", nameEn: "Jaw Crusher" },
        { name: "سنگ‌شکن مخروطی", nameEn: "Cone Crusher" },
        { name: "سنگ‌شکن ضربه‌ای", nameEn: "Impact Crusher" },
        { name: "کوبیت", nameEn: "Cubic Crusher" },
        { name: "سرند", nameEn: "Screen" },
        { name: "نوار نقاله", nameEn: "Conveyor Belt" },
        { name: "خطوط کامل سنگ‌شکنی", nameEn: "Complete Crushing Line" },
      ]},
      { name: "جرثقیل و بالابر", nameEn: "Crane & Lifting", children: [
        { name: "جرثقیل زنجیری", nameEn: "Crawler Crane" },
        { name: "جرثقیل چرخ‌دار", nameEn: "Wheel Crane" },
        { name: "جرثقیل برجی", nameEn: "Tower Crane" },
        { name: "جرثقیل متحرک", nameEn: "Mobile Crane" },
        { name: "جرثقیل سقفی", nameEn: "Overhead Crane" },
      ]},
      { name: "لیفتراک و تجهیزات انبار", nameEn: "Forklift & Warehouse", children: [
        { name: "فورک‌لیفت دیزلی", nameEn: "Diesel Forklift" },
        { name: "فورک‌لیفت برقی", nameEn: "Electric Forklift" },
        { name: "ریچ‌تراک", nameEn: "Reach Truck" },
        { name: "فورک‌لیفت راه‌آهن", nameEn: "Rail Forklift" },
      ]},
      { name: "ماشین‌آلات حمل", nameEn: "Hauling Machinery", children: [
        { name: "دامپ‌تراک راه‌سازی", nameEn: "Road Dump Truck" },
        { name: "دامپ‌تراک معدنی", nameEn: "Mining Dump Truck" },
        { name: "دامپ‌تراک ۶ چرخ", nameEn: "6-Wheel Dump Truck" },
      ]},
      { name: "ماشین‌آلات بازیافت", nameEn: "Recycling Machinery" },
      { name: "ماشین‌آلات بندری", nameEn: "Port Machinery" },
      { name: "ماشین‌آلات جنگلداری", nameEn: "Forestry Machinery" },
      { name: "ماشین‌آلات صنعتی", nameEn: "Industrial Machinery" },
      { name: "ماشین‌آلات خاص", nameEn: "Special Machinery" },
    ],
  },
  {
    name: "خودرو و ناوگان صنعتی",
    nameEn: "Vehicles & Fleet",
    slug: "vehicles",
    domain: "VEHICLE",
    icon: "🚛",
    imageUrl: "/images/machinery/dump-truck.png",
    sortOrder: 2,
    children: [
      { name: "کامیون", nameEn: "Truck" },
      { name: "کمپرسی", nameEn: "Mixer Truck" },
      { name: "کشنده", nameEn: "Tractor Unit" },
      { name: "تریلر", nameEn: "Trailer" },
      { name: "کمرشکن", nameEn: "Lowboy" },
      { name: "بوژی", nameEn: "Bogie" },
      { name: "تانکر", nameEn: "Tanker" },
      { name: "میکسر", nameEn: "Concrete Mixer" },
      { name: "خودروهای معدنی", nameEn: "Mining Vehicles" },
      { name: "خودروهای خدماتی", nameEn: "Service Vehicles" },
      { name: "وانت و پیکاپ صنعتی", nameEn: "Industrial Pickup" },
    ],
  },
  {
    name: "قطعات و لوازم یدکی",
    nameEn: "Parts & Spares",
    slug: "parts",
    domain: "PART",
    icon: "⚙️",
    imageUrl: "/images/sections/parts.png",
    sortOrder: 3,
    children: [
      { name: "موتور", nameEn: "Engine" },
      { name: "هیدرولیک", nameEn: "Hydraulics" },
      { name: "گیربکس و انتقال قدرت", nameEn: "Transmission" },
      { name: "برق و الکترونیک", nameEn: "Electrical" },
      { name: "ECU و کنترلر", nameEn: "ECU & Controller" },
      { name: "زیربندی", nameEn: "Undercarriage" },
      { name: "چرخ و لاستیک", nameEn: "Wheels & Tires" },
      { name: "ترمز", nameEn: "Brakes" },
      { name: "سیستم سوخت", nameEn: "Fuel System" },
      { name: "سیستم خنک‌کاری", nameEn: "Cooling System" },
      { name: "کابین", nameEn: "Cabin" },
      { name: "بدنه", nameEn: "Body" },
      { name: "فیلتر", nameEn: "Filters" },
      { name: "قطعات مصرفی", nameEn: "Consumables" },
      { name: "قطعات OEM", nameEn: "OEM Parts" },
      { name: "قطعات Aftermarket" },
      { name: "قطعات دست‌دوم", nameEn: "Used Parts" },
    ],
  },
  {
    name: "متعلقات و تجهیزات جانبی",
    nameEn: "Attachments",
    slug: "attachments",
    domain: "ATTACHMENT",
    icon: "🔧",
    imageUrl: "/images/sections/services.png",
    sortOrder: 4,
    children: [
      { name: "باکت", nameEn: "Bucket" },
      { name: "چکش هیدرولیکی", nameEn: "Hydraulic Hammer" },
      { name: "ریپر", nameEn: "Ripper" },
      { name: "گریپل", nameEn: "Grapple" },
      { name: "قیچی", nameEn: "Shear" },
      { name: "Pulverizer" },
      { name: "Quick Coupler" },
      { name: "Fork" },
      { name: "Auger" },
      { name: "Blade" },
      { name: "Magnet" },
      { name: "Crusher Bucket" },
    ],
  },
  {
    name: "اجاره ماشین‌آلات و تجهیزات",
    nameEn: "Rental",
    slug: "rental",
    domain: "RENTAL",
    icon: "📋",
    imageUrl: "/images/sections/road-construction.png",
    sortOrder: 5,
    children: [
      { name: "اجاره بیل مکانیکی", nameEn: "Excavator Rental" },
      { name: "اجاره لودر", nameEn: "Loader Rental" },
      { name: "اجاره گریدر", nameEn: "Grader Rental" },
      { name: "اجاره دامپ‌تراک", nameEn: "Dump Truck Rental" },
      { name: "اجاره جرثقیل", nameEn: "Crane Rental" },
      { name: "اجاره فورک‌لیفت", nameEn: "Forklift Rental" },
      { name: "اجاره با اپراتور", nameEn: "Rental with Operator" },
      { name: "اجاره بلندمدت", nameEn: "Long-term Rental" },
    ],
  },
  {
    name: "خدمات فنی و صنعتی",
    nameEn: "Services",
    slug: "services",
    domain: "SERVICE",
    icon: "🛠️",
    imageUrl: "/images/sections/services.png",
    sortOrder: 6,
    children: [
      { name: "کارشناسی", nameEn: "Inspection", children: [
        { name: "کارشناسی فنی", nameEn: "Technical Inspection" },
        { name: "کارشناسی حقوقی", nameEn: "Legal Inspection" },
        { name: "کارشناسی بدنه", nameEn: "Body Inspection" },
        { name: "ارزش‌گذاری", nameEn: "Valuation" },
      ]},
      { name: "بازرسی", nameEn: "Audit", children: [
        { name: "بازرسی قبل از خرید", nameEn: "Pre-purchase Inspection" },
        { name: "بازرسی فنی", nameEn: "Technical Audit" },
      ]},
      { name: "تعمیرات", nameEn: "Repair", children: [
        { name: "تعمیر موتور", nameEn: "Engine Repair" },
        { name: "تعمیر هیدرولیک", nameEn: "Hydraulic Repair" },
        { name: "تعمیر گیربکس", nameEn: "Transmission Repair" },
        { name: "تعمیر برق", nameEn: "Electrical Repair" },
        { name: "تعمیر ECU", nameEn: "ECU Repair" },
      ]},
      { name: "سرویس و نگهداری", nameEn: "Maintenance" },
      { name: "اورهال", nameEn: "Overhaul" },
      { name: "تأمین قطعه", nameEn: "Parts Supply" },
      { name: "نصب و راه‌اندازی", nameEn: "Installation" },
      { name: "آموزش", nameEn: "Training" },
      { name: "مشاوره", nameEn: "Consulting" },
    ],
  },
  {
    name: "حمل‌ونقل و لجستیک",
    nameEn: "Transport & Logistics",
    slug: "transport",
    domain: "TRANSPORT",
    icon: "🚚",
    imageUrl: "/images/machinery/dump-truck.png",
    sortOrder: 7,
    children: [
      { name: "حمل ماشین‌آلات", nameEn: "Machinery Transport" },
      { name: "حمل بار سنگین", nameEn: "Heavy Cargo" },
      { name: "حمل فوق‌سنگین", nameEn: "Oversized Cargo" },
      { name: "حمل معدنی", nameEn: "Mining Transport" },
      { name: "کمرشکن", nameEn: "Lowboy Transport" },
      { name: "بوژی", nameEn: "Bogie Transport" },
      { name: "تریلی", nameEn: "Trailer Transport" },
      { name: "حمل درون‌شهری", nameEn: "Intra-city Transport" },
      { name: "حمل بین‌شهری", nameEn: "Inter-city Transport" },
      { name: "لجستیک پروژه", nameEn: "Project Logistics" },
    ],
  },
  {
    name: "مواد معدنی و مصالح",
    nameEn: "Minerals & Materials",
    slug: "minerals",
    domain: "MINERAL",
    icon: "⛏️",
    imageUrl: "/images/sections/mining.png",
    sortOrder: 8,
    children: [
      { name: "سنگ آهن", nameEn: "Iron Ore" },
      { name: "مس", nameEn: "Copper" },
      { name: "سرب", nameEn: "Lead" },
      { name: "روی", nameEn: "Zinc" },
      { name: "کرومیت", nameEn: "Chromite" },
      { name: "منگنز", nameEn: "Manganese" },
      { name: "باریت", nameEn: "Barite" },
      { name: "سیلیس", nameEn: "Silica" },
      { name: "بنتونیت", nameEn: "Bentonite" },
      { name: "کائولن", nameEn: "Kaolin" },
      { name: "گچ", nameEn: "Gypsum" },
      { name: "سنگ آهک", nameEn: "Limestone" },
      { name: "سنگ‌های ساختمانی", nameEn: "Building Stone" },
      { name: "شن و ماسه", nameEn: "Sand & Gravel" },
      { name: "مصالح", nameEn: "Construction Materials" },
    ],
  },
  {
    name: "تجهیزات صنعتی",
    nameEn: "Industrial Equipment",
    slug: "industrial-equipment",
    domain: "INDUSTRIAL_EQUIPMENT",
    icon: "🏭",
    imageUrl: "/images/sections/services.png",
    sortOrder: 9,
    children: [
      { name: "تجهیزات برق و نیرو", nameEn: "Power Equipment", children: [
        { name: "ژنراتور", nameEn: "Generator" },
        { name: "تابلو برق", nameEn: "Panel Board" },
        { name: "ترانسفورماتور", nameEn: "Transformer" },
        { name: "UPS" },
      ]},
      { name: "تجهیزات هوای فشرده", nameEn: "Compressed Air", children: [
        { name: "کمپرسور", nameEn: "Compressor" },
        { name: "خشک‌کن", nameEn: "Dryer" },
        { name: "مخزن هوا", nameEn: "Air Tank" },
      ]},
      { name: "تجهیزات پمپاژ", nameEn: "Pumping Equipment", children: [
        { name: "پمپ آب", nameEn: "Water Pump" },
        { name: "پمپ صنعتی", nameEn: "Industrial Pump" },
        { name: "پمپ هیدرولیک", nameEn: "Hydraulic Pump" },
      ]},
      { name: "تجهیزات هیدرولیک", nameEn: "Hydraulic Equipment" },
      { name: "تجهیزات پنوماتیک", nameEn: "Pneumatic Equipment" },
      { name: "تجهیزات جوشکاری", nameEn: "Welding Equipment" },
      { name: "تجهیزات کارگاهی", nameEn: "Workshop Equipment" },
      { name: "تجهیزات اندازه‌گیری", nameEn: "Measuring Equipment" },
      { name: "نوار نقاله و انتقال", nameEn: "Conveyor Systems" },
      { name: "تجهیزات فرآوری", nameEn: "Processing Equipment" },
      { name: "تجهیزات تصفیه و آب", nameEn: "Water Treatment" },
      { name: "تجهیزات نفت و گاز", nameEn: "Oil & Gas Equipment" },
    ],
  },
  {
    name: "ماشین‌آلات و تجهیزات کشاورزی",
    nameEn: "Agriculture",
    slug: "agriculture",
    domain: "AGRICULTURE",
    icon: "🌾",
    imageUrl: "/images/sections/agriculture.png",
    sortOrder: 10,
    children: [
      { name: "تراکتور", nameEn: "Tractor", children: [
        { name: "تراکتور باغی", nameEn: "Orchard Tractor" },
        { name: "تراکتور زراعی", nameEn: "Farm Tractor" },
        { name: "تراکتور سنگین", nameEn: "Heavy Tractor" },
      ]},
      { name: "کمباین", nameEn: "Combine" },
      { name: "ماشین‌آلات کاشت", nameEn: "Planting", children: [
        { name: "بذرکار", nameEn: "Seeder" },
        { name: "ردیف‌کار", nameEn: "Row Planter" },
        { name: "نشاکار", nameEn: "Transplanter" },
      ]},
      { name: "ماشین‌آلات داشت", nameEn: "Crop Care", children: [
        { name: "سمپاش", nameEn: "Sprayer" },
        { name: "کودپاش", nameEn: "Fertilizer Spreader" },
      ]},
      { name: "ماشین‌آلات برداشت", nameEn: "Harvesting", children: [
        { name: "دروگر", nameEn: "Reaper" },
        { name: "علوفه‌چین", nameEn: "Forage Harvester" },
      ]},
      { name: "ماشین‌آلات خاک‌ورزی", nameEn: "Tillage", children: [
        { name: "گاوآهن", nameEn: "Plow" },
        { name: "دیسک", nameEn: "Disc" },
        { name: "روتیواتور", nameEn: "Rotavator" },
        { name: "زیرشکن", nameEn: "Subsoiler" },
      ]},
      { name: "تجهیزات آبیاری", nameEn: "Irrigation" },
      { name: "تجهیزات گلخانه", nameEn: "Greenhouse" },
      { name: "ماشین‌آلات دامداری", nameEn: "Livestock Equipment" },
      { name: "ادوات کشاورزی", nameEn: "Farm Implements" },
    ],
  },
  {
    name: "بازرگانی و تأمین",
    nameEn: "Trading & Supply",
    slug: "trading",
    domain: "TRADING",
    icon: "📦",
    imageUrl: "/images/sections/services.png",
    sortOrder: 11,
    children: [
      { name: "واردات", nameEn: "Import", children: [
        { name: "واردات ماشین‌آلات", nameEn: "Machinery Import" },
        { name: "واردات قطعات", nameEn: "Parts Import" },
        { name: "واردات تجهیزات", nameEn: "Equipment Import" },
      ]},
      { name: "صادرات", nameEn: "Export", children: [
        { name: "صادرات ماشین‌آلات", nameEn: "Machinery Export" },
        { name: "صادرات قطعات", nameEn: "Parts Export" },
      ]},
      { name: "تأمین", nameEn: "Supply", children: [
        { name: "تأمین ماشین‌آلات", nameEn: "Machinery Supply" },
        { name: "تأمین قطعات", nameEn: "Parts Supply" },
        { name: "تأمین پروژه", nameEn: "Project Supply" },
      ]},
      { name: "خرید خارجی", nameEn: "Foreign Purchase" },
      { name: "فروش خارجی", nameEn: "Foreign Sale" },
      { name: "ترخیص کالا", nameEn: "Customs Clearance" },
      { name: "خدمات گمرکی", nameEn: "Customs Services" },
      { name: "مشاوره بازرگانی", nameEn: "Trading Consultancy" },
    ],
  },
  {
    name: "مزایده و فروش ویژه",
    nameEn: "Auction & Special Sale",
    slug: "auction",
    domain: "AUCTION",
    icon: "🔨",
    imageUrl: "/images/sections/services.png",
    sortOrder: 12,
    children: [
      { name: "مزایده ماشین‌آلات", nameEn: "Machinery Auction" },
      { name: "مزایده تجهیزات", nameEn: "Equipment Auction" },
      { name: "مزایده قطعات", nameEn: "Parts Auction" },
      { name: "فروش ویژه", nameEn: "Special Sale" },
      { name: "فروش فوری", nameEn: "Quick Sale" },
      { name: "Liquidation" },
      { name: "مزایده سازمانی", nameEn: "Corporate Auction" },
    ],
  },
  {
    name: "درخواست خرید / تأمین",
    nameEn: "Purchase Request",
    slug: "requests",
    domain: "REQUEST",
    icon: "📢",
    imageUrl: "/images/sections/services.png",
    sortOrder: 13,
    children: [
      { name: "درخواست خرید ماشین", nameEn: "Machine Purchase Request" },
      { name: "درخواست اجاره", nameEn: "Rental Request" },
      { name: "درخواست قطعه", nameEn: "Parts Request" },
      { name: "درخواست تجهیزات", nameEn: "Equipment Request" },
      { name: "درخواست مواد معدنی", nameEn: "Mineral Request" },
      { name: "درخواست خدمات", nameEn: "Service Request" },
      { name: "درخواست حمل", nameEn: "Transport Request" },
      { name: "درخواست تأمین پروژه", nameEn: "Project Supply Request" },
      { name: "RFQ", nameEn: "Request for Quote" },
    ],
  },
  {
    name: "سایر",
    nameEn: "Other",
    slug: "other",
    domain: "GENERAL",
    icon: "📦",
    imageUrl: "/images/sections/services.png",
    sortOrder: 14,
    children: [
      { name: "محصولات صنعتی متفرقه", nameEn: "Misc Industrial" },
      { name: "تجهیزات خاص", nameEn: "Special Equipment" },
      { name: "محصولات جدید", nameEn: "New Products" },
      { name: "نیازمند بررسی", nameEn: "Under Review" },
    ],
  },
];

async function main() {
  // Delete all existing categories
  console.log("🗑️ Deleting all existing categories...");
  await db.category.deleteMany({});
  console.log("✅ All categories deleted");

  let rootCount = 0;
  let subCount = 0;
  let subSubCount = 0;

  for (const root of TAXONOMY) {
    // Create root category
    const rootCat = await db.category.create({
      data: {
        name: root.name,
        nameEn: root.nameEn,
        slug: root.slug,
        domain: root.domain,
        icon: root.icon,
        imageUrl: root.imageUrl,
        sortOrder: root.sortOrder,
        level: 0,
        active: true,
        featured: root.sortOrder <= 10,
        showOnHome: true,
      },
    });
    rootCount++;
    console.log(`✅ Root: ${root.name}`);

    // Create children (level 1)
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i];
      const childSlug = `${root.slug}-${slugify(child.name)}`;
      const childCat = await db.category.create({
        data: {
          name: child.name,
          nameEn: child.nameEn || null,
          slug: childSlug,
          domain: root.domain,
          parentId: rootCat.id,
          level: 1,
          sortOrder: i,
          active: true,
          showOnHome: false,
        },
      });
      subCount++;

      // Create grandchildren (level 2)
      if (child.children) {
        for (let j = 0; j < child.children.length; j++) {
          const grandchild = child.children[j];
          const gcSlug = `${childSlug}-${slugify(grandchild.name)}`;
          await db.category.create({
            data: {
              name: grandchild.name,
              nameEn: grandchild.nameEn || null,
              slug: gcSlug,
              domain: root.domain,
              parentId: childCat.id,
              level: 2,
              sortOrder: j,
              active: true,
              showOnHome: false,
            },
          });
          subSubCount++;
        }
      }
    }
  }

  const total = rootCount + subCount + subSubCount;
  console.log(`\n✅ Taxonomy rebuilt: ${rootCount} roots + ${subCount} subcategories + ${subSubCount} sub-subcategories = ${total} total`);
}

main().catch(console.error).finally(() => db.$disconnect());
