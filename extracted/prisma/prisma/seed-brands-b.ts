/* HEAVIX — Brand Catalog Seed (Phase B: Industries 11–39)
   Idempotent upserts by slug/key. Run AFTER seed-brands-a.ts.

   Covers brands for industries 11–39:
     §18 Trucks                          §32-33 Electrical/Automation/Sensors
     §20 Trailers                        §34-35 Welding/Tools
     §22 Passenger Vehicles              §36 Lubricants
     §23 Engines                         §37 Batteries
     §24 Generators                      §38-39 Industrial Equipment/Drives
     §25 Compressors                     §40 Oil & Gas
     §26 Pumps                           §42 Waste/Recycling
     §27 Hydraulics                      §44 Attachments
     §28 Transmission                    §45 Spare Parts (new)
     §29 Bearings                        §46 Iranian
     §30 Filters                         §47 Legacy
     §31 Tires

   • Does NOT seed industries or families (Phase A already did).
   • Guard: exits(1) if Industry table is empty (Phase A not run).
   • For brands already seeded by Phase A or prisma/seed.ts, upserts preserve
     existing fields (name/country/type/family/parent/aliases) and only ADD
     new industries (helper never removes industries).
   • Parents always appear before children in the BRANDS array.
   • Slug-override used for collisions: Miller (welding vs attachments),
     Genesis (cars vs attachments), Dodge (cars vs bearings).

   Run:  bunx tsx prisma/seed-brands-b.ts
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
// BRANDS — Industries 11–39 (Phase B)
// ════════════════════════════════════════════════════════════
const BRANDS: BrandSeed[] = [
  // ─────────────────────────────────────────────────────────
  // §18 TRUCKS
  // Parents first: (none — Volvo Trucks / Mercedes-Benz Trucks are top-level)
  // "Already" brands from seed.ts/A: Scania, MAN, DAF, Iveco, Renault Trucks,
  //   Mack (A), Foton (A), Dongfeng (A) — re-upserted with new industries.
  // ─────────────────────────────────────────────────────────
  {
    name: "مرسدس بنز تراک", nameEn: "Mercedes-Benz Trucks", country: "Germany",
    type: "VEHICLE_BRAND", family: "volvo-group",
    industries: ["TRUCKS", "SPARE_PARTS"],
    aliases: ["مرسدس بنز", "مرسدس", "بنز"],
  },
  {
    name: "ولوو تراک", nameEn: "Volvo Trucks", country: "Sweden",
    type: "VEHICLE_BRAND", family: "volvo-group",
    industries: ["TRUCKS"],
    aliases: ["ولوو تراک"],
  },
  {
    // Already in DB (seed.ts) — preserve fields, add TRUCKS + ENGINES (§23 merge)
    name: "اسکانیا", nameEn: "Scania", country: "Sweden",
    industries: ["TRUCKS", "ENGINES"],
    aliases: ["اسکانیا"],
  },
  {
    // Already in DB (seed.ts) — preserve fields, add TRUCKS + ENGINES (§23 merge)
    name: "مان", nameEn: "MAN", country: "Germany",
    industries: ["TRUCKS", "ENGINES"],
    aliases: ["مان"],
  },
  {
    // Already in DB (seed.ts) — preserve fields, add TRUCKS
    name: "داف", nameEn: "DAF", country: "Netherlands",
    industries: ["TRUCKS"],
    aliases: ["داف"],
  },
  {
    // Already in DB (seed.ts) — fix wrong name (was "ایکاروس"), add TRUCKS + INDUSTRIAL_VEHICLES
    name: "ایوکو", nameEn: "Iveco", country: "Italy",
    industries: ["TRUCKS", "INDUSTRIAL_VEHICLES"],
    aliases: ["ایوکو"],
  },
  {
    // Already in DB (seed.ts) — preserve fields, add TRUCKS
    name: "رنو تراک", nameEn: "Renault Trucks", country: "France",
    industries: ["TRUCKS"],
    aliases: ["رنو تراک"],
  },
  {
    // Already in DB (A, §15) — preserve fields, TRUCKS already there (no-op)
    name: "مک", nameEn: "Mack", country: "USA",
    industries: ["TRUCKS"],
    aliases: ["مک"],
  },
  { name: "فرایت‌لاینر", nameEn: "Freightliner", country: "USA", industries: ["TRUCKS"] },
  { name: "وسترن استار", nameEn: "Western Star", country: "USA", industries: ["TRUCKS"] },
  { name: "کن‌وورت", nameEn: "Kenworth", country: "USA", industries: ["TRUCKS"] },
  { name: "پیتربیلت", nameEn: "Peterbilt", country: "USA", industries: ["TRUCKS"] },
  { name: "اینترنشنال", nameEn: "International", country: "USA", industries: ["TRUCKS"] },
  {
    name: "ایسوزو", nameEn: "Isuzu", country: "Japan",
    industries: ["TRUCKS", "INDUSTRIAL_VEHICLES", "ENGINES"],
    aliases: ["ایسوزو"],
  },
  {
    name: "هینو", nameEn: "Hino", country: "Japan",
    industries: ["TRUCKS", "ENGINES"],
    aliases: ["هینو"],
  },
  { name: "فوسو", nameEn: "FUSO", country: "Japan", industries: ["TRUCKS"] },
  { name: "یو‌دی تراک", nameEn: "UD Trucks", country: "Japan", industries: ["TRUCKS"] },
  {
    name: "تاتا موتور", nameEn: "Tata Motors", country: "India",
    industries: ["TRUCKS", "INDUSTRIAL_VEHICLES"],
    aliases: ["تاتا"],
  },
  {
    name: "آشوک لیلاند", nameEn: "Ashok Leyland", country: "India",
    industries: ["TRUCKS", "INDUSTRIAL_VEHICLES"],
  },
  { name: "ایکر", nameEn: "Eicher", country: "India", industries: ["TRUCKS"] },
  { name: "بهارات‌بنز", nameEn: "BharatBenz", country: "India", industries: ["TRUCKS"] },
  {
    name: "سینوتراک", nameEn: "Sinotruk HOWO", slug: "sinotruk", country: "China",
    industries: ["TRUCKS"],
    aliases: ["سینوتراک", "HOWO"],
  },
  { name: "شacman", nameEn: "Shacman", country: "China", industries: ["TRUCKS"] },
  { name: "فاو", nameEn: "FAW", country: "China", industries: ["TRUCKS", "PASSENGER_VEHICLES"] },
  {
    // Already in DB (A, §16) — preserve fields, add TRUCKS (AGRICULTURE already there)
    name: "فوتن", nameEn: "Foton", country: "China",
    industries: ["TRUCKS", "AGRICULTURE"],
    aliases: ["فوتن"],
  },
  {
    // Already in DB (A, §16) — preserve fields, add TRUCKS + PASSENGER_VEHICLES
    name: "دونگ‌فنگ", nameEn: "Dongfeng", country: "China",
    industries: ["TRUCKS", "PASSENGER_VEHICLES", "AGRICULTURE"],
    aliases: ["دونگ‌فنگ"],
  },
  { name: "جی‌ای‌سی", nameEn: "JAC", country: "China", industries: ["TRUCKS", "PASSENGER_VEHICLES"] },
  { name: "کمک", nameEn: "CAMC", country: "China", industries: ["TRUCKS"] },
  { name: "بی‌بن", nameEn: "Beiben", country: "China", industries: ["TRUCKS"] },
  { name: "اس‌جی‌سی هونگ‌یان", nameEn: "SAIC Hongyan", country: "China", industries: ["TRUCKS"] },
  { name: "دایون", nameEn: "Dayun", country: "China", industries: ["TRUCKS"] },
  { name: "جی‌ام‌سی", nameEn: "JMC", country: "China", industries: ["TRUCKS", "PASSENGER_VEHICLES"] },
  {
    name: "فورد تراک", nameEn: "Ford Trucks", country: "USA",
    industries: ["TRUCKS"],
    aliases: ["فورد"],
  },

  // ─────────────────────────────────────────────────────────
  // §20 TRAILERS (all new)
  // ─────────────────────────────────────────────────────────
  { name: "اشمیتس کارگوبول", nameEn: "Schmitz Cargobull", country: "Germany", industries: ["TRAILERS"] },
  { name: "کرونه", nameEn: "Krone", country: "Germany", industries: ["TRAILERS"] },
  { name: "کوگل", nameEn: "Kögel", country: "Germany", industries: ["TRAILERS"] },
  { name: "ویلتون", nameEn: "Wielton", country: "Poland", industries: ["TRAILERS"] },
  { name: "کسبرور", nameEn: "Kässbohrer", country: "Germany", industries: ["TRAILERS"] },
  { name: "گولدهوفر", nameEn: "Goldhofer", country: "Germany", industries: ["TRAILERS"] },
  { name: "فایمون‌ویل", nameEn: "Faymonville", country: "Belgium", industries: ["TRAILERS"] },
  { name: "نوت‌بوم", nameEn: "Nooteboom", country: "Netherlands", industries: ["TRAILERS"] },
  { name: "بروشویس", nameEn: "Broshuis", country: "Netherlands", industries: ["TRAILERS"] },
  { name: "سیمک", nameEn: "CIMC", country: "China", industries: ["TRAILERS"] },
  { name: "فونتین", nameEn: "Fontaine", country: "USA", industries: ["TRAILERS"] },
  { name: "مانک", nameEn: "Manac", country: "Canada", industries: ["TRAILERS"] },
  { name: "یوتیلیتی", nameEn: "Utility", country: "USA", industries: ["TRAILERS"] },
  { name: "گریت دین", nameEn: "Great Dane", country: "USA", industries: ["TRAILERS"] },
  { name: "هیوندای ترنس‌لید", nameEn: "Hyundai Translead", country: "South Korea", industries: ["TRAILERS"] },
  { name: "فرایهاوف", nameEn: "Fruehauf", country: "USA", industries: ["TRAILERS"] },
  { name: "دنیسون", nameEn: "Dennison", country: "USA", industries: ["TRAILERS"] },

  // ─────────────────────────────────────────────────────────
  // §22 PASSENGER VEHICLES
  // Note: Toyota/Honda/Nissan/Mitsubishi here are CAR brands (slugs toyota/honda/
  // nissan/mitsubishi) — distinct from forklift brands in A (toyota-material-handling,
  // nissan-forklift, mitsubishi-logisnext). Mitsubishi (here) is parent for
  // Mitsubishi Engines (§23) and Mitsubishi Electric (§32-33) — must come before.
  // Honda merged with §26 PUMPS. Mitsubishi merged with §24 GENERATORS.
  // Hyundai (slug "hyundai") already in DB from seed.ts (featured) — re-upsert with
  //   PASSENGER_VEHICLES + INDUSTRIAL_VEHICLES + ENGINES (§23) + GENERATORS (§24).
  // Mercedes-Benz (slug "mercedes-benz") already in DB from seed.ts — re-upsert
  //   with PASSENGER_VEHICLES + TRUCKS + aliases.
  // ─────────────────────────────────────────────────────────
  {
    name: "تویوتا", nameEn: "Toyota", country: "Japan", type: "VEHICLE_BRAND",
    industries: ["PASSENGER_VEHICLES", "INDUSTRIAL_VEHICLES"],
    aliases: ["تویوتا"],
  },
  { name: "لکسوس", nameEn: "Lexus", country: "Japan", industries: ["PASSENGER_VEHICLES"] },
  {
    name: "هوندا", nameEn: "Honda", country: "Japan", type: "VEHICLE_BRAND",
    industries: ["PASSENGER_VEHICLES", "PUMPS"],
    aliases: ["هوندا"],
  },
  {
    name: "نیسان", nameEn: "Nissan", country: "Japan", type: "VEHICLE_BRAND",
    industries: ["PASSENGER_VEHICLES", "INDUSTRIAL_VEHICLES"],
    aliases: ["نیسان"],
  },
  { name: "اینفینیتی", nameEn: "Infiniti", country: "Japan", industries: ["PASSENGER_VEHICLES"] },
  {
    name: "میتسوبیشی", nameEn: "Mitsubishi", country: "Japan", type: "VEHICLE_BRAND",
    industries: ["PASSENGER_VEHICLES", "INDUSTRIAL_VEHICLES", "GENERATORS"],
    aliases: ["میتسوبیشی"],
  },
  { name: "مازدا", nameEn: "Mazda", country: "Japan", industries: ["PASSENGER_VEHICLES"], aliases: ["مازدا"] },
  { name: "سوبارو", nameEn: "Subaru", country: "Japan", industries: ["PASSENGER_VEHICLES"] },
  { name: "سوزوکی", nameEn: "Suzuki", country: "Japan", industries: ["PASSENGER_VEHICLES"] },
  { name: "دایهاتسو", nameEn: "Daihatsu", country: "Japan", industries: ["PASSENGER_VEHICLES"] },
  {
    // Already in DB (seed.ts) — preserve featured/fields, add PASSENGER_VEHICLES + TRUCKS + aliases
    name: "مرسدس بنز", nameEn: "Mercedes-Benz", country: "Germany", type: "VEHICLE_BRAND",
    industries: ["PASSENGER_VEHICLES", "TRUCKS"],
    aliases: ["مرسدس بنز", "مرسدس", "بنز"],
  },
  {
    name: "بی‌ام‌و", nameEn: "BMW", country: "Germany", type: "VEHICLE_BRAND",
    industries: ["PASSENGER_VEHICLES"],
    aliases: ["بی‌ام‌و"],
  },
  { name: "مینی", nameEn: "MINI", country: "UK", industries: ["PASSENGER_VEHICLES"] },
  { name: "آئودی", nameEn: "Audi", country: "Germany", industries: ["PASSENGER_VEHICLES"], aliases: ["آئودی"] },
  { name: "فولکس‌واگن", nameEn: "Volkswagen", country: "Germany", industries: ["PASSENGER_VEHICLES"], aliases: ["فولکس‌واگن"] },
  { name: "پورشه", nameEn: "Porsche", country: "Germany", industries: ["PASSENGER_VEHICLES"], aliases: ["پورشه"] },
  { name: "اسمارت", nameEn: "Smart", country: "Germany", industries: ["PASSENGER_VEHICLES"] },
  { name: "اوپل", nameEn: "Opel", country: "Germany", industries: ["PASSENGER_VEHICLES"] },
  {
    name: "فورد", nameEn: "Ford", country: "USA", type: "VEHICLE_BRAND",
    industries: ["PASSENGER_VEHICLES", "TRUCKS"],
    aliases: ["فورد"],
  },
  { name: "شورولت", nameEn: "Chevrolet", country: "USA", industries: ["PASSENGER_VEHICLES"] },
  { name: "جی‌ام‌سی", nameEn: "GMC", country: "USA", industries: ["PASSENGER_VEHICLES"] },
  { name: "کادیلاک", nameEn: "Cadillac", country: "USA", industries: ["PASSENGER_VEHICLES"] },
  { name: "جیپ", nameEn: "Jeep", country: "USA", industries: ["PASSENGER_VEHICLES"] },
  { name: "داج", nameEn: "Dodge", country: "USA", industries: ["PASSENGER_VEHICLES"] },
  { name: "رَم", nameEn: "Ram", country: "USA", industries: ["PASSENGER_VEHICLES"] },
  { name: "کرایسلر", nameEn: "Chrysler", country: "USA", industries: ["PASSENGER_VEHICLES"] },
  { name: "لینکلن", nameEn: "Lincoln", country: "USA", industries: ["PASSENGER_VEHICLES"] },
  {
    // Already in DB (seed.ts, featured:true) — preserve featured, add industries + alias
    name: "هیوندای", nameEn: "Hyundai", country: "South Korea", type: "VEHICLE_BRAND", featured: true,
    industries: ["PASSENGER_VEHICLES", "INDUSTRIAL_VEHICLES", "ENGINES", "GENERATORS"],
    aliases: ["هیوندای"],
  },
  { name: "کیا", nameEn: "Kia", country: "South Korea", industries: ["PASSENGER_VEHICLES"], aliases: ["کیا"] },
  { name: "جنسیس", nameEn: "Genesis", country: "South Korea", industries: ["PASSENGER_VEHICLES"] },
  {
    name: "ولوو", nameEn: "Volvo", country: "Sweden", type: "VEHICLE_BRAND",
    industries: ["PASSENGER_VEHICLES"],
    aliases: ["ولوو"],
  },
  { name: "پول‌استار", nameEn: "Polestar", country: "Sweden", industries: ["PASSENGER_VEHICLES"] },
  { name: "جگوار", nameEn: "Jaguar", country: "UK", industries: ["PASSENGER_VEHICLES"] },
  { name: "لند روور", nameEn: "Land Rover", country: "UK", industries: ["PASSENGER_VEHICLES"] },
  { name: "پژو", nameEn: "Peugeot", country: "France", industries: ["PASSENGER_VEHICLES"], aliases: ["پژو"] },
  { name: "سیتروئن", nameEn: "Citroën", country: "France", industries: ["PASSENGER_VEHICLES"], aliases: ["سیتروئن"] },
  { name: "دی‌اس", nameEn: "DS", country: "France", industries: ["PASSENGER_VEHICLES"] },
  { name: "رنو", nameEn: "Renault", country: "France", industries: ["PASSENGER_VEHICLES"], aliases: ["رنو"] },
  { name: "داسیا", nameEn: "Dacia", country: "Romania", industries: ["PASSENGER_VEHICLES"] },
  { name: "فیات", nameEn: "Fiat", country: "Italy", industries: ["PASSENGER_VEHICLES"], aliases: ["فیات"] },
  { name: "آلفا رومئو", nameEn: "Alfa Romeo", country: "Italy", industries: ["PASSENGER_VEHICLES"] },
  { name: "لانچا", nameEn: "Lancia", country: "Italy", industries: ["PASSENGER_VEHICLES"] },
  { name: "مازراتی", nameEn: "Maserati", country: "Italy", industries: ["PASSENGER_VEHICLES"] },
  { name: "فراری", nameEn: "Ferrari", country: "Italy", industries: ["PASSENGER_VEHICLES"], aliases: ["فراری"] },
  { name: "لامبورگینی", nameEn: "Lamborghini", country: "Italy", industries: ["PASSENGER_VEHICLES"], aliases: ["لامبورگینی"] },
  { name: "تسلا", nameEn: "Tesla", country: "USA", industries: ["PASSENGER_VEHICLES"], aliases: ["تسلا"] },
  { name: "بی‌وای‌دی", nameEn: "BYD", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "جیلی", nameEn: "Geely", country: "China", industries: ["PASSENGER_VEHICLES"], aliases: ["جیلی"] },
  { name: "چری", nameEn: "Chery", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "چانگان", nameEn: "Changan", country: "China", industries: ["PASSENGER_VEHICLES"], aliases: ["چانگان"] },
  { name: "گریت وال", nameEn: "Great Wall", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "هاوال", nameEn: "Haval", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "جتور", nameEn: "Jetour", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "اکسید", nameEn: "Exeed", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "ام‌جی", nameEn: "MG", country: "UK", industries: ["PASSENGER_VEHICLES"] },
  { name: "سایک", nameEn: "SAIC", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "بایک", nameEn: "BAIC", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "گاک", nameEn: "GAC", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "نیو", nameEn: "NIO", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "ایکس‌پنگ", nameEn: "XPeng", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "لی آتو", nameEn: "Li Auto", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "زیکر", nameEn: "Zeekr", country: "China", industries: ["PASSENGER_VEHICLES"] },
  { name: "لیپ‌موتور", nameEn: "Leapmotor", country: "China", industries: ["PASSENGER_VEHICLES"] },

  // ─────────────────────────────────────────────────────────
  // §23 ENGINES
  // "Already from A": Caterpillar/Perkins/Deutz/Yanmar/Kubota (ENGINES already
  //   there, no-op) ; Doosan/Lovol (ENGINES new). Yanmar also adds GENERATORS (§24 merge).
  // "Already from B §18": Scania/MAN/Isuzu/Hino (ENGINES merged above).
  // "Already from B §22": Hyundai (ENGINES merged above).
  // New: Cummins (parent for Cummins Filtration §30), Volvo Penta, MTU, FPT Industrial,
  //   John Deere Power Systems (parent: john-deere), Mitsubishi Heavy Industries,
  //   Mitsubishi Engines (parent: mitsubishi — defined above), Weichai, Yuchai, SDEC,
  //   FAWDE, Quanchai, Kohler (merged §24 GENERATORS), Hatz, JCB Power Systems
  //   (parent: jcb), FPT.
  // ─────────────────────────────────────────────────────────
  {
    // Already in DB (A) — preserve all fields, ENGINES already there (no-op)
    name: "کاترپیلار", nameEn: "Caterpillar", family: "caterpillar-inc", country: "USA",
    website: "caterpillar.com", featured: true,
    industries: ["ENGINES"],
    aliases: ["کاترپیلر", "کاترپیلا", "کاتر", "CAT", "Cat", "کاترپیلار آمریکا"],
  },
  {
    // Already in DB (A) — preserve all fields, ENGINES already there (no-op)
    name: "پرکینز", nameEn: "Perkins", parent: "caterpillar", family: "caterpillar-inc",
    country: "UK", type: "ENGINE_BRAND", website: "perkins.com",
    industries: ["ENGINES"],
    aliases: ["پرکینز موتور", "Perkins Engines"],
  },
  {
    // Already in DB (A) — preserve all fields, ENGINES already there (no-op)
    name: "دویتز", nameEn: "Deutz", country: "Germany", type: "ENGINE_BRAND",
    industries: ["ENGINES"],
    aliases: ["دویتز"],
  },
  {
    name: "ولوو پنتا", nameEn: "Volvo Penta", family: "volvo-group", country: "Sweden",
    type: "ENGINE_BRAND",
    industries: ["ENGINES", "MARINE", "GENERATORS"],
    aliases: ["ولوو پنتا"],
  },
  {
    name: "ام‌تی‌یو", nameEn: "MTU", country: "Germany", type: "ENGINE_BRAND",
    industries: ["ENGINES", "MARINE", "GENERATORS"],
    aliases: ["ام‌تی‌یو"],
  },
  {
    // Already in DB (A) — preserve fields, ENGINES no-op + add GENERATORS (§24 merge)
    name: "یانمار", nameEn: "Yanmar", country: "Japan",
    industries: ["ENGINES", "GENERATORS"],
    aliases: ["یانمار"],
  },
  {
    // Already in DB (A) — preserve fields, ENGINES already there (no-op)
    name: "کوبوتا", nameEn: "Kubota", country: "Japan",
    industries: ["ENGINES"],
    aliases: ["کوبوتا"],
  },
  {
    name: "کومینز", nameEn: "Cummins", country: "USA", type: "ENGINE_BRAND",
    industries: ["ENGINES", "GENERATORS"],
    aliases: ["کومینز"],
  },
  {
    name: "اف‌پی‌تی اینداستریال", nameEn: "FPT Industrial", country: "Italy", type: "ENGINE_BRAND",
    industries: ["ENGINES"],
  },
  {
    name: "جان‌دیر پاور سیستمز", nameEn: "John Deere Power Systems", parent: "john-deere",
    country: "USA", type: "ENGINE_BRAND",
    industries: ["ENGINES"],
  },
  {
    name: "میتسوبیشی هوی اینداستریز", nameEn: "Mitsubishi Heavy Industries", country: "Japan",
    type: "ENGINE_BRAND",
    industries: ["ENGINES", "GENERATORS"],
  },
  {
    name: "میتسوبیشی موتور", nameEn: "Mitsubishi Engines", parent: "mitsubishi",
    country: "Japan", type: "ENGINE_BRAND",
    industries: ["ENGINES"],
  },
  {
    // Already in DB (A) — preserve fields, add ENGINES + GENERATORS (§24 merge)
    name: "دوسان", nameEn: "Doosan", family: "doosan-group", country: "South Korea",
    industries: ["ENGINES", "GENERATORS"],
    aliases: ["دوسان"],
  },
  { name: "ویچای", nameEn: "Weichai", country: "China", type: "ENGINE_BRAND", industries: ["ENGINES"] },
  { name: "یوچای", nameEn: "Yuchai", country: "China", type: "ENGINE_BRAND", industries: ["ENGINES"] },
  { name: "اس‌دی‌ای‌سی", nameEn: "SDEC", country: "China", type: "ENGINE_BRAND", industries: ["ENGINES"] },
  { name: "فاو‌دی", nameEn: "FAWDE", country: "China", type: "ENGINE_BRAND", industries: ["ENGINES"] },
  { name: "کوانچای", nameEn: "Quanchai", country: "China", type: "ENGINE_BRAND", industries: ["ENGINES"] },
  {
    // Already in DB (A) — preserve fields, add ENGINES
    name: "لوول", nameEn: "Lovol", country: "China",
    industries: ["ENGINES"],
    aliases: ["لوول"],
  },
  {
    name: "کلر", nameEn: "Kohler", country: "USA", type: "ENGINE_BRAND",
    industries: ["ENGINES", "GENERATORS"],
    aliases: ["کلر"],
  },
  {
    name: "هتس", nameEn: "Hatz", country: "Germany", type: "ENGINE_BRAND",
    industries: ["ENGINES"],
    aliases: ["هتس"],
  },
  {
    name: "جی‌سی‌بی پاور سیستمز", nameEn: "JCB Power Systems", parent: "jcb",
    country: "UK", type: "ENGINE_BRAND",
    industries: ["ENGINES"],
  },
  { name: "اف‌پی‌تی", nameEn: "FPT", country: "Italy", type: "ENGINE_BRAND", industries: ["ENGINES"] },

  // ─────────────────────────────────────────────────────────
  // §24 GENERATORS
  // "Already from A": Caterpillar/Perkins (GENERATORS already there), Yanmar
  //   (merged above), Doosan (merged above), Atlas Copco (add GENERATORS),
  //   JCB (add GENERATORS).
  // "Already from B §23": Cummins/Volvo Penta/MTU/Kohler (GENERATORS merged above).
  // "Already from B §22": Mitsubishi/Hyundai (GENERATORS merged above).
  // New: FG Wilson, AKSA, Generac, Himoinsa, Pramac, SDMO, Kirloskar,
  //   Mahindra Powerol, Lutian, Denyo, Mecc Alte, Stamford, Leroy-Somer.
  // ─────────────────────────────────────────────────────────
  { name: "اف‌جی ویلسون", nameEn: "FG Wilson", country: "UK", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "اکسا", nameEn: "AKSA", country: "Turkey", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "جنراک", nameEn: "Generac", country: "USA", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "هیموینسا", nameEn: "Himoinsa", country: "Spain", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "پراماک", nameEn: "Pramac", country: "Italy", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "اس‌دی‌ام‌او", nameEn: "SDMO", country: "France", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "کیرلوسکار", nameEn: "Kirloskar", country: "India", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "ماهیندرا پاورول", nameEn: "Mahindra Powerol", country: "India", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "لوتین", nameEn: "Lutian", country: "China", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "دنیو", nameEn: "Denyo", country: "Japan", type: "EQUIPMENT_BRAND", industries: ["GENERATORS"] },
  { name: "مک آلته", nameEn: "Mecc Alte", country: "Italy", type: "PARTS_BRAND", industries: ["GENERATORS"] },
  { name: "استمفورد", nameEn: "Stamford", country: "UK", type: "PARTS_BRAND", industries: ["GENERATORS"] },
  { name: "لروی-سومر", nameEn: "Leroy-Somer", country: "France", type: "PARTS_BRAND", industries: ["GENERATORS"] },
  {
    // Already in DB (A) — preserve fields, add GENERATORS
    name: "جی‌سی‌بی", nameEn: "JCB", country: "UK",
    industries: ["GENERATORS"],
    aliases: ["جی‌سی‌بی"],
  },
  {
    // Already in DB (A) — preserve fields, add GENERATORS (COMPRESSORS/DRILLING remain)
    name: "آتلس کوپکو", nameEn: "Atlas Copco", family: "atlas-copco-group", country: "Sweden",
    industries: ["GENERATORS"],
    aliases: ["آتلس کوپکو"],
  },

  // ─────────────────────────────────────────────────────────
  // §25 COMPRESSORS
  // "Already from A": Atlas Copco (COMPRESSORS already there, no-op), Kaishan
  //   (COMPRESSORS already there, no-op), Kobelco (add COMPRESSORS).
  // "Already from B §32-33/§34-35": Hitachi (merged below in this section — adds
  //   COMPRESSORS + ELECTRICAL + TOOLS).
  // New: Ingersoll Rand (merged §34-35 TOOLS), Kaeser, Sullair, Gardner Denver,
  //   ELGi, Doosan Portable Power (parent: doosan), Chicago Pneumatic (merged
  //   §34-35 TOOLS), Quincy, CompAir, BOGE, FS-Curtis, Fusheng, Hanbell.
  // Hitachi placed here so its merged industries (COMPRESSORS/ELECTRICAL/TOOLS)
  // are added in one shot.
  // ─────────────────────────────────────────────────────────
  {
    name: "اینگرسول رند", nameEn: "Ingersoll Rand", country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["COMPRESSORS", "TOOLS"],
  },
  { name: "کیزر", nameEn: "Kaeser", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  { name: "سالر", nameEn: "Sullair", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  { name: "گاردنر دنور", nameEn: "Gardner Denver", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  { name: "ال‌جی", nameEn: "ELGi", country: "India", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  {
    name: "دوسان پرتابل پاور", nameEn: "Doosan Portable Power", parent: "doosan",
    country: "South Korea", type: "INDUSTRIAL_BRAND",
    industries: ["COMPRESSORS"],
  },
  {
    name: "شیکاگو پیوماتیک", nameEn: "Chicago Pneumatic", country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["COMPRESSORS", "TOOLS"],
  },
  { name: "کوئینسی", nameEn: "Quincy", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  { name: "کمپ‌ایر", nameEn: "CompAir", country: "UK", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  { name: "بوگه", nameEn: "BOGE", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  { name: "اف‌اس-کورتیس", nameEn: "FS-Curtis", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  {
    // Already in DB (A) — preserve fields, COMPRESSORS already there (no-op)
    name: "کایشان", nameEn: "Kaishan", country: "China",
    industries: ["COMPRESSORS", "DRILLING"],
    aliases: ["کایشان"],
  },
  { name: "فوشنگ", nameEn: "Fusheng", country: "Taiwan", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },
  {
    // Already in DB (A) — preserve fields (slug "hitachi", nameEn "Hitachi Construction
    // Machinery"). Add COMPRESSORS + ELECTRICAL (§32-33) + TOOLS (§34-35).
    name: "هیتاچی", nameEn: "Hitachi Construction Machinery", slug: "hitachi", country: "Japan",
    industries: ["COMPRESSORS", "ELECTRICAL", "TOOLS"],
    aliases: ["هیتاچی"],
  },
  {
    // Already in DB (A) — preserve fields, add COMPRESSORS
    name: "کوبلکو", nameEn: "Kobelco", country: "Japan",
    industries: ["COMPRESSORS"],
    aliases: ["کوبلکو"],
  },
  { name: "هان‌بل", nameEn: "Hanbell", country: "Taiwan", type: "INDUSTRIAL_BRAND", industries: ["COMPRESSORS"] },

  // ─────────────────────────────────────────────────────────
  // §26 PUMPS
  // "Already from A": Weir/Metso/Putzmeister (PUMPS already there, no-op),
  //   Schwing (add PUMPS), Wacker Neuson (add PUMPS).
  // "Already from B §22": Honda (PUMPS merged above).
  // New: Grundfos, KSB, Sulzer (merged OIL_GAS), Wilo, Ebara, Flowserve (merged
  //   OIL_GAS), Xylem, ITT, Goulds, Tsurumi, Koshin, Godwin, Grindex, Flygt,
  //   Viking Pump, Netzsch, SEEPEX.
  // ─────────────────────────────────────────────────────────
  { name: "گروندفوس", nameEn: "Grundfos", country: "Denmark", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"], aliases: ["گروندفوس"] },
  { name: "کی‌اس‌بی", nameEn: "KSB", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"], aliases: ["کی‌اس‌بی"] },
  { name: "سولزر", nameEn: "Sulzer", country: "Switzerland", type: "INDUSTRIAL_BRAND", industries: ["PUMPS", "OIL_GAS"], aliases: ["سولزر"] },
  { name: "ویلو", nameEn: "Wilo", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"], aliases: ["ویلو"] },
  { name: "ابارا", nameEn: "Ebara", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"], aliases: ["ابارا"] },
  { name: "فلاوسرو", nameEn: "Flowserve", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["PUMPS", "OIL_GAS"] },
  { name: "زایلوم", nameEn: "Xylem", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  { name: "آی‌تی‌تی", nameEn: "ITT", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  { name: "گولدز", nameEn: "Goulds", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  {
    // Already in DB (A) — preserve fields, PUMPS already there (no-op)
    name: "ویر", nameEn: "Weir", country: "UK",
    industries: ["PUMPS"],
    aliases: ["ویر"],
  },
  {
    // Already in DB (A) — preserve fields, PUMPS already there (no-op)
    name: "متسو", nameEn: "Metso", country: "Finland",
    industries: ["PUMPS"],
    aliases: ["متسو"],
  },
  {
    // Already in DB (A) — preserve fields, add PUMPS
    name: "شوینگ", nameEn: "Schwing", country: "Germany",
    industries: ["PUMPS"],
    aliases: ["شوینگ"],
  },
  {
    // Already in DB (A) — preserve fields, PUMPS already there (no-op)
    name: "پوتس‌مایستر", nameEn: "Putzmeister", country: "Germany",
    industries: ["PUMPS"],
    aliases: ["پوتس‌مایستر"],
  },
  { name: "تسورومی", nameEn: "Tsurumi", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  { name: "کوشین", nameEn: "Koshin", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  {
    // Already in DB (A) — preserve fields, add PUMPS
    name: "واکر نویزون", nameEn: "Wacker Neuson", country: "Germany",
    industries: ["PUMPS"],
    aliases: ["واکر نویزون"],
  },
  { name: "گادوین", nameEn: "Godwin", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  { name: "گرین‌دکس", nameEn: "Grindex", country: "Sweden", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  { name: "فلیگت", nameEn: "Flygt", country: "Sweden", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  { name: "وایکینگ پمپ", nameEn: "Viking Pump", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  { name: "نتزش", nameEn: "Netzsch", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },
  { name: "سی‌پکس", nameEn: "SEEPEX", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["PUMPS"] },

  // ─────────────────────────────────────────────────────────
  // §27 HYDRAULICS
  // Parents first: Danfoss → Danfoss Power Solutions.
  // Bosch Rexroth uses family "bosch" (created in Phase A) — no parent needed.
  // Parker Hannifin merged with §30 FILTRATION. Eaton merged with §28
  //   INDUSTRIAL_EQUIPMENT + §32-33 ELECTRICAL. Nachi merged with §29 BEARINGS.
  // Hengst merged with §30 FILTRATION.
  // ─────────────────────────────────────────────────────────
  {
    name: "بوش رکسروت", nameEn: "Bosch Rexroth", family: "bosch", country: "Germany",
    type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS"],
    aliases: ["بوش رکسروت"],
  },
  {
    name: "پارکر هانیفین", nameEn: "Parker Hannifin", country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS", "FILTRATION"],
    aliases: ["پارکر"],
  },
  {
    name: "دانفوس", nameEn: "Danfoss", country: "Denmark", type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS", "AUTOMATION"],
    aliases: ["دانفوس"],
  },
  {
    name: "ایتون", nameEn: "Eaton", country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS", "ELECTRICAL", "INDUSTRIAL_EQUIPMENT"],
  },
  { name: "هایداک", nameEn: "Hydac", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "هاوه", nameEn: "HAWE", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "یوکن", nameEn: "Yuken", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  {
    name: "کاواساکی پریشن ماشینری", nameEn: "Kawasaki Precision Machinery", parent: "kawasaki",
    country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS"],
  },
  {
    name: "ناچی", nameEn: "Nachi", country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS", "BEARINGS"],
  },
  { name: "کی‌وای‌بی", nameEn: "KYB", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "کایابا", nameEn: "Kayaba", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "آتوس", nameEn: "Atos", country: "Italy", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "سان هیدرولیک", nameEn: "Sun Hydraulics", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "پوکلن هیدرولیک", nameEn: "Poclain Hydraulics", country: "France", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "بوخر هیدرولیک", nameEn: "Bucher Hydraulics", country: "Switzerland", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "والوویل", nameEn: "Walvoil", country: "Italy", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "کسپا", nameEn: "Casappa", country: "Italy", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  { name: "بوندیولی و پاوزی", nameEn: "Bondioli & Pavesi", country: "Italy", type: "INDUSTRIAL_BRAND", industries: ["HYDRAULICS"] },
  {
    name: "دانفوس پاور سولوشنز", nameEn: "Danfoss Power Solutions", parent: "danfoss",
    country: "Denmark", type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS"],
  },
  {
    name: "لینده هیدرولیک", nameEn: "Linde Hydraulics", country: "Germany", type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS"],
    aliases: ["لینده هیدرولیک"],
  },
  {
    name: "هنگست", nameEn: "Hengst", country: "Germany", type: "INDUSTRIAL_BRAND",
    industries: ["HYDRAULICS", "FILTRATION"],
  },

  // ─────────────────────────────────────────────────────────
  // §28 TRANSMISSION
  // Parents first: Dana → Dana Spicer.
  // Eaton already defined in §27 (merged INDUSTRIAL_EQUIPMENT here).
  // Voith merged with §38-39 RAILWAY. Schaeffler merged with §29 BEARINGS.
  // "Already from A": Carraro (add INDUSTRIAL_EQUIPMENT), Clark (add INDUSTRIAL_EQUIPMENT).
  // ─────────────────────────────────────────────────────────
  {
    name: "زداف", nameEn: "ZF", family: "zf-group", country: "Germany", type: "PARTS_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
    aliases: ["زداف"],
  },
  {
    name: "الیسون ترنسمیشن", nameEn: "Allison Transmission", country: "USA", type: "PARTS_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
  },
  {
    name: "دنا", nameEn: "Dana", family: "dana-incorporated", country: "USA", type: "PARTS_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
  },
  {
    // Already in DB (A) — preserve fields, add INDUSTRIAL_EQUIPMENT
    name: "کارارو", nameEn: "Carraro", country: "Italy",
    industries: ["INDUSTRIAL_EQUIPMENT"],
    aliases: ["کارارو"],
  },
  {
    name: "دنا اسپایسر", nameEn: "Dana Spicer", parent: "dana", country: "USA", type: "PARTS_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
  },
  {
    name: "بورگ‌وارنر", nameEn: "BorgWarner", country: "USA", type: "PARTS_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
  },
  {
    name: "وویت", nameEn: "Voith", country: "Germany", type: "INDUSTRIAL_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT", "RAILWAY"],
  },
  {
    name: "مرitor", nameEn: "Meritor", country: "USA", type: "PARTS_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
  },
  {
    name: "شافلر", nameEn: "Schaeffler", family: "schaeffler-group", country: "Germany", type: "PARTS_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT", "BEARINGS"],
  },
  {
    name: "جی‌کی‌ان", nameEn: "GKN", family: "gkn", country: "UK", type: "PARTS_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
  },
  { name: "ایسین", nameEn: "Aisin", country: "Japan", type: "PARTS_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "جاتکو", nameEn: "JATCO", country: "Japan", type: "PARTS_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "نابتسکو", nameEn: "Nabtesco", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "کسلر", nameEn: "Kessler", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  {
    // Already in DB (A) — preserve fields (type INDUSTRIAL_BRAND), add INDUSTRIAL_EQUIPMENT
    name: "کلارک", nameEn: "Clark", country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
    aliases: ["کلارک"],
  },
  { name: "توین دیسک", nameEn: "Twin Disc", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },

  // ─────────────────────────────────────────────────────────
  // §29 BEARINGS
  // Schaeffler (§28) and Nachi (§27) already merged BEARINGS above.
  // SKF merged with §36 LUBRICANTS.
  // Dodge here is the bearings brand (Dodge Industrial, part of ABB) — distinct
  //   from §22 Dodge (cars). Slug override "dodge-industrial" avoids collision.
  // ─────────────────────────────────────────────────────────
  {
    name: "اس‌کی‌اف", nameEn: "SKF", country: "Sweden", type: "PARTS_BRAND",
    industries: ["BEARINGS", "LUBRICANTS"],
    aliases: ["اس‌کی‌اف"],
  },
  {
    name: "فاگ", nameEn: "FAG", family: "schaeffler-group", country: "Germany", type: "PARTS_BRAND",
    industries: ["BEARINGS"],
    aliases: ["فاگ"],
  },
  {
    name: "اینا", nameEn: "INA", family: "schaeffler-group", country: "Germany", type: "PARTS_BRAND",
    industries: ["BEARINGS"],
    aliases: ["اینا"],
  },
  {
    name: "تیمکن", nameEn: "Timken", country: "USA", type: "PARTS_BRAND",
    industries: ["BEARINGS"],
    aliases: ["تیمکن"],
  },
  {
    name: "ان‌اس‌کی", nameEn: "NSK", country: "Japan", type: "PARTS_BRAND",
    industries: ["BEARINGS"],
    aliases: ["ان‌اس‌کی"],
  },
  {
    name: "ان‌تی‌ان", nameEn: "NTN", country: "Japan", type: "PARTS_BRAND",
    industries: ["BEARINGS"],
    aliases: ["ان‌تی‌ان"],
  },
  { name: "کویو", nameEn: "Koyo", country: "Japan", type: "PARTS_BRAND", industries: ["BEARINGS"] },
  { name: "جی‌تکت", nameEn: "JTEKT", country: "Japan", type: "PARTS_BRAND", industries: ["BEARINGS"] },
  { name: "ای‌کی‌او", nameEn: "IKO", country: "Japan", type: "PARTS_BRAND", industries: ["BEARINGS"] },
  { name: "تی‌اچ‌کی", nameEn: "THK", country: "Japan", type: "PARTS_BRAND", industries: ["BEARINGS"] },
  { name: "تسوباکی", nameEn: "Tsubaki", country: "Japan", type: "PARTS_BRAND", industries: ["BEARINGS"] },
  { name: "رکسنورد", nameEn: "Rexnord", country: "USA", type: "PARTS_BRAND", industries: ["BEARINGS"] },
  {
    // Bearings brand "Dodge" (Dodge Industrial / ABB) — slug override to avoid
    // collision with §22 Dodge (cars, slug "dodge").
    name: "داج اینداستریال", nameEn: "Dodge", slug: "dodge-industrial",
    country: "USA", type: "PARTS_BRAND",
    industries: ["BEARINGS"],
  },
  { name: "اف‌وای‌اچ", nameEn: "FYH", country: "Japan", type: "PARTS_BRAND", industries: ["BEARINGS"] },

  // ─────────────────────────────────────────────────────────
  // §30 FILTERS
  // Parker Hannifin (§27) and Hengst (§27) already merged FILTRATION above.
  // Cummins Filtration parent: cummins (defined in §23).
  // ─────────────────────────────────────────────────────────
  { name: "دونالدسون", nameEn: "Donaldson", country: "USA", type: "PARTS_BRAND", industries: ["FILTRATION"] },
  { name: "فلیت‌گارد", nameEn: "Fleetguard", country: "USA", type: "AFTERMARKET", industries: ["FILTRATION"] },
  {
    name: "مان فیلتر", nameEn: "MANN-FILTER", country: "Germany", type: "PARTS_BRAND",
    industries: ["FILTRATION"],
    aliases: ["مان فیلتر"],
  },
  { name: "مان+هومل", nameEn: "Mann+Hummel", country: "Germany", type: "PARTS_BRAND", industries: ["FILTRATION"] },
  { name: "بالدوین", nameEn: "Baldwin", country: "USA", type: "AFTERMARKET", industries: ["FILTRATION"] },
  { name: "ویکس", nameEn: "WIX", country: "USA", type: "AFTERMARKET", industries: ["FILTRATION"] },
  { name: "ماله", nameEn: "Mahle", country: "Germany", type: "PARTS_BRAND", industries: ["FILTRATION"] },
  { name: "فیلتریشن گروپ", nameEn: "Filtration Group", country: "USA", type: "PARTS_BRAND", industries: ["FILTRATION"] },
  {
    name: "کومینز فیلتریشن", nameEn: "Cummins Filtration", parent: "cummins",
    country: "USA", type: "AFTERMARKET",
    industries: ["FILTRATION"],
  },
  { name: "سوجفی", nameEn: "Sogefi", country: "Italy", type: "PARTS_BRAND", industries: ["FILTRATION"] },
  { name: "یو‌اف‌ای", nameEn: "UFI", country: "Italy", type: "PARTS_BRAND", industries: ["FILTRATION"] },
  { name: "ساکورا", nameEn: "Sakura", country: "Japan", type: "AFTERMARKET", industries: ["FILTRATION"] },
  { name: "فلیترایت", nameEn: "Fleetrite", country: "USA", type: "AFTERMARKET", industries: ["FILTRATION"] },
  { name: "فرم", nameEn: "Fram", country: "USA", type: "AFTERMARKET", industries: ["FILTRATION"] },

  // ─────────────────────────────────────────────────────────
  // §31 TIRES
  // BKT already in DB (A) — TIRES already there (no-op), preserve fields.
  // ─────────────────────────────────────────────────────────
  { name: "میشلن", nameEn: "Michelin", country: "France", type: "TIRE_BRAND", industries: ["TIRES"], aliases: ["میشلن"] },
  { name: "بریج‌استون", nameEn: "Bridgestone", country: "Japan", type: "TIRE_BRAND", industries: ["TIRES"], aliases: ["بریج‌استون"] },
  { name: "گودیر", nameEn: "Goodyear", country: "USA", type: "TIRE_BRAND", industries: ["TIRES"], aliases: ["گودیر"] },
  { name: "کنتیننتال", nameEn: "Continental", country: "Germany", type: "TIRE_BRAND", industries: ["TIRES"], aliases: ["کنتیننتال"] },
  { name: "يوکوهاما", nameEn: "Yokohama", country: "Japan", type: "TIRE_BRAND", industries: ["TIRES"], aliases: ["يوکوهاما"] },
  { name: "نوکیان", nameEn: "Nokian", country: "Finland", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "پایرلی", nameEn: "Pirelli", country: "Italy", type: "TIRE_BRAND", industries: ["TIRES"], aliases: ["پایرلی"] },
  {
    // Already in DB (A) — preserve fields, TIRES already there (no-op)
    name: "بی‌کی‌تی", nameEn: "BKT", country: "India", type: "TIRE_BRAND",
    industries: ["TIRES"],
    aliases: ["BKT", "بی‌کی‌تی"],
  },
  { name: "تایتان", nameEn: "Titan", country: "USA", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "ترل‌بورگ", nameEn: "Trelleborg", country: "Sweden", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "فایرستون", nameEn: "Firestone", country: "USA", type: "TIRE_BRAND", industries: ["TIRES"], aliases: ["فایرستون"] },
  { name: "هانکوک", nameEn: "Hankook", country: "South Korea", type: "TIRE_BRAND", industries: ["TIRES"], aliases: ["هانکوک"] },
  { name: "کومهو", nameEn: "Kumho", country: "South Korea", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "تویو", nameEn: "Toyo", country: "Japan", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "لینگ‌لانگ", nameEn: "Linglong", country: "China", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "ترینگل", nameEn: "Triangle", country: "China", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "سای‌لون", nameEn: "Sailun", country: "China", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "دابل کوین", nameEn: "Double Coin", country: "China", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "گیتی", nameEn: "Giti", country: "Singapore", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "ائولوس", nameEn: "Aeolus", country: "China", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "وست‌لک", nameEn: "Westlake", country: "China", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "مکسام", nameEn: "Maxam", country: "UK", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "ادوانس", nameEn: "Advance", country: "China", type: "TIRE_BRAND", industries: ["TIRES"] },
  { name: "تک‌کینگ", nameEn: "Techking", country: "China", type: "TIRE_BRAND", industries: ["TIRES"] },

  // ─────────────────────────────────────────────────────────
  // §32-33 ELECTRICAL / AUTOMATION / SENSORS
  // Siemens is parent for Siemens Mobility (§38-39) — must come first.
  // Eaton (§27) and Hitachi (§25) already merged ELECTRICAL above.
  // Mitsubishi Electric parent: mitsubishi (defined in §22).
  // ─────────────────────────────────────────────────────────
  {
    name: "زیمنس", nameEn: "Siemens", country: "Germany", type: "TECHNOLOGY_BRAND",
    industries: ["ELECTRICAL", "AUTOMATION", "INDUSTRIAL_EQUIPMENT", "RAILWAY"],
    aliases: ["زیمنس"],
  },
  {
    name: "آبی‌بی", nameEn: "ABB", country: "Switzerland", type: "TECHNOLOGY_BRAND",
    industries: ["ELECTRICAL", "AUTOMATION", "INDUSTRIAL_EQUIPMENT", "MARINE"],
    aliases: ["آبی‌بی"],
  },
  {
    name: "اشنایدر الکتریک", nameEn: "Schneider Electric", country: "France", type: "TECHNOLOGY_BRAND",
    industries: ["ELECTRICAL", "AUTOMATION"],
    aliases: ["اشنایدر الکتریک"],
  },
  {
    name: "راک‌ول اوتومیشن", nameEn: "Rockwell Automation", country: "USA", type: "TECHNOLOGY_BRAND",
    industries: ["AUTOMATION", "ELECTRICAL"],
  },
  {
    name: "هانی‌ول", nameEn: "Honeywell", country: "USA", type: "TECHNOLOGY_BRAND",
    industries: ["AUTOMATION", "ELECTRICAL", "OIL_GAS"],
    aliases: ["هانی‌ول"],
  },
  {
    name: "میتسوبیشی الکتریک", nameEn: "Mitsubishi Electric", parent: "mitsubishi",
    country: "Japan", type: "TECHNOLOGY_BRAND",
    industries: ["ELECTRICAL", "AUTOMATION"],
  },
  {
    name: "امرون", nameEn: "Omron", country: "Japan", type: "TECHNOLOGY_BRAND",
    industries: ["AUTOMATION", "ELECTRICAL"],
    aliases: ["امرون"],
  },
  {
    name: "یاسکاوا", nameEn: "Yaskawa", country: "Japan", type: "TECHNOLOGY_BRAND",
    industries: ["AUTOMATION", "ELECTRICAL"],
  },
  { name: "فوجی الکتریک", nameEn: "Fuji Electric", country: "Japan", type: "TECHNOLOGY_BRAND", industries: ["ELECTRICAL"] },
  { name: "توشیبا", nameEn: "Toshiba", country: "Japan", type: "TECHNOLOGY_BRAND", industries: ["ELECTRICAL"] },
  {
    name: "جی‌ای", nameEn: "GE", country: "USA", type: "TECHNOLOGY_BRAND",
    industries: ["ELECTRICAL", "OIL_GAS", "RAILWAY"],
  },
  {
    name: "امرسون", nameEn: "Emerson", country: "USA", type: "TECHNOLOGY_BRAND",
    industries: ["AUTOMATION", "OIL_GAS"],
  },
  { name: "فونیکس کانتکت", nameEn: "Phoenix Contact", country: "Germany", type: "PARTS_BRAND", industries: ["ELECTRICAL"] },
  { name: "واگو", nameEn: "WAGO", country: "Germany", type: "PARTS_BRAND", industries: ["ELECTRICAL"] },
  { name: "واید‌مولر", nameEn: "Weidmüller", country: "Germany", type: "PARTS_BRAND", industries: ["ELECTRICAL"] },
  { name: "دلتا", nameEn: "Delta", country: "Taiwan", type: "TECHNOLOGY_BRAND", industries: ["ELECTRICAL"] },
  { name: "ال‌اس الکتریک", nameEn: "LS Electric", country: "South Korea", type: "TECHNOLOGY_BRAND", industries: ["ELECTRICAL"] },
  { name: "اندرس+هاوزر", nameEn: "Endress+Hauser", country: "Switzerland", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "يوکوگاوا", nameEn: "Yokogawa", country: "Japan", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "پپرل+فوکس", nameEn: "Pepperl+Fuchs", country: "Germany", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "سیک", nameEn: "SICK", country: "Germany", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "آی‌اف‌ام", nameEn: "IFM", country: "Germany", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "بالوف", nameEn: "Balluff", country: "Germany", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "تورک", nameEn: "Turck", country: "Germany", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "کی‌انس", nameEn: "Keyence", country: "Japan", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "ویکا", nameEn: "WIKA", country: "Germany", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "وگا", nameEn: "VEGA", country: "Germany", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "باومر", nameEn: "Baumer", country: "Switzerland", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },
  { name: "کرونه", nameEn: "KROHNE", country: "Germany", type: "TECHNOLOGY_BRAND", industries: ["AUTOMATION"] },

  // ─────────────────────────────────────────────────────────
  // §34-35 WELDING / TOOLS
  // Parents first: Panasonic → Panasonic Welding. (Panasonic must come before.)
  // Bosch merged with §37 BATTERIES. Ingersoll Rand (§25), Chicago Pneumatic
  //   (§25), Atlas Copco (re-upsert add TOOLS), Hitachi (§25) already merged.
  // Miller here = Miller Electric (welding) — slug override "miller-electric" to
  //   avoid collision with §44 Miller (attachments, slug "miller-attachments").
  // Festo merged with §38-39 INDUSTRIAL_EQUIPMENT.
  // ─────────────────────────────────────────────────────────
  {
    name: "لینکلن الکتریک", nameEn: "Lincoln Electric", country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["TOOLS"],
    aliases: ["لینکلن الکتریک"],
  },
  {
    // Miller Electric (welding) — slug override to avoid collision with §44 Miller.
    name: "میلر", nameEn: "Miller", slug: "miller-electric", country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["TOOLS"],
  },
  {
    name: "اساب", nameEn: "ESAB", country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["TOOLS"],
    aliases: ["اساب"],
  },
  { name: "فرونیوس", nameEn: "Fronius", country: "Austria", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "کمپی", nameEn: "Kemppi", country: "Finland", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "هایپرثرم", nameEn: "Hypertherm", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "او‌تی‌سی", nameEn: "OTC", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  {
    name: "پاناسونیک", nameEn: "Panasonic", country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["TOOLS", "ELECTRICAL"],
    aliases: ["پاناسونیک"],
  },
  {
    name: "پاناسونیک ولدینگ", nameEn: "Panasonic Welding", parent: "panasonic",
    country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["TOOLS"],
  },
  { name: "ای‌دبلیو‌ام", nameEn: "EWM", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "تل‌وین", nameEn: "Telwin", country: "Italy", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "هوبارت", nameEn: "Hobart", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "لورچ", nameEn: "Lorch", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "جی‌وای‌اس", nameEn: "GYS", country: "France", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "متابو", nameEn: "Metabo", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  {
    name: "بوش", nameEn: "Bosch", family: "bosch", country: "Germany", type: "INDUSTRIAL_BRAND",
    industries: ["TOOLS", "ELECTRICAL", "BATTERIES"],
    aliases: ["بوش"],
  },
  { name: "ماکیتا", nameEn: "Makita", country: "Japan", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"], aliases: ["ماکیتا"] },
  { name: "دوالت", nameEn: "DeWalt", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"], aliases: ["دوالت"] },
  { name: "میلوکی", nameEn: "Milwaukee", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"], aliases: ["میلوکی"] },
  { name: "هیلتی", nameEn: "Hilti", country: "Liechtenstein", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"], aliases: ["هیلتی"] },
  { name: "فستول", nameEn: "Festool", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "استنلی", nameEn: "Stanley", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"], aliases: ["استنلی"] },
  { name: "فاکوم", nameEn: "Facom", country: "France", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "اسنپ-آن", nameEn: "Snap-on", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "گدور", nameEn: "Gedore", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "هتست", nameEn: "Hazet", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "باکو", nameEn: "Bahco", country: "Sweden", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "بتا", nameEn: "Beta", country: "Italy", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "ورا", nameEn: "Wera", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "کنیپکس", nameEn: "Knipex", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  { name: "پروتو", nameEn: "Proto", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["TOOLS"] },
  {
    // Already in DB (A) — preserve fields, add TOOLS
    name: "آتلس کوپکو", nameEn: "Atlas Copco", family: "atlas-copco-group", country: "Sweden",
    industries: ["TOOLS"],
    aliases: ["آتلس کوپکو"],
  },
  {
    name: "فستو", nameEn: "Festo", country: "Germany", type: "INDUSTRIAL_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT", "PNEUMATICS"],
  },

  // ─────────────────────────────────────────────────────────
  // §36 LUBRICANTS
  // SKF (§29) already merged LUBRICANTS above.
  // ─────────────────────────────────────────────────────────
  { name: "شل", nameEn: "Shell", country: "Netherlands", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"], aliases: ["شل"] },
  { name: "موبیل", nameEn: "Mobil", country: "USA", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"], aliases: ["موبیل"] },
  { name: "اکسون‌موبیل", nameEn: "ExxonMobil", country: "USA", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "کسترول", nameEn: "Castrol", country: "UK", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"], aliases: ["کسترول"] },
  { name: "بی‌پی", nameEn: "BP", country: "UK", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"], aliases: ["بی‌پی"] },
  { name: "شورون", nameEn: "Chevron", country: "USA", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"], aliases: ["شورون"] },
  { name: "تکزاکو", nameEn: "Texaco", country: "USA", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "توتال", nameEn: "TotalEnergies", country: "France", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"], aliases: ["توتال"] },
  { name: "پتروناس", nameEn: "Petronas", country: "Malaysia", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "والوولین", nameEn: "Valvoline", country: "USA", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"], aliases: ["والوولین"] },
  { name: "فوکس", nameEn: "Fuchs", country: "Germany", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "کلوبر", nameEn: "Klüber", country: "Germany", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "لیکوی مولی", nameEn: "Liqui Moly", country: "Germany", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "موتول", nameEn: "Motul", country: "France", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "رپسول", nameEn: "Repsol", country: "Spain", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "گالف", nameEn: "Gulf", country: "USA", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "کالتکس", nameEn: "Caltex", country: "USA", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "انئوس", nameEn: "ENEOS", country: "Japan", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },
  { name: "ایدمیتسو", nameEn: "Idemitsu", country: "Japan", type: "LUBRICANT_BRAND", industries: ["LUBRICANTS"] },

  // ─────────────────────────────────────────────────────────
  // §37 BATTERIES
  // Bosch (§34-35) already merged BATTERIES above.
  // CAT here = the existing "Cat" brand (slug "cat", from A) — add BATTERIES.
  //   Per spec instruction "for brands already seeded by A, just upsert+add the
  //   new industry", we preserve A's Cat data (type MACHINE_BRAND, parent
  //   caterpillar, family caterpillar-inc) and only add BATTERIES. Spec's
  //   "PARTS_BRAND" type is NOT applied to avoid overwriting A's Cat type.
  // ─────────────────────────────────────────────────────────
  { name: "اکساید", nameEn: "Exide", country: "USA", type: "PARTS_BRAND", industries: ["BATTERIES"], aliases: ["اکساید"] },
  { name: "وارتا", nameEn: "Varta", country: "Germany", type: "PARTS_BRAND", industries: ["BATTERIES"], aliases: ["وارتا"] },
  { name: "یواسا", nameEn: "Yuasa", country: "Japan", type: "PARTS_BRAND", industries: ["BATTERIES"], aliases: ["یواسا"] },
  { name: "جی‌اس یواسا", nameEn: "GS Yuasa", country: "Japan", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "کلاریوس", nameEn: "Clarios", country: "USA", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "اپتیما", nameEn: "Optima", country: "USA", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "بنر", nameEn: "Banner", country: "Austria", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "فیام", nameEn: "FIAMM", country: "Italy", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "انر‌سیس", nameEn: "EnerSys", country: "USA", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "ادیسی", nameEn: "Odyssey", country: "USA", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "نورت‌استار", nameEn: "NorthStar", country: "USA", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  {
    // Already in DB (A, slug "cat") — preserve all fields, add BATTERIES.
    // (Spec's PARTS_BRAND type not applied — preserves A's MACHINE_BRAND.)
    name: "کت", nameEn: "Cat", parent: "caterpillar", family: "caterpillar-inc",
    country: "USA",
    industries: ["BATTERIES"],
    aliases: ["کت", "CAT ماشین‌آلات"],
  },
  { name: "دکا", nameEn: "Deka", country: "USA", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "ای‌سی‌دلکو", nameEn: "ACDelco", country: "USA", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "امارون", nameEn: "Amaron", country: "India", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "راکت", nameEn: "Rocket", country: "South Korea", type: "PARTS_BRAND", industries: ["BATTERIES"] },
  { name: "موتلو", nameEn: "Mutlu", country: "Turkey", type: "PARTS_BRAND", industries: ["BATTERIES"] },

  // ─────────────────────────────────────────────────────────
  // §38-39 INDUSTRIAL EQUIPMENT / DRIVES
  // Parents: caterpillar (A), siemens (§32-33), hitachi (§25).
  // Festo (§34-35) and Voith (§28) already merged INDUSTRIAL_EQUIPMENT/RAILWAY.
  // Progress Rail parent: caterpillar, family: caterpillar-inc.
  // Siemens Mobility parent: siemens. Hitachi Rail parent: hitachi.
  // Sumitomo Drive family: sumitomo-heavy-industries.
  // Bauer Gear — slug "bauer-gear" (distinct from A's Bauer drilling, slug "bauer").
  // ─────────────────────────────────────────────────────────
  { name: "سو-یورودرایو", nameEn: "SEW-Eurodrive", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "نورد", nameEn: "Nord", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "بونفیلیولی", nameEn: "Bonfiglioli", country: "Italy", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "فلندر", nameEn: "Flender", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "لنزه", nameEn: "Lenze", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "وگ", nameEn: "WEG", country: "Brazil", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT", "ELECTRICAL"] },
  { name: "تکو", nameEn: "TECO", country: "Taiwan", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT", "ELECTRICAL"] },
  { name: "بالدور", nameEn: "Baldor", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  { name: "ریگال رکسنورد", nameEn: "Regal Rexnord", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  {
    name: "سومیتومو درایو", nameEn: "Sumitomo Drive", family: "sumitomo-heavy-industries",
    country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT"],
  },
  { name: "باور گیر", nameEn: "Bauer Gear", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["INDUSTRIAL_EQUIPMENT"] },
  {
    name: "کونکرین", nameEn: "Konecranes", country: "Finland", type: "INDUSTRIAL_BRAND",
    industries: ["LIFTING", "MARINE", "MATERIAL_HANDLING"],
    aliases: ["کونکرین"],
  },
  { name: "ZPMC", nameEn: "ZPMC", country: "China", type: "INDUSTRIAL_BRAND", industries: ["MARINE", "LIFTING"] },
  {
    name: "پروگرس ریل", nameEn: "Progress Rail", parent: "caterpillar", family: "caterpillar-inc",
    country: "USA", type: "INDUSTRIAL_BRAND",
    industries: ["RAILWAY"],
    aliases: ["پروگرس ریل"],
  },
  { name: "جی‌ای ترناسپورتیشن", nameEn: "GE Transportation", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["RAILWAY"] },
  { name: "واب‌تک", nameEn: "Wabtec", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["RAILWAY"] },
  {
    name: "زیمنس موبیلیتی", nameEn: "Siemens Mobility", parent: "siemens",
    country: "Germany", type: "INDUSTRIAL_BRAND",
    industries: ["RAILWAY"],
  },
  { name: "آلستوم", nameEn: "Alstom", country: "France", type: "INDUSTRIAL_BRAND", industries: ["RAILWAY"], aliases: ["آلستوم"] },
  { name: "CRRC", nameEn: "CRRC", country: "China", type: "INDUSTRIAL_BRAND", industries: ["RAILWAY"] },
  {
    name: "هیتاچی ریل", nameEn: "Hitachi Rail", parent: "hitachi",
    country: "Japan", type: "INDUSTRIAL_BRAND",
    industries: ["RAILWAY"],
  },
  { name: "شتادلر", nameEn: "Stadler", country: "Switzerland", type: "INDUSTRIAL_BRAND", industries: ["RAILWAY"], aliases: ["شتادلر"] },
  { name: "کنور-برمزه", nameEn: "Knorr-Bremse", country: "Germany", type: "INDUSTRIAL_BRAND", industries: ["RAILWAY"] },
  { name: "وارتسیلا", nameEn: "Wärtsilä", country: "Finland", type: "INDUSTRIAL_BRAND", industries: ["MARINE"], aliases: ["وارتسیلا"] },
  { name: "کونگسبرگ", nameEn: "Kongsberg", country: "Norway", type: "INDUSTRIAL_BRAND", industries: ["MARINE"] },
  { name: "رولزرویس", nameEn: "Rolls-Royce", country: "UK", type: "INDUSTRIAL_BRAND", industries: ["MARINE"], aliases: ["رولزرویس"] },

  // ─────────────────────────────────────────────────────────
  // §40 OIL & GAS (all new)
  // ─────────────────────────────────────────────────────────
  { name: "بیکر هیوز", nameEn: "Baker Hughes", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"] },
  { name: "هالیبرتون", nameEn: "Halliburton", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"] },
  { name: "اس‌ال‌بی", nameEn: "SLB", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"], aliases: ["اشلومبرگر"] },
  { name: "ان‌او‌وی", nameEn: "NOV", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"] },
  { name: "ودرفورد", nameEn: "Weatherford", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"] },
  { name: "تکنیپ‌اف‌ام‌سی", nameEn: "TechnipFMC", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"] },
  { name: "اشلومبرگر", nameEn: "Schlumberger", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"] },
  { name: "کامرون", nameEn: "Cameron", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"] },
  { name: "اف‌ام‌سی", nameEn: "FMC", country: "USA", type: "INDUSTRIAL_BRAND", industries: ["OIL_GAS"] },

  // ─────────────────────────────────────────────────────────
  // §42 WASTE / RECYCLING
  // Bandit already in DB (A) — WASTE_RECYCLING already there (no-op), preserve.
  // ─────────────────────────────────────────────────────────
  { name: "کومپتک", nameEn: "Komptech", country: "Austria", type: "MACHINE_BRAND", industries: ["WASTE_RECYCLING"] },
  { name: "تانا", nameEn: "Tana", country: "Finland", type: "MACHINE_BRAND", industries: ["WASTE_RECYCLING"] },
  { name: "دوپشتات", nameEn: "Doppstadt", country: "Germany", type: "MACHINE_BRAND", industries: ["WASTE_RECYCLING"] },
  { name: "اگرسمان", nameEn: "Eggersmann", country: "Germany", type: "MACHINE_BRAND", industries: ["WASTE_RECYCLING"] },
  { name: "لیندنر", nameEn: "Lindner", country: "Austria", type: "MACHINE_BRAND", industries: ["WASTE_RECYCLING"] },
  { name: "وکوپلن", nameEn: "Vecoplan", country: "Germany", type: "MACHINE_BRAND", industries: ["WASTE_RECYCLING"] },
  { name: "اس‌اس‌ای شریدینگ", nameEn: "SSI Shredding", country: "USA", type: "MACHINE_BRAND", industries: ["WASTE_RECYCLING"] },
  { name: "هامل", nameEn: "Hammel", country: "Germany", type: "MACHINE_BRAND", industries: ["WASTE_RECYCLING"] },
  {
    // Already in DB (A) — preserve fields, WASTE_RECYCLING already there (no-op)
    name: "باندیت", nameEn: "Bandit", country: "USA",
    industries: ["WASTE_RECYCLING"],
    aliases: ["باندیت"],
  },

  // ─────────────────────────────────────────────────────────
  // §44 ATTACHMENTS (all new)
  // Miller here = Miller (attachments) — slug override "miller-attachments" to
  //   avoid collision with §34-35 Miller Electric (slug "miller-electric").
  // Genesis here = Genesis (attachments, USA) — slug override "genesis-attachments"
  //   to avoid collision with §22 Genesis (cars, South Korea, slug "genesis").
  // ─────────────────────────────────────────────────────────
  { name: "انگکن", nameEn: "Engcon", country: "Sweden", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "استیل‌وریست", nameEn: "Steelwrist", country: "Sweden", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "روتوتیلت", nameEn: "Rototilt", country: "Sweden", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "وراخترت", nameEn: "Verachtert", country: "Belgium", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  {
    // Miller (attachments) — slug override to avoid collision with §34-35 Miller Electric.
    name: "میلر", nameEn: "Miller", slug: "miller-attachments", country: "USA", type: "MACHINE_BRAND",
    industries: ["ATTACHMENTS"],
  },
  { name: "رمر", nameEn: "Rammer", country: "Finland", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "مونتابرت", nameEn: "Montabert", country: "France", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "ان‌پی‌کی", nameEn: "NPK", country: "USA", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "ایندکو", nameEn: "Indeco", country: "Italy", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "سوسان", nameEn: "Soosan", country: "South Korea", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "اوکادا", nameEn: "Okada", country: "Japan", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  {
    // Genesis (attachments, USA) — slug override to avoid collision with §22 Genesis (cars).
    name: "جنسیس", nameEn: "Genesis", slug: "genesis-attachments", country: "USA", type: "MACHINE_BRAND",
    industries: ["ATTACHMENTS"],
  },
  { name: "لابونتی", nameEn: "LaBounty", country: "USA", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "کینشوفر", nameEn: "Kinshofer", country: "Germany", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "اویل‌کوییک", nameEn: "OilQuick", country: "Sweden", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "لنهوف", nameEn: "Lehnhoff", country: "Germany", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "گایث", nameEn: "Geith", country: "Ireland", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "سیمکس", nameEn: "Simex", country: "Italy", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },
  { name: "ام‌بی کراشر", nameEn: "MB Crusher", country: "Italy", type: "MACHINE_BRAND", industries: ["ATTACHMENTS"] },

  // ─────────────────────────────────────────────────────────
  // §45 SPARE PARTS (new)
  // ─────────────────────────────────────────────────────────
  { name: "دنسو", nameEn: "Denso", country: "Japan", type: "OEM", industries: ["SPARE_PARTS"], aliases: ["دنسو"] },
  { name: "والئو", nameEn: "Valeo", country: "France", type: "OEM", industries: ["SPARE_PARTS"], aliases: ["والئو"] },
  { name: "گیتس", nameEn: "Gates", country: "USA", type: "OEM", industries: ["SPARE_PARTS"] },

  // ─────────────────────────────────────────────────────────
  // §46 IRANIAN
  // HEPCO already in DB (seed.ts) — preserve fields, add industries + alias.
  // ─────────────────────────────────────────────────────────
  {
    // Already in DB (seed.ts, slug "hepco") — preserve fields, add industries + alias
    name: "هپکو", nameEn: "HEPCO", country: "Iran", type: "MACHINE_BRAND",
    industries: ["INDUSTRIAL_EQUIPMENT", "CONSTRUCTION_MACHINERY"],
    aliases: ["هپکو"],
  },

  // ─────────────────────────────────────────────────────────
  // §47 LEGACY (all new, status: LEGACY)
  // International Harvester — slug "international-harvester" (distinct from §18
  //   International, slug "international").
  // ─────────────────────────────────────────────────────────
  {
    name: "یوکلید", nameEn: "Euclid", country: "USA", type: "LEGACY_BRAND", status: "LEGACY",
    industries: ["CONSTRUCTION_MACHINERY", "MINING_MACHINERY"],
  },
  {
    name: "الیس-چالمرز", nameEn: "Allis-Chalmers", country: "USA", type: "LEGACY_BRAND", status: "LEGACY",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE"],
  },
  {
    name: "اینترنشنال هاروستر", nameEn: "International Harvester", country: "USA",
    type: "LEGACY_BRAND", status: "LEGACY",
    industries: ["CONSTRUCTION_MACHINERY", "AGRICULTURE", "TRUCKS"],
    aliases: ["اینترنشنال هاروستر"],
  },
  {
    name: "وایت", nameEn: "White", country: "USA", type: "LEGACY_BRAND", status: "LEGACY",
    industries: ["AGRICULTURE", "CONSTRUCTION_MACHINERY"],
  },
  {
    name: "الیور", nameEn: "Oliver", country: "USA", type: "LEGACY_BRAND", status: "LEGACY",
    industries: ["AGRICULTURE"],
  },
  {
    name: "هستون", nameEn: "Hesston", country: "USA", type: "LEGACY_BRAND", status: "LEGACY",
    industries: ["AGRICULTURE"],
  },
  {
    name: "لنسینگ بگنال", nameEn: "Lansing Bagnall", country: "UK", type: "LEGACY_BRAND", status: "LEGACY",
    industries: ["MATERIAL_HANDLING"],
  },
  {
    name: "میچیگان", nameEn: "Michigan", country: "USA", type: "LEGACY_BRAND", status: "LEGACY",
    industries: ["CONSTRUCTION_MACHINERY"],
  },
];

// ════════════════════════════════════════════════════════════
// UPSERT HELPERS (copied exactly from seed-brands-a.ts)
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
  // Guard: Phase A must have run first (industries + families exist).
  const industryCount = await db.industry.count();
  if (industryCount === 0) {
    console.error("✗ No industries found in DB. Run seed-brands-a.ts first.");
    process.exit(1);
  }

  console.log(`Seeding brands (Phase B: industries 11-39, ${BRANDS.length} entries)...`);
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
  console.log(`✓ ${BRANDS.length} brand entries processed`);

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
