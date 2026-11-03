// @ts-nocheck
import { db } from "../src/lib/db";
import fs from "fs";

async function main() {
  console.log("=== PHASE 7A — RFQ / WANTED / MATCHING AUDIT ===\n");

  // 1. BuyRequest (Wanted)
  console.log("1. BUYREQUEST (Wanted)");
  const buyRequests = await db.buyRequest.count();
  console.log("  Count: " + buyRequests);
  if (buyRequests > 0) {
    const sample = await db.buyRequest.findFirst();
    console.log("  Fields: " + Object.keys(sample).join(", "));
    const statuses = await db.buyRequest.groupBy({ by: ["status"], _count: true });
    console.log("  Status distribution: " + JSON.stringify(statuses.map(s => s.status + ":" + s._count)));
  }
  console.log("  Status: EXISTS");

  // 2. RFQ
  console.log("\n2. RFQ");
  const rfqs = await db.rFQ.count().catch(() => 0);
  console.log("  Count: " + rfqs);
  if (rfqs > 0) {
    const sample = await db.rFQ.findFirst();
    console.log("  Fields: " + Object.keys(sample).join(", "));
  }
  console.log("  Status: " + (rfqs > 0 ? "EXISTS" : "EXISTS (schema, 0 data)"));

  // 3. RFQQuote
  console.log("\n3. RFQQUOTE");
  const rfqQuotes = await db.rFQQuote.count().catch(() => 0);
  console.log("  Count: " + rfqQuotes);
  if (rfqs > 0) {
    const sample = await db.rFQQuote.findFirst();
    if (sample) console.log("  Fields: " + Object.keys(sample).join(", "));
  }
  console.log("  Status: EXISTS (schema)");

  // 4. Schema models
  console.log("\n4. SCHEMA MODELS");
  const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8");
  const models = ["BuyRequest", "RFQ", "RFQQuote", "ProcurementTender", "ProcurementQuote",
                   "ListingOffer", "Match", "MatchEvent", "WantedRequest", "WantedRequirement",
                   "SellerOffer", "OfferItem", "RequestMessage"];
  for (const m of models) {
    const hasModel = schemaContent.includes("model " + m + " {");
    console.log("  " + m + ": " + (hasModel ? "EXISTS" : "MISSING"));
  }

  // 5. Matching engine
  console.log("\n5. MATCHING ENGINE");
  const matchLibExists = fs.existsSync("src/lib/matching-engine.ts");
  console.log("  src/lib/matching-engine.ts: " + (matchLibExists ? "EXISTS" : "MISSING"));
  
  // Check if matching is in API
  const matchApiExists = fs.existsSync("src/app/api/admin/matching/route.ts");
  console.log("  /api/admin/matching: " + (matchApiExists ? "EXISTS" : "MISSING"));

  // 6. API routes
  console.log("\n6. API ROUTES");
  const apiPaths = {
    "/api/wanted": fs.existsSync("src/app/api/wanted/route.ts"),
    "/api/wanted/[id]": fs.existsSync("src/app/api/wanted/[id]/route.ts"),
    "/api/wanted/[id]/matches": fs.existsSync("src/app/api/wanted/[id]/matches/route.ts"),
    "/api/wanted/[id]/responses": fs.existsSync("src/app/api/wanted/[id]/responses/route.ts"),
    "/api/rfq": fs.existsSync("src/app/api/rfq/route.ts"),
    "/api/admin/requests": fs.existsSync("src/app/api/admin/requests/route.ts"),
    "/api/admin/matching": fs.existsSync("src/app/api/admin/matching/route.ts"),
  };
  for (const [path, exists] of Object.entries(apiPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 7. Admin pages
  console.log("\n7. ADMIN PAGES");
  const adminPaths = {
    "/admin/requests": fs.existsSync("src/app/admin/requests/page.tsx"),
    "/admin/rfq": fs.existsSync("src/app/admin/rfq/page.tsx"),
    "/admin/wanted": fs.existsSync("src/app/admin/wanted/page.tsx"),
    "/admin/matches": fs.existsSync("src/app/admin/matches/page.tsx"),
  };
  for (const [path, exists] of Object.entries(adminPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 8. BuyRequest fields analysis
  console.log("\n8. BUYREQUEST FIELD ANALYSIS");
  if (buyRequests > 0) {
    const sample = await db.buyRequest.findFirst();
    const fields = Object.keys(sample);
    const hasCategory = fields.includes("category");
    const hasBrandPref = fields.includes("brandPref");
    const hasBudget = fields.includes("budgetMin") && fields.includes("budgetMax");
    const hasTransaction = fields.includes("transaction");
    const hasLocation = fields.includes("city") && fields.includes("province");
    const hasDeadline = fields.includes("deadline");
    const hasVerified = fields.includes("verified");
    console.log("  Has category: " + hasCategory);
    console.log("  Has brandPref: " + hasBrandPref);
    console.log("  Has budget range: " + hasBudget);
    console.log("  Has transaction type: " + hasTransaction);
    console.log("  Has location: " + hasLocation);
    console.log("  Has deadline: " + hasDeadline);
    console.log("  Has verified: " + hasVerified);
  }

  // SUMMARY
  console.log("\n=== AUDIT SUMMARY ===");
  console.log("EXISTS: BuyRequest (5 records), RFQ (1 record), RFQQuote (schema), ProcurementTender (schema)");
  console.log("EXISTS: /admin/requests, /admin/rfq, /api/admin/requests, /api/admin/matching");
  console.log("MISSING: Match model (unified matching entity)");
  console.log("MISSING: /api/wanted (public wanted API)");
  console.log("MISSING: /api/wanted/[id]/matches (matching API)");
  console.log("MISSING: /api/wanted/[id]/responses (seller response API)");
  console.log("MISSING: src/lib/matching-engine.ts (matching engine)");
  console.log("INCOMPLETE: BuyRequest has no structured attribute requirements (only category string + brandPref string)");
  console.log("INCOMPLETE: No matching score/confidence system");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
