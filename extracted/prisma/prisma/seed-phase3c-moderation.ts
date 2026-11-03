/**
 * Phase 3C: Listing Workflow + Moderation — fill gaps
 * Per HEAVIX Master Execution Plan V2.0 §3.2.
 *
 * Gaps:
 * 1. No moderation logs — create test data
 * 2. No rejections — create test data for one PENDING_REVIEW listing
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("=== PHASE 3C: LISTING WORKFLOW + MODERATION ===\n");

  // 1. Create moderation logs for PENDING_REVIEW listings
  console.log("1. Creating moderation logs...");
  const pendingListings = await db.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    take: 2,
  });

  let modCount = 0;
  for (const listing of pendingListings) {
    const existing = await db.moderationLog.findFirst({ where: { listingId: listing.id } });
    if (!existing) {
      await db.moderationLog.create({
        data: {
          listingId: listing.id,
          action: "FLAG",
          reason: "بررسی خودکار — در انتظار تأیید ادمین",
          riskScore: 0.3,
        },
      });
      modCount++;
    }
  }
  console.log(`  ✓ ${modCount} moderation logs created`);

  // 2. Create a rejection for one listing
  console.log("\n2. Creating rejection test data...");
  const rejectListing = pendingListings[0];
  if (rejectListing) {
    const existingRej = await db.listingRejection.findFirst({ where: { listingId: rejectListing.id } });
    if (!existingRej) {
      await db.listingRejection.create({
        data: {
          listingId: rejectListing.id,
          reason: "تصاویر نامشخص — نیاز به تصاویر باکیفیت‌تر",
          reasonLabel: "کیفیت تصاویر",
          status: "PENDING",
          adminNote: "لطفاً تصاویر واضح‌تر آپلود کنید",
        },
      });
      console.log("  ✓ 1 rejection created");
    } else {
      console.log("  ✓ Rejection already exists");
    }
  }

  // 3. Verify
  console.log("\n3. VERIFICATION:");
  const modLogs = await db.moderationLog.count();
  const rejs = await db.listingRejection.count();
  console.log(`  ModerationLogs: ${modLogs}`);
  console.log(`  ListingRejections: ${rejs}`);

  console.log("\n=== PHASE 3C COMPLETE ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
}).finally(() => db.$disconnect());
