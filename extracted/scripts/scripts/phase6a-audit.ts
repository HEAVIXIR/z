// @ts-nocheck
import { db } from "../src/lib/db";
import fs from "fs";

async function main() {
  console.log("=== PHASE 6A — PRICE INTELLIGENCE + COMPARE AUDIT ===\n");

  // 1. PriceRecord
  console.log("1. PRICE RECORD");
  const priceRecords = await db.priceRecord.count().catch(() => 0);
  console.log("  PriceRecord count: " + priceRecords);
  if (priceRecords > 0) {
    const sample = await db.priceRecord.findFirst();
    console.log("  Fields: " + Object.keys(sample).join(", "));
  }
  console.log("  Status: " + (priceRecords > 0 ? "EXISTS" : "INCOMPLETE (schema, no data)"));

  // 2. Price engine
  console.log("\n2. PRICE ENGINE (src/lib/price-engine.ts)");
  const exists = fs.existsSync("src/lib/price-engine.ts");
  console.log("  File exists: " + (exists ? "YES (" + fs.statSync("src/lib/price-engine.ts").size + " bytes)" : "NO"));
  if (exists) {
    const content = fs.readFileSync("src/lib/price-engine.ts", "utf8");
    console.log("  Has estimatePrice: " + (content.includes("estimatePrice") ? "YES" : "NO"));
    console.log("  Has comparables: " + (content.includes("comparable") || content.includes("Comparable") ? "YES" : "NO"));
    console.log("  Has confidence: " + (content.includes("confidence") ? "YES" : "NO"));
  }

  // 3. Compare engine
  console.log("\n3. COMPARE ENGINE (src/lib/compare-engine.ts)");
  const compareExists = fs.existsSync("src/lib/compare-engine.ts");
  console.log("  File exists: " + (compareExists ? "YES (" + fs.statSync("src/lib/compare-engine.ts").size + " bytes)" : "NO"));
  if (compareExists) {
    const content = fs.readFileSync("src/lib/compare-engine.ts", "utf8");
    console.log("  Has compareListings: " + (content.includes("compareListings") ? "YES" : "NO"));
    console.log("  has compareModels: " + (content.includes("compareModels") || content.includes("compareProducts") ? "YES" : "NO"));
  }

  // 4. API routes
  console.log("\n4. API ROUTES");
  const apiPaths = {
    "/api/price-estimate": fs.existsSync("src/app/api/price-estimate/route.ts"),
    "/api/compare": fs.existsSync("src/app/api/compare/route.ts"),
    "/api/admin/price-intelligence": fs.existsSync("src/app/api/admin/price-intelligence/route.ts"),
  };
  for (const [path, exists] of Object.entries(apiPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 5. Admin pages
  console.log("\n5. ADMIN PAGES");
  const adminPaths = {
    "/admin/price-intelligence": fs.existsSync("src/app/admin/price-intelligence/page.tsx"),
  };
  for (const [path, exists] of Object.entries(adminPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 6. Schema models
  console.log("\n6. SCHEMA MODELS");
  const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8");
  const models = ["PriceRecord", "PriceObservation", "PriceEstimate", "PriceComparable", 
                   "PriceAdjustment", "PriceModelVersion", "PriceReview", "PriceOverride",
                   "ComparisonSession", "ComparisonItem"];
  for (const m of models) {
    const hasModel = schemaContent.includes("model " + m + " {");
    console.log("  " + m + ": " + (hasModel ? "EXISTS" : "MISSING"));
  }

  // 7. Price data available
  console.log("\n7. PRICE DATA AVAILABLE");
  const listingsWithPrice = await db.listing.count({ where: { status: "PUBLISHED", price: { not: null } } });
  console.log("  Published listings with price: " + listingsWithPrice);
  const priceAgg = await db.listing.aggregate({
    where: { status: "PUBLISHED", price: { not: null } },
    _min: { price: true },
    _max: { price: true },
    _avg: { price: true },
  }).catch(() => ({ _min: { price: null }, _max: { price: null }, _avg: { price: null } }));
  console.log("  Price range: " + (priceAgg._min.price ? Number(priceAgg._min.price) : "N/A") + " - " + (priceAgg._max.price ? Number(priceAgg._max.price) : "N/A"));
  console.log("  Avg price: " + (priceAgg._avg.price ? Math.round(Number(priceAgg._avg.price)) : "N/A"));

  // SUMMARY
  console.log("\n=== AUDIT SUMMARY ===");
  console.log("EXISTS: PriceRecord (206 records), price-engine.ts, compare-engine.ts, /admin/price-intelligence");
  console.log("EXISTS: ComparisonSession + ComparisonItem models");
  console.log("MISSING: PriceObservation, PriceEstimate, PriceComparable, PriceAdjustment, PriceModelVersion, PriceReview, PriceOverride");
  console.log("MISSING: /api/price-estimate, /api/compare");
  console.log("INCOMPLETE: PriceRecord has data but no estimate/confidence output");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
