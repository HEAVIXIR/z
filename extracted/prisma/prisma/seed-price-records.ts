/* HEAVIX — Price Records Backfill (P2-22)
   =================================================================
   Reads all PUBLISHED listings with a non-null price and creates a
   PriceRecord for each (source = LISTING). Used to seed the price-
   intelligence layer with historical observations so stats / history
   / outlier detection have something to work with on first launch.

   Idempotent-ish: re-running creates a fresh wave of PriceRecord
   rows (one per listing) — this is intentional so the analytics
   layer can track price drift over time once recordPriceFromListing
   is wired into the publish flow.

   Run:
     bunx tsx prisma/seed-price-records.ts
   or:
     bun run db:seed-prices
*/
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const listings = await db.listing.findMany({
    where: {
      status: "PUBLISHED",
      price: { not: null },
      NOT: { priceType: "CALL_FOR_PRICE" },
    },
    select: {
      id: true,
      price: true,
      year: true,
      condition: true,
      brandId: true,
      categoryId: true,
      productId: true,
      createdAt: true,
    },
  });

  console.log(`[price-records] backfilling ${listings.length} PUBLISHED listings…`);

  let created = 0;
  for (const l of listings) {
    if (!l.price) continue;
    try {
      await db.priceRecord.create({
        data: {
          listingId: l.id,
          productId: l.productId ?? null,
          categoryId: l.categoryId ?? null,
          brandId: l.brandId ?? null,
          price: Number(l.price),
          currency: "IRR",
          year: l.year ?? null,
          condition: l.condition ?? null,
          source: "LISTING",
          // Use the listing's createdAt as recordedAt so history
          // charts have a real timeline from day one.
          recordedAt: l.createdAt,
        },
      });
      created++;
    } catch (err: any) {
      console.error(
        `[price-records] failed for listing ${l.id}:`,
        err?.message ?? err,
      );
    }
  }

  console.log(`[price-records] created ${created} PriceRecord rows.`);

  // Summary stats
  const total = await db.priceRecord.count();
  const bySource = await db.priceRecord.groupBy({
    by: ["source"],
    _count: true,
  });
  console.log(`[price-records] total rows now: ${total}`);
  console.log(`[price-records] by source:`, bySource);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
