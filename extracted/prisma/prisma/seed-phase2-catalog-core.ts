/**
 * Phase 2: Catalog Core Seed — Brand Models + Products
 * Per HEAVIX Operational Execution Plan V2.0 §2.1-2.3.
 *
 * Creates the Brand → ProductModel → Product chain for the top brands.
 * Links existing Listings to Products where possible.
 *
 * This is NOT new feature development — it fills the gaps identified
 * in the Phase 2 audit:
 *   - ProductModel: 0 → seed with real models
 *   - Product: 9 → expand to 30+
 *   - Brand → ProductModel relations: 0 → create
 *   - Listing → Product relations: 0 → link
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("=== PHASE 2: CATALOG CORE SEED ===\n");

  // Get key brands
  const komatsu = await db.brand.findFirst({ where: { slug: "komatsu" } });
  const caterpillar = await db.brand.findFirst({ where: { slug: "caterpillar" } });
  const hitachi = await db.brand.findFirst({ where: { slug: "hitachi" } });
  const volvo = await db.brand.findFirst({ where: { slug: "volvo-ce" } });
  const liebherr = await db.brand.findFirst({ where: { slug: "liebherr" } });
  const doosan = await db.brand.findFirst({ where: { slug: "doosan" } });
  const hyundai = await db.brand.findFirst({ where: { slug: "hyundai" } });
  const jcb = await db.brand.findFirst({ where: { slug: "jcb" } });

  // Get key categories
  const roadCat = await db.category.findFirst({ where: { slug: "road-construction" } });
  const miningCat = await db.category.findFirst({ where: { slug: "mining-machinery" } });
  const cranesCat = await db.category.findFirst({ where: { slug: "cranes-lifting" } });
  const forkliftCat = await db.category.findFirst({ where: { slug: "forklift-material" } });

  // ── 1. ProductModels ──
  console.log("1. Seeding ProductModels...");
  const models = [
    // Komatsu
    { name: "PC200-8", nameEn: "PC200-8", brand: komatsu, cat: roadCat },
    { name: "PC210-8", nameEn: "PC210-8", brand: komatsu, cat: roadCat },
    { name: "PC350-8", nameEn: "PC350-8", brand: komatsu, cat: roadCat },
    { name: "D85A", nameEn: "D85A", brand: komatsu, cat: roadCat },
    { name: "GD825A", nameEn: "GD825A", brand: komatsu, cat: roadCat },
    { name: "WA380", nameEn: "WA380", brand: komatsu, cat: roadCat },
    // Caterpillar
    { name: "320D", nameEn: "320D", brand: caterpillar, cat: roadCat },
    { name: "336D", nameEn: "336D", brand: caterpillar, cat: roadCat },
    { name: "966H", nameEn: "966H", brand: caterpillar, cat: roadCat },
    { name: "D6R", nameEn: "D6R", brand: caterpillar, cat: roadCat },
    { name: "14M", nameEn: "14M", brand: caterpillar, cat: roadCat },
    // Hitachi
    { name: "ZX210", nameEn: "ZX210", brand: hitachi, cat: roadCat },
    { name: "ZX350", nameEn: "ZX350", brand: hitachi, cat: roadCat },
    { name: "ZX470", nameEn: "ZX470", brand: hitachi, cat: roadCat },
    // Volvo
    { name: "A40G", nameEn: "A40G", brand: volvo, cat: miningCat },
    { name: "L120H", nameEn: "L120H", brand: volvo, cat: roadCat },
    { name: "EC220", nameEn: "EC220", brand: volvo, cat: roadCat },
    // Liebherr
    { name: "R924", nameEn: "R924", brand: liebherr, cat: roadCat },
    { name: "LR1100", nameEn: "LR1100", brand: liebherr, cat: cranesCat },
    // Doosan
    { name: "DX140", nameEn: "DX140", brand: doosan, cat: roadCat },
    { name: "DX225", nameEn: "DX225", brand: doosan, cat: roadCat },
    // Hyundai
    { name: "R210", nameEn: "R210", brand: hyundai, cat: roadCat },
    { name: "HL740", nameEn: "HL740", brand: hyundai, cat: roadCat },
    // JCB
    { name: "JS160", nameEn: "JS160", brand: jcb, cat: roadCat },
  ];

  let modelCount = 0;
  for (const m of models) {
    if (!m.brand || !m.cat) continue;
    const slug = `${m.brand.slug}-${m.nameEn}`.toLowerCase();
    const existing = await db.productModel.findFirst({ where: { brandId: m.brand.id, slug } });
    if (!existing) {
      await db.productModel.create({
        data: {
          brandId: m.brand.id,
          name: m.name,
          nameEn: m.nameEn,
          slug,
          categoryId: m.cat.id,
          status: "ACTIVE",
          description: `${m.brand.name} ${m.name}`,
        },
      });
      modelCount++;
    }
  }
  console.log(`  ✓ ${modelCount} product models created`);

  // ── 2. Products (expanded) ──
  console.log("\n2. Seeding Products...");
  
  // Get all product models
  const allModels = await db.productModel.findMany({ include: { brand: { select: { name: true, slug: true } } } });
  
  let productCount = 0;
  for (const model of allModels) {
    const slug = `${model.slug}-product`.toLowerCase();
    const existing = await db.product.findFirst({ where: { slug } });
    if (!existing) {
      await db.product.create({
        data: {
          canonicalName: `${model.brand?.name || ""} ${model.name}`,
          slug,
          categoryId: model.categoryId || roadCat?.id || "",
          brandId: model.brandId,
          modelId: model.id,
          status: "ACTIVE",
          source: "SEED",
          description: `${model.brand?.name} ${model.name} — محصول کاتالوگ`,
          verifiedAt: new Date(),
          verifiedBy: "admin",
        },
      });
      productCount++;
    }
  }
  console.log(`  ✓ ${productCount} products created/linked`);

  // ── 3. Link existing Listings to Products ──
  console.log("\n3. Linking Listings to Products...");
  
  const listings = await db.listing.findMany({ where: { productId: null }, select: { id: true, title: true, brandId: true } });
  const products = await db.product.findMany({ select: { id: true, canonicalName: true, brandId: true } });
  
  let linkedCount = 0;
  for (const listing of listings) {
    // Try to find a matching product by brand
    const matchingProduct = products.find(p => p.brandId === listing.brandId);
    if (matchingProduct) {
      await db.listing.update({
        where: { id: listing.id },
        data: { productId: matchingProduct.id },
      });
      linkedCount++;
    }
  }
  console.log(`  ✓ ${linkedCount} listings linked to products`);

  // ── 4. Verify chain ──
  console.log("\n4. Verification:");
  const finalModels = await db.productModel.count();
  const finalProducts = await db.product.count();
  const finalLinked = await db.listing.count({ where: { productId: { not: null } } });
  console.log(`  ProductModels: ${finalModels}`);
  console.log(`  Products: ${finalProducts}`);
  console.log(`  Listings with productId: ${finalLinked}`);

  console.log("\n=== PHASE 2 SEED COMPLETE ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
}).finally(() => db.$disconnect());
