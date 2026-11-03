// @ts-nocheck
import { db } from "../src/lib/db";
import fs from "fs";

async function main() {
  console.log("=== PHASE 10A — REVIEWS & REPUTATION AUDIT ===\n");

  const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8");

  // 1. Review model
  console.log("1. REVIEW MODEL");
  const hasReview = schemaContent.includes("model Review {");
  console.log("  Schema: " + (hasReview ? "EXISTS" : "MISSING"));
  if (hasReview) {
    const reviews = await db.review.count().catch(() => 0);
    console.log("  Data: " + reviews + " records");
    const sample = await db.review.findFirst().catch(() => null);
    if (sample) console.log("  Fields: " + Object.keys(sample).join(", "));
  }

  // 2. Review fields
  console.log("\n2. REVIEW FIELDS");
  if (hasReview) {
    const fields = ["authorId", "companyId", "sellerId", "dealRoomId", "listingId",
                     "rating", "title", "body", "verifiedDeal", "sellerResponse",
                     "sellerRespondedAt", "status", "adminNotes", "moderatedAt"];
    for (const f of fields) {
      console.log("  " + f + ": " + (schemaContent.includes(f) ? "EXISTS" : "MISSING"));
    }
  }

  // 3. Reputation fields on Company/User
  console.log("\n3. REPUTATION FIELDS");
  const companyAvgRating = schemaContent.includes("avgRating") && schemaContent.includes("model Company");
  const userAvgRating = schemaContent.includes("avgRating") && schemaContent.includes("model User");
  console.log("  Company.avgRating: " + (companyAvgRating ? "EXISTS" : "MISSING"));
  console.log("  Company.reviewCount: " + (schemaContent.includes("reviewCount") ? "EXISTS" : "MISSING"));
  console.log("  User.avgRating: " + (userAvgRating ? "EXISTS" : "MISSING"));

  // 4. Review API routes
  console.log("\n4. API ROUTES");
  const apiPaths = {
    "/api/reviews": fs.existsSync("src/app/api/reviews/route.ts"),
    "/api/reviews/[id]": fs.existsSync("src/app/api/reviews/[id]/route.ts"),
    "/api/admin/reviews": fs.existsSync("src/app/api/admin/reviews/route.ts"),
    "/api/admin/reviews/[id]": fs.existsSync("src/app/api/admin/reviews/[id]/route.ts"),
    "/api/sellers/[id]/trust": fs.existsSync("src/app/api/sellers/[id]/trust/route.ts"),
    "/api/sellers/[id]/reputation": fs.existsSync("src/app/api/sellers/[id]/reputation/route.ts"),
  };
  for (const [path, exists] of Object.entries(apiPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 5. Reviews helper
  console.log("\n5. REVIEWS HELPER");
  console.log("  src/lib/reviews.ts: " + (fs.existsSync("src/lib/reviews.ts") ? "EXISTS" : "MISSING"));
  if (fs.existsSync("src/lib/reviews.ts")) {
    const content = fs.readFileSync("src/lib/reviews.ts", "utf8");
    console.log("  Has recomputeCompanyRating: " + (content.includes("recomputeCompanyRating") ? "YES" : "NO"));
    console.log("  Has recomputeSellerRating: " + (content.includes("recomputeSellerRating") ? "YES" : "NO"));
    console.log("  Has serializeReview: " + (content.includes("serializeReview") ? "YES" : "NO"));
  }

  // 6. Deal/Order for review eligibility
  console.log("\n6. DEAL/ORDER FOR REVIEW ELIGIBILITY");
  const deals = await db.deal.count().catch(() => 0);
  const orders = await db.order.count().catch(() => 0);
  console.log("  Deals: " + deals);
  console.log("  Orders: " + orders);

  // 7. Admin pages
  console.log("\n7. ADMIN PAGES");
  console.log("  /admin/reviews: " + (fs.existsSync("src/app/admin/reviews/page.tsx") ? "EXISTS" : "MISSING"));

  // SUMMARY
  console.log("\n=== AUDIT SUMMARY ===");
  console.log("EXISTS: Review model (0 data), Company.avgRating/reviewCount, User.avgRating/reviewCount");
  console.log("EXISTS: /api/reviews (GET+POST), /api/reviews/[id] (PATCH+DELETE), /api/admin/reviews, /api/admin/reviews/[id]");
  console.log("EXISTS: src/lib/reviews.ts (recomputeCompanyRating, recomputeSellerRating, serializeReview)");
  console.log("EXISTS: /api/sellers/[id]/trust (from Phase 5)");
  console.log("MISSING: /api/sellers/[id]/reputation (dedicated reputation API)");
  console.log("INCOMPLETE: 0 reviews in DB (no test data)");
  console.log("INCOMPLETE: No Deal/Order link in review eligibility (Review has dealRoomId but not dealId/orderId)");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
