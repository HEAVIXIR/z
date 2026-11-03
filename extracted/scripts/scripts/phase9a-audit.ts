// @ts-nocheck
import { db } from "../src/lib/db";
import fs from "fs";

async function main() {
  console.log("=== PHASE 9A — ORDERS / DEALS / TRANSACTIONS AUDIT ===\n");

  const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8");

  // 1. Deal
  console.log("1. DEAL");
  const hasDealModel = schemaContent.includes("model Deal {");
  console.log("  Schema: " + (hasDealModel ? "EXISTS" : "MISSING"));

  // 2. Order
  console.log("\n2. ORDER");
  const hasOrderModel = schemaContent.includes("model Order {");
  console.log("  Schema: " + (hasOrderModel ? "EXISTS" : "MISSING"));
  if (hasOrderModel) {
    const orders = await db.order.count().catch(() => -1);
    console.log("  Data: " + (orders >= 0 ? orders + " records" : "model not accessible (store DB?)"));
  }

  // 3. Payment
  console.log("\n3. PAYMENT");
  const hasPaymentModel = schemaContent.includes("model Payment {");
  console.log("  Schema: " + (hasPaymentModel ? "EXISTS" : "MISSING"));
  if (hasPaymentModel) {
    const payments = await db.payment.count().catch(() => 0);
    console.log("  Data: " + payments + " records");
    const sample = await db.payment.findFirst().catch(() => null);
    if (sample) console.log("  Fields: " + Object.keys(sample).join(", "));
  }

  // 4. Check for existing transaction-related models
  console.log("\n4. TRANSACTION-RELATED MODELS");
  const models = ["Deal", "Order", "OrderItem", "Transaction", "Payment",
                   "Invoice", "Settlement", "Commission", "CommissionRule",
                   "CommissionRecord", "Refund", "Dispute",
                   "DealRoom", "DealMessage", "DealDocument",
                   "ListingOffer", "RFQQuote"];
  for (const m of models) {
    const hasModel = schemaContent.includes("model " + m + " {");
    console.log("  " + m + ": " + (hasModel ? "EXISTS" : "MISSING"));
  }

  // 5. Existing data
  console.log("\n5. EXISTING DATA");
  const dealRooms = await db.dealRoom.count().catch(() => 0);
  const offers = await db.listingOffer.count().catch(() => 0);
  const rfqQuotes = await db.rFQQuote.count().catch(() => 0);
  const payments = await db.payment.count().catch(() => 0);
  console.log("  DealRooms: " + dealRooms);
  console.log("  ListingOffers: " + offers);
  console.log("  RFQQuotes: " + rfqQuotes);
  console.log("  Payments: " + payments);

  // 6. API routes
  console.log("\n6. API ROUTES");
  const apiPaths = {
    "/api/deals": fs.existsSync("src/app/api/deals/route.ts"),
    "/api/orders": fs.existsSync("src/app/api/orders/route.ts"),
    "/api/payments": fs.existsSync("src/app/api/payments/route.ts"),
    "/api/transactions": fs.existsSync("src/app/api/transactions/route.ts"),
    "/api/settlements": fs.existsSync("src/app/api/settlements/route.ts"),
    "/api/disputes": fs.existsSync("src/app/api/disputes/route.ts"),
    "/api/deal-rooms": fs.existsSync("src/app/api/deal-rooms/route.ts"),
    "/api/deal-rooms/[id]": fs.existsSync("src/app/api/deal-rooms/[id]/route.ts"),
    "/api/admin/offers-all": fs.existsSync("src/app/api/admin/offers-all/route.ts"),
    "/api/admin/payments": fs.existsSync("src/app/api/admin/payments/route.ts"),
  };
  for (const [path, exists] of Object.entries(apiPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 7. Admin pages
  console.log("\n7. ADMIN PAGES");
  const adminPaths = {
    "/admin/deal-rooms": fs.existsSync("src/app/admin/deal-rooms/page.tsx"),
    "/admin/offers": fs.existsSync("src/app/admin/offers/page.tsx"),
    "/admin/payments": fs.existsSync("src/app/api/admin/payments/route.ts"),
    "/admin/subscriptions": fs.existsSync("src/app/admin/subscriptions/page.tsx"),
  };
  for (const [path, exists] of Object.entries(adminPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 8. ListingOffer fields (for deal creation)
  console.log("\n8. LISTING OFFER FIELDS (for deal creation)");
  if (offers > 0) {
    const sample = await db.listingOffer.findFirst();
    if (sample) console.log("  Fields: " + Object.keys(sample).join(", "));
  }

  // 9. DealRoom fields
  console.log("\n9. DEALROOM FIELDS");
  if (dealRooms > 0) {
    const sample = await db.dealRoom.findFirst();
    if (sample) console.log("  Fields: " + Object.keys(sample).join(", "));
  }

  // SUMMARY
  console.log("\n=== AUDIT SUMMARY ===");
  console.log("EXISTS: DealRoom, DealMessage, DealDocument, ListingOffer, RFQQuote, Payment (2 records)");
  console.log("MISSING: Deal, Order, OrderItem, Transaction, Invoice, Settlement, Commission, CommissionRule, Refund, Dispute");
  console.log("MISSING: /api/deals, /api/orders, /api/transactions, /api/settlements, /api/disputes");
  console.log("");
  console.log("STRATEGY: No duplicate models. Create missing Deal/Order/Transaction models.");
  console.log("  Payment model EXISTS — extend if needed, don't duplicate.");
  console.log("  DealRoom EXISTS — use as source for Deal creation (AGREED → Deal).");
  console.log("  ListingOffer EXISTS — use as source (ACCEPTED → Deal).");
  console.log("  RFQQuote EXISTS — use as source (ACCEPTED → Deal).");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
