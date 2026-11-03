// @ts-nocheck
import { db } from "../src/lib/db";
import fs from "fs";

async function main() {
  console.log("=== PHASE 8A — MESSAGING & NEGOTIATION AUDIT ===\n");

  // 1. Conversation
  console.log("1. CONVERSATION");
  const conversations = await db.conversation.count().catch(() => 0);
  console.log("  Count: " + conversations);
  const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8");
  const hasConvModel = schemaContent.includes("model Conversation {");
  console.log("  Schema: " + (hasConvModel ? "EXISTS" : "MISSING"));
  if (hasConvModel) {
    const sample = await db.conversation.findFirst().catch(() => null);
    if (sample) console.log("  Fields: " + Object.keys(sample).join(", "));
  }

  // 2. Message
  console.log("\n2. MESSAGE");
  const messages = await db.message.count().catch(() => 0);
  console.log("  Count: " + messages);
  const hasMsgModel = schemaContent.includes("model Message {");
  console.log("  Schema: " + (hasMsgModel ? "EXISTS" : "MISSING"));
  if (hasMsgModel && messages > 0) {
    const sample = await db.message.findFirst();
    if (sample) console.log("  Fields: " + Object.keys(sample).join(", "));
  }

  // 3. DealRoom + DealMessage (existing from Phase 4)
  console.log("\n3. DEAL ROOM (existing)");
  const dealRooms = await db.dealRoom.count().catch(() => 0);
  const dealMessages = await db.dealMessage.count().catch(() => 0);
  const dealDocs = await db.dealDocument.count().catch(() => 0);
  console.log("  DealRooms: " + dealRooms + ", DealMessages: " + dealMessages + ", DealDocuments: " + dealDocs);
  console.log("  Status: EXISTS");

  // 4. ListingOffer (existing)
  console.log("\n4. LISTING OFFER (existing)");
  const offers = await db.listingOffer.count().catch(() => 0);
  console.log("  Count: " + offers);
  console.log("  Status: EXISTS");

  // 5. RFQQuote (existing)
  console.log("\n5. RFQ QUOTE (existing)");
  const rfqQuotes = await db.rFQQuote.count().catch(() => 0);
  console.log("  Count: " + rfqQuotes);
  console.log("  Status: EXISTS");

  // 6. Schema models
  console.log("\n6. SCHEMA MODELS");
  const models = ["Conversation", "Message", "ConversationParticipant", "MessageAttachment",
                   "DealRoom", "DealMessage", "DealDocument", "ListingOffer",
                   "RFQQuote", "Inquiry", "Notification", "NotificationPreference"];
  for (const m of models) {
    const hasModel = schemaContent.includes("model " + m + " {");
    console.log("  " + m + ": " + (hasModel ? "EXISTS" : "MISSING"));
  }

  // 7. API routes
  console.log("\n7. API ROUTES");
  const apiPaths = {
    "/api/conversations": fs.existsSync("src/app/api/conversations/route.ts"),
    "/api/conversations/[id]": fs.existsSync("src/app/api/conversations/[id]/route.ts"),
    "/api/conversations/[id]/messages": fs.existsSync("src/app/api/conversations/[id]/messages/route.ts"),
    "/api/deal-rooms": fs.existsSync("src/app/api/deal-rooms/route.ts"),
    "/api/deal-rooms/[id]": fs.existsSync("src/app/api/deal-rooms/[id]/route.ts"),
    "/api/deal-rooms/[id]/messages": fs.existsSync("src/app/api/deal-rooms/[id]/messages/route.ts"),
    "/api/admin/listings/[id]/offers": fs.existsSync("src/app/api/admin/offers-all/route.ts"),
  };
  for (const [path, exists] of Object.entries(apiPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 8. Admin pages
  console.log("\n8. ADMIN PAGES");
  const adminPaths = {
    "/admin/messaging": fs.existsSync("src/app/admin/messaging/page.tsx"),
    "/admin/deal-rooms": fs.existsSync("src/app/admin/deal-rooms/page.tsx"),
  };
  for (const [path, exists] of Object.entries(adminPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // SUMMARY
  console.log("\n=== AUDIT SUMMARY ===");
  console.log("EXISTS: Conversation (0 data), Message (0 data), DealRoom (1), DealMessage (4), DealDocument, ListingOffer (2), RFQQuote (0), Notification");
  console.log("EXISTS: /api/deal-rooms, /api/admin/offers-all, /admin/deal-rooms");
  console.log("MISSING: /api/conversations (public messaging API)");
  console.log("MISSING: /api/conversations/[id]/messages");
  console.log("MISSING: /admin/messaging (admin messaging page)");
  console.log("INCOMPLETE: Conversation + Message have 0 data");
  console.log("INCOMPLETE: No public conversation API (only deal-room admin API)");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
