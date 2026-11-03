/**
 * Phase 3A: Listing Domain — fill gaps
 * Per HEAVIX Master Execution Plan V2.0 §3.1.
 *
 * Gaps identified:
 * 1. sellerId: 0/30 — assign sellers
 * 2. companyId: 0/30 — link companies
 * 3. modelId: 0/30 — link to ProductModel
 * 4. Images: only 2/30 — add placeholder images
 * 5. All listings are PUBLISHED — add some DRAFT/PENDING_REVIEW for lifecycle testing
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("=== PHASE 3A: LISTING DOMAIN FILL GAPS ===\n");

  // 1. Assign sellerId to all listings
  console.log("1. Assigning sellers...");
  const users = await db.user.findMany();
  const adminUser = users[0];
  const regularUser = users[1] || users[0];
  
  const listings = await db.listing.findMany({ select: { id: true, brandId: true, title: true } });
  let sellerCount = 0;
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const sellerId = i % 3 === 0 ? adminUser.id : regularUser.id;
    await db.listing.update({
      where: { id: listing.id },
      data: {
        sellerId,
        sellerName: sellerId === adminUser.id ? "ادمین هویکس" : "فروشنده تست",
        sellerPhone: "09121404927",
      },
    });
    sellerCount++;
  }
  console.log(`  ✓ ${sellerCount} listings assigned sellers`);

  // 2. Link company to some listings
  console.log("\n2. Linking companies...");
  const company = await db.company.findFirst();
  if (company) {
    let companyCount = 0;
    for (let i = 0; i < listings.length; i++) {
      if (i % 2 === 0) {
        await db.listing.update({
          where: { id: listings[i].id },
          data: { companyId: company.id },
        });
        companyCount++;
      }
    }
    console.log(`  ✓ ${companyCount} listings linked to company`);
  }

  // 3. Link modelId where possible (match by brand)
  console.log("\n3. Linking ProductModels...");
  const models = await db.productModel.findMany();
  let modelCount = 0;
  for (const listing of listings) {
    if (!listing.brandId) continue;
    const matchingModel = models.find(m => m.brandId === listing.brandId);
    if (matchingModel) {
      await db.listing.update({
        where: { id: listing.id },
        data: { modelId: matchingModel.id },
      });
      modelCount++;
    }
  }
  console.log(`  ✓ ${modelCount} listings linked to ProductModel`);

  // 4. Add lifecycle variety — set some to DRAFT, some to PENDING_REVIEW
  console.log("\n4. Adding lifecycle variety...");
  if (listings.length >= 5) {
    await db.listing.update({ where: { id: listings[0].id }, data: { status: "DRAFT" } });
    await db.listing.update({ where: { id: listings[1].id }, data: { status: "DRAFT" } });
    await db.listing.update({ where: { id: listings[2].id }, data: { status: "PENDING_REVIEW" } });
    await db.listing.update({ where: { id: listings[3].id }, data: { status: "PENDING_REVIEW" } });
    await db.listing.update({ where: { id: listings[4].id }, data: { status: "EXPIRED", expiresAt: new Date(Date.now() - 86400000) } });
    console.log("  ✓ 2 DRAFT, 2 PENDING_REVIEW, 1 EXPIRED added (rest stay PUBLISHED)");
  }

  // 5. Add images to more listings (using existing /images/ paths)
  console.log("\n5. Adding listing images...");
  const imagePaths = [
    "/images/machinery/excavator.png",
    "/images/machinery/loader.png",
    "/images/machinery/bulldozer.png",
    "/images/machinery/grader.png",
    "/images/machinery/dump-truck.png",
    "/images/machinery/crane.png",
  ];
  let imgCount = 0;
  for (let i = 0; i < listings.length; i++) {
    const existing = await db.listingImage.findFirst({ where: { listingId: listings[i].id } });
    if (!existing) {
      await db.listingImage.create({
        data: {
          listingId: listings[i].id,
          url: imagePaths[i % imagePaths.length],
          alt: listings[i].title,
          isPrimary: true,
          sortOrder: 0,
        },
      });
      imgCount++;
    }
  }
  console.log(`  ✓ ${imgCount} listing images added`);

  // 6. Verify
  console.log("\n6. VERIFICATION:");
  const withSeller = await db.listing.count({ where: { sellerId: { not: null } } });
  const withCompany = await db.listing.count({ where: { companyId: { not: null } } });
  const withModel = await db.listing.count({ where: { modelId: { not: null } } });
  const withImages = await db.listing.count({ where: { images: { some: {} } } });
  const statusDist = await db.listing.groupBy({ by: ["status"], _count: true });
  console.log(`  sellerId: ${withSeller}/30`);
  console.log(`  companyId: ${withCompany}/30`);
  console.log(`  modelId: ${withModel}/30`);
  console.log(`  images: ${withImages}/30`);
  console.log(`  Status distribution:`);
  for (const s of statusDist) console.log(`    ${s.status}: ${s._count}`);

  console.log("\n=== PHASE 3A COMPLETE ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
}).finally(() => db.$disconnect());
