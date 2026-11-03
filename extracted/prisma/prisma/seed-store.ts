// One-off seed script for the MEKANIX store DB.
// Run with: bunx tsx prisma/seed-store.ts
import { storeDb } from "../src/lib/store-db";

async function main() {
  console.log("Seeding MEKANIX store DB...");

  // Currency setting
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

  const now = new Date();
  const tehran = new Date(now.getTime() + (3.5 * 60 + now.getTimezoneOffset()) * 60000);
  const today = `${tehran.getUTCFullYear()}-${String(tehran.getUTCMonth() + 1).padStart(2, "0")}-${String(tehran.getUTCDate()).padStart(2, "0")}`;
  await storeDb.currencyRate.upsert({
    where: { date: today },
    update: {},
    create: { date: today, rate: 230000, marginPercent: 3, source: "MANUAL", note: "نرخ اولیه" },
  });

  // Categories
  const categories = [
    { name: "موتور و قطعات موتور", slug: "engine" },
    { name: "سیستم ترمز", slug: "brakes" },
    { name: "سیستم تعلیق", slug: "suspension" },
    { name: "الکتریکی و باتری", slug: "electrical" },
    { name: "فیلترها", slug: "filters" },
    { name: "روغن و روانکار", slug: "oils" },
    { name: "بدنه و چراغ", slug: "body-lights" },
    { name: "داخل کابین", slug: "interior" },
    { name: "کلاچ و گیربکس", slug: "clutch-gearbox" },
    { name: "اکزوزت", slug: "exhaust" },
  ];
  const catMap: Record<string, string> = {};
  for (const c of categories) {
    const existing = await storeDb.category.findUnique({ where: { slug: c.slug } });
    if (existing) { catMap[c.slug] = existing.id; continue; }
    const created = await storeDb.category.create({ data: c });
    catMap[c.slug] = created.id;
  }

  // Brands
  const brands = [
    { name: "Bosch", slug: "bosch", country: "آلمان" },
    { name: "Denso", slug: "denso", country: "ژاپن" },
    { name: "NGK", slug: "ngk", country: "ژاپن" },
    { name: "Mann Filter", slug: "mann", country: "آلمان" },
    { name: "Valvoline", slug: "valvoline", country: "آمریکا" },
    { name: "Brembo", slug: "brembo", country: "ایتالیا" },
    { name: " Mobil 1", slug: "mobil1", country: "آمریکا" },
    { name: "INA", slug: "ina", country: "آلمان" },
    { name: "SKF", slug: "skf", country: "سوئد" },
    { name: "Continental", slug: "continental", country: "آلمان" },
  ].map((b) => ({ ...b, name: b.name.trim() }));
  const brandMap: Record<string, string> = {};
  for (const b of brands) {
    const existing = await storeDb.brand.findUnique({ where: { slug: b.slug } });
    if (existing) { brandMap[b.slug] = existing.id; continue; }
    const created = await storeDb.brand.create({ data: b });
    brandMap[b.slug] = created.id;
  }

  // Car models
  const carModels = [
    { brand: "پژو", model: "۲۰۶", yearFrom: 2001, yearTo: 2024, type: "PASSENGER" },
    { brand: "پژو", model: "پارس", yearFrom: 1999, yearTo: 2024, type: "PASSENGER" },
    { brand: "سمند", model: "LX", yearFrom: 2000, yearTo: 2018, type: "PASSENGER" },
    { brand: "تویوتا", model: "کرولا", yearFrom: 2014, yearTo: 2024, type: "PASSENGER" },
    { brand: "هیوندای", model: "الانترا", yearFrom: 2016, yearTo: 2024, type: "PASSENGER" },
    { brand: "وولوو", model: "FH16", yearFrom: 2010, yearTo: 2024, type: "HEAVY" },
    { brand: "اسکانیا", model: "R500", yearFrom: 2012, yearTo: 2024, type: "HEAVY" },
  ];
  for (const cm of carModels) {
    const existing = await storeDb.carModel.findFirst({ where: { brand: cm.brand, model: cm.model } });
    if (!existing) {
      await storeDb.carModel.create({ data: cm });
    }
  }

  // Sample parts
  const parts = [
    { name: "شمع موتور ایریدیم", nameFa: "شمع موتور ایریدیم NGK", sku: "NGK-IR-001", categorySlug: "engine", brandSlug: "ngk", priceUsd: 8.5, stock: 120, featured: true },
    { name: "لنت ترمز جلو", nameFa: "لنت ترمز جلو Brembo", sku: "BRM-FB-001", categorySlug: "brakes", brandSlug: "brembo", priceUsd: 35, stock: 45, featured: true },
    { name: "فیلتر روغن", nameFa: "فیلتر روغن Mann", sku: "MANN-OF-001", categorySlug: "filters", brandSlug: "mann", priceUsd: 4.2, stock: 300 },
    { name: "فیلتر هوا", nameFa: "فیلتر هوا Bosch", sku: "BSH-AF-001", categorySlug: "filters", brandSlug: "bosch", priceUsd: 6.8, stock: 200 },
    { name: "روغن موتور 5W-30", nameFa: "روغن موتور Mobil 1", sku: "MOB1-5W30-4L", categorySlug: "oils", brandSlug: "mobil1", priceUsd: 28, stock: 80 },
    { name: "باتری ۶۰ آمپر", nameFa: "باتری ۶۰ آمپر سیلد", sku: "BAT-60-001", categorySlug: "electrical", brandSlug: "bosch", priceUsd: 65, stock: 25 },
    { name: "کلاچ کامل", nameFa: "کلاچ کامل INA", sku: "INA-CL-001", categorySlug: "clutch-gearbox", brandSlug: "ina", priceUsd: 110, stock: 12 },
    { name: "بلبرینگ چرخ", nameFa: "بلبرینگ چرخ SKF", sku: "SKF-WB-001", categorySlug: "suspension", brandSlug: "skf", priceUsd: 22, stock: 60 },
    { name: "تسمه تایم", nameFa: "تسمه تایم Continental", sku: "CTN-TB-001", categorySlug: "engine", brandSlug: "continental", priceUsd: 45, stock: 30 },
    { name: "چراغ جلو LED", nameFa: "چراغ جلو LED هالوژن", sku: "LGT-HL-001", categorySlug: "body-lights", brandSlug: "bosch", priceUsd: 75, stock: 18, featured: true },
  ];
  for (const p of parts) {
    const existing = await storeDb.part.findUnique({ where: { sku: p.sku } });
    if (existing) continue;
    await storeDb.part.create({
      data: {
        name: p.name,
        nameFa: p.nameFa,
        sku: p.sku,
        categoryId: catMap[p.categorySlug],
        brandId: brandMap[p.brandSlug],
        priceUsd: p.priceUsd,
        stock: p.stock,
        lowStockThreshold: 5,
        images: "[]",
        compatibleCars: "[]",
        active: true,
        featured: !!p.featured,
      },
    });
  }

  console.log("MEKANIX store seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await storeDb.$disconnect();
  });
