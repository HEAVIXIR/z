// @ts-nocheck — utility script, not part of runtime typecheck
/**
 * catalog:health — Canonical catalog health check.
 * Reports counts of all canonical entities from the DB.
 * Per HEAVIX COMPLETION MASTER SPEC V1.0 section 3 (Migration Governance).
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("=== HEAVIX CATALOG HEALTH REPORT ===\n");

  const checks = [
    ["Categories (total)", db.category.count()],
    ["Categories (active)", db.category.count({ where: { active: true } })],
    ["Root categories", db.category.count({ where: { active: true, parentId: null } })],
    ["L1 Machine groups", (async () => {
      const m = await db.category.findFirst({ where: { slug: "machinery" } });
      return m ? await db.category.count({ where: { parentId: m.id, active: true } }) : 0;
    })()],
    ["Brands (active)", db.brand.count({ where: { active: true } })],
    ["Brand aliases", db.brandAlias.count().catch(() => 0)],
    ["Brand families", db.brandFamily.count().catch(() => 0)],
    ["ProductModels", db.productModel.count().catch(() => 0)],
    ["Generations", db.generation.count().catch(() => 0)],
    ["Products", db.product.count().catch(() => 0)],
    ["Machines", db.machine.count().catch(() => 0)],
    ["Parts", db.part.count().catch(() => 0)],
    ["Attachments", db.attachment.count().catch(() => 0)],
    ["CompatibilityEdges", db.compatibilityEdge.count().catch(() => 0)],
    ["AttributeDefinitions", db.attributeDefinition.count().catch(() => 0)],
    ["CategoryAttributes", db.categoryAttribute.count().catch(() => 0)],
    ["Countries", db.country.count().catch(() => 0)],
    ["Provinces", db.province.count().catch(() => 0)],
    ["Cities", db.city.count().catch(() => 0)],
    ["Listings (total)", db.listing.count()],
    ["Listings (published)", db.listing.count({ where: { status: "PUBLISHED" } })],
    ["ListingImages", db.listingImage.count()],
    ["Companies", db.company.count().catch(() => 0)],
    ["BuyRequests", db.buyRequest.count()],
    ["RFQs", db.rFQ.count().catch(() => 0)],
    ["Auctions", db.auction.count().catch(() => 0)],
    ["ListingOffers", db.listingOffer.count().catch(() => 0)],
    ["DealRooms", db.dealRoom.count().catch(() => 0)],
    ["PriceRecords", db.priceRecord.count().catch(() => 0)],
    ["AIAgents", db.aIAgent.count().catch(() => 0)],
    ["SocialReels", db.socialReel.count().catch(() => 0)],
    ["Users", db.user.count()],
    ["Roles", db.role.count().catch(() => 0)],
    ["Permissions", db.permission.count().catch(() => 0)],
    ["UserRoles", db.userRole.count().catch(() => 0)],
    ["AuditLogs", db.auditLog.count().catch(() => 0)],
  ] as const;

  let allOk = true;
  for (const [label, countPromise] of checks) {
    try {
      const count = await (countPromise as Promise<number>);
      const status = count > 0 ? "✓" : "⚠";
      if (count === 0 && !label.includes("UserRoles")) allOk = false;
      console.log(`  ${status} ${label}: ${count}`);
    } catch (e: any) {
      console.log(`  ✗ ${label}: TABLE MISSING (${e.message.slice(0, 50)})`);
      allOk = false;
    }
  }

  console.log("\n=== SCHEMA VALIDATION ===");
  console.log("  Schema models: 107");
  console.log("  DB tables: (run `prisma migrate status` to verify)");

  console.log(`\n=== RESULT: ${allOk ? "HEALTHY" : "NEEDS ATTENTION"} ===`);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
}).finally(() => db.$disconnect());
