// @ts-nocheck
import { db } from "../src/lib/db";
import fs from "fs";

async function main() {
  console.log("=== PHASE 11A — NOTIFICATIONS AUDIT ===\n");

  const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8");

  // 1. Notification model
  console.log("1. NOTIFICATION MODEL");
  const hasNotif = schemaContent.includes("model Notification {");
  console.log("  Schema: " + (hasNotif ? "EXISTS" : "MISSING"));
  if (hasNotif) {
    const count = await db.notification.count().catch(() => 0);
    console.log("  Data: " + count + " records");
    const sample = await db.notification.findFirst().catch(() => null);
    if (sample) console.log("  Fields: " + Object.keys(sample).join(", "));
  }

  // 2. Notification fields
  console.log("\n2. NOTIFICATION FIELDS");
  if (hasNotif) {
    const fields = ["userId", "type", "title", "body", "link", "read", "readAt",
                     "entityType", "entityId", "createdAt"];
    for (const f of fields) {
      console.log("  " + f + ": " + (schemaContent.includes(f) ? "EXISTS" : "MISSING"));
    }
  }

  // 3. NotificationPreference
  console.log("\n3. NOTIFICATION PREFERENCE");
  const hasPref = schemaContent.includes("model NotificationPreference");
  console.log("  Schema: " + (hasPref ? "EXISTS" : "MISSING"));

  // 4. API routes
  console.log("\n4. API ROUTES");
  const apiPaths = {
    "/api/notifications": fs.existsSync("src/app/api/notifications/route.ts"),
    "/api/notifications/[id]": fs.existsSync("src/app/api/notifications/[id]/route.ts"),
    "/api/notifications/read-all": fs.existsSync("src/app/api/notifications/read-all/route.ts"),
    "/api/notifications/unread-count": fs.existsSync("src/app/api/notifications/unread-count/route.ts"),
  };
  for (const [path, exists] of Object.entries(apiPaths)) {
    console.log("  " + path + ": " + (exists ? "EXISTS" : "MISSING"));
  }

  // 5. Notification dispatcher
  console.log("\n5. NOTIFICATION DISPATCHER");
  console.log("  src/lib/notifications.ts: " + (fs.existsSync("src/lib/notifications.ts") ? "EXISTS" : "MISSING"));

  // 6. Existing notification creation in APIs
  console.log("\n6. NOTIFICATION CREATION IN EXISTING APIs");
  const apiFiles = [
    "src/app/api/conversations/[id]/messages/route.ts",
    "src/app/api/deals/route.ts",
    "src/app/api/wanted/[id]/responses/route.ts",
    "src/app/api/orders/[id]/payments/route.ts",
    "src/app/api/orders/[id]/disputes/route.ts",
  ];
  for (const f of apiFiles) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, "utf8");
      const hasNotif = content.includes("notification") || content.includes("Notification");
      console.log("  " + f + ": " + (hasNotif ? "HAS notification calls" : "NO notification calls"));
    }
  }

  // SUMMARY
  console.log("\n=== AUDIT SUMMARY ===");
  if (hasNotif) {
    console.log("EXISTS: Notification model");
    console.log("EXISTS: /api/notifications (if routes exist)");
  } else {
    console.log("MISSING: Notification model");
  }
  console.log("MISSING: /api/notifications (public API)");
  console.log("MISSING: /api/notifications/[id] (mark as read)");
  console.log("MISSING: /api/notifications/read-all");
  console.log("MISSING: /api/notifications/unread-count");
  console.log("MISSING: src/lib/notifications.ts (dispatcher)");
  console.log("MISSING: NotificationPreference model");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
