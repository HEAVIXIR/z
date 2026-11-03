// @ts-nocheck — utility script, not part of runtime typecheck
/**
 * ONE-TIME DATA MIGRATION: SQLite (db/custom.db, db/store.db) -> PostgreSQL
 *
 * Implements the plan from docs/ADR-001-database-strategy.md §3 "Required
 * follow-up actions (P1)" step 1: export SQLite data in FK-safe order,
 * import into PostgreSQL, validate row counts.
 *
 * HOW TO RUN
 * ----------
 * 1. Make sure db/custom.db and db/store.db still exist (they do, from the
 *    original project) and have NOT been deleted.
 * 2. Set DATABASE_URL and STORE_DATABASE_URL in .env to your real Postgres
 *    connection strings (see docker-compose.yml for a local option) and
 *    make sure both databases exist and are empty.
 * 3. Generate all four Prisma clients (main + store, legacy + new):
 *      npx prisma generate --schema=prisma/schema.prisma
 *      npx prisma generate --schema=prisma/store-schema.prisma
 *      npx prisma generate --schema=prisma/legacy-sqlite/schema.prisma
 *      npx prisma generate --schema=prisma/legacy-sqlite/store-schema.prisma
 * 4. Create the Postgres schema (empty database -> current schema):
 *      npx prisma migrate dev --schema=prisma/schema.prisma --name init_postgres
 *      npx prisma migrate dev --schema=prisma/store-schema.prisma --name init_postgres
 * 5. Run this script:
 *      npx tsx scripts/migrate-sqlite-to-postgres.ts
 * 6. Verify the printed row-count report has zero mismatches, spot-check
 *    the app against Postgres, THEN delete prisma/legacy-sqlite/ and the
 *    two src/lib/generated/legacy-sqlite-*-client folders.
 *
 * This script only INSERTS into the destination. It never touches the
 * SQLite files, so it's safe to re-run against a wiped Postgres DB.
 */

import { PrismaClient as LegacyMainClient } from "../src/lib/generated/legacy-sqlite-client";
import { PrismaClient as LegacyStoreClient } from "../src/lib/generated/legacy-sqlite-store-client";
import { PrismaClient as MainClient } from "@prisma/client";
import { PrismaClient as StoreClient } from "../src/lib/generated/store-client";

// FK-safe insertion order, computed from the actual @relation(fields:[...])
// graph in each schema (topological sort — see the parser this was
// generated with; verified to have NO cross-model cycles in either schema).
const MAIN_MODEL_ORDER = [
  "BrandFamily", "Brand", "BrandAlias", "BrandIndustry", "Industry", "Category",
  "BrandCategory", "BrandDomain", "BrandMedia", "BrandSEO", "BrandDisplay",
  "TransactionType", "ServiceType", "ApplicationIndustry", "CategoryApplicationIndustry",
  "Country", "Province", "City", "AttributeDefinition", "AttributeOption",
  "CategoryAttribute", "ProductModel", "Company", "User", "Product", "Listing",
  "ListingAttributeValue", "ModelCategory", "Generation", "ListingImage", "SocialReel",
  "BuyRequest", "SavedSearch", "Favorite", "Lead", "Article", "Follow", "HotSearch",
  "SiteWidget", "KnowledgeEntry", "AIGatewayLog", "AIBudget", "AITaskPolicy",
  "LaunchPhase", "DemandSignal", "RFQ", "RFQQuote", "Auction", "AuctionBid",
  "IndustrialTerm", "TermAlias", "FeatureFlag", "CompanyClaim", "ListingOffer",
  "ListingRejection", "RejectionMessage", "Notification", "Referral", "FoundingSeller",
  "PremiumSubscription", "MachinePassport", "PassportEvent", "CompanyDocument",
  "CompanyBranch", "CompanyVerification", "DealRoom", "DealMessage", "HomePageSection",
  "HeroConfig", "SiteSettings", "SubscriptionPlan", "MenuItem", "Session", "AdminSession",
  "VerificationCode", "Setting", "AuditLog", "Role", "Permission", "RolePermission",
  "UserRole", "Machine", "Part", "Attachment", "CompatibilityEdge", "PriceRecord",
  "SearchQuery", "AIAgent", "Opportunity", "SEOMetadata", "UserRecommendation",
  "SearchIndex", "Payment", "Procurement", "ProcurementQuote",
] as const;

const STORE_MODEL_ORDER = [
  "AdminUser", "Customer", "Mechanic", "CarModel", "Category", "Brand", "Part",
  "Order", "OrderItem", "Payment", "Shipment", "CurrencyRate", "CurrencySetting",
  "Setting", "Review", "Wishlist", "Coupon", "WalletTransaction", "Notification",
  "AuditLog",
] as const;

// Models with a self-referencing FK: inserted with that field nulled out
// first, then patched in a second pass so parent rows always exist before
// children reference them, regardless of row order in the source table.
const SELF_REF_FIELDS: Record<string, string> = {
  Brand: "parentBrandId",
  Category: "parentId",
};

// The one implicit many-to-many relation in the schema (Part <-> CarModel
// in the store DB) has no scalar FK column, so it can't be copied via
// createMany like everything else — handled explicitly at the end.

function lowerFirst(s: string) {
  return s[0].toLowerCase() + s.slice(1);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function migrateModel(
  modelName: string,
  legacy: any,
  dest: any,
  report: { model: string; source: number; migrated: number }[],
) {
  const key = lowerFirst(modelName);
  const legacyDelegate = legacy[key];
  const destDelegate = dest[key];
  if (!legacyDelegate || !destDelegate) {
    console.warn(`  ! skipping ${modelName} — delegate not found on client`);
    return;
  }

  const rows: any[] = await legacyDelegate.findMany();
  const selfField = SELF_REF_FIELDS[modelName];

  if (rows.length === 0) {
    report.push({ model: modelName, source: 0, migrated: 0 });
    console.log(`  - ${modelName}: 0 rows`);
    return;
  }

  let migrated = 0;

  if (selfField) {
    // Pass 1: insert with the self-referencing FK nulled.
    const firstPass = rows.map((r) => ({ ...r, [selfField]: null }));
    for (const batch of chunk(firstPass, 500)) {
      const res = await destDelegate.createMany({ data: batch, skipDuplicates: true });
      migrated += res.count;
    }
    // Pass 2: patch the self-referencing FK back in for rows that had one.
    const withParent = rows.filter((r) => r[selfField] != null);
    for (const r of withParent) {
      await destDelegate.update({ where: { id: r.id }, data: { [selfField]: r[selfField] } });
    }
  } else {
    for (const batch of chunk(rows, 500)) {
      const res = await destDelegate.createMany({ data: batch, skipDuplicates: true });
      migrated += res.count;
    }
  }

  report.push({ model: modelName, source: rows.length, migrated });
  console.log(`  - ${modelName}: ${rows.length} rows -> ${migrated} migrated`);
}

async function migratePartCarModelJoin(legacy: LegacyStoreClient, dest: StoreClient) {
  console.log("  - Part <-> CarModel (implicit many-to-many) ...");
  const legacyParts = await legacy.part.findMany({
    select: { id: true, carModels: { select: { id: true } } },
  });
  let linked = 0;
  for (const p of legacyParts) {
    if (p.carModels.length === 0) continue;
    await dest.part.update({
      where: { id: p.id },
      data: { carModels: { connect: p.carModels.map((c) => ({ id: c.id })) } },
    });
    linked += p.carModels.length;
  }
  console.log(`    linked ${linked} part<->carModel pairs`);
}

async function main() {
  const legacyMain = new LegacyMainClient();
  const legacyStore = new LegacyStoreClient();
  const mainDb = new MainClient();
  const storeDb = new StoreClient();

  const report: { model: string; source: number; migrated: number }[] = [];

  try {
    console.log("== Migrating main HEAVIX database ==");
    for (const model of MAIN_MODEL_ORDER) {
      await migrateModel(model, legacyMain, mainDb, report);
    }

    console.log("\n== Migrating MEKANIX store database ==");
    for (const model of STORE_MODEL_ORDER) {
      await migrateModel(model, legacyStore, storeDb, report);
    }
    await migratePartCarModelJoin(legacyStore, storeDb);

    console.log("\n== Row-count report ==");
    let mismatches = 0;
    for (const r of report) {
      const ok = r.source === r.migrated;
      if (!ok) mismatches++;
      console.log(`${ok ? "OK  " : "MISS"} ${r.model.padEnd(28)} source=${r.source} migrated=${r.migrated}`);
    }
    console.log(
      mismatches === 0
        ? "\nAll models migrated with matching row counts."
        : `\n${mismatches} model(s) had a row-count mismatch — check for pre-existing rows in the destination or unique-constraint conflicts above.`,
    );
  } finally {
    await Promise.all([legacyMain.$disconnect(), legacyStore.$disconnect(), mainDb.$disconnect(), storeDb.$disconnect()]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
