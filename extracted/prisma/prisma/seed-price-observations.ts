/* HEAVIX — Price Observation + Estimate Backfill (P0-PRICE-ATTR)
   =================================================================
   Problem this addresses:
     • PriceObservation = 0 rows.
     • PriceEstimate    = 0 rows.
   The price engine (`src/lib/price-engine.ts`) reads PriceObservation
   rows as comparables and emits EstimateResult objects, but neither
   table has ever been populated. This script bootstraps both.

   Pipeline (per PUBLISHED listing with a non-null price):
     Phase 1 — Observation backfill
       create PriceObservation({
         source:      "LISTING",
         sourceType:  "HEAVIX",
         askingPrice: listing.price,            // BigInt, native
         brandId, categoryId, modelId, productId,
         observedAt:  listing.publishedAt || listing.createdAt,
         market:      "IRAN",
         quality:     "MEDIUM",
         status:      "ACTIVE",
         currency:    "IRR",
       })

     Phase 2 — Estimate backfill (AFTER all observations exist so the
       engine has the widest comparable pool)
       call estimatePrice({ listingId }) from src/lib/price-engine.ts
       persist the result as PriceEstimate({
         estimatedPrice, priceLower, priceUpper,
         confidence, comparableCount, dataFreshness,
         mainDrivers (JSON), warnings (JSON),
         modelVersion,
       })

   Idempotency:
     Re-runs append a fresh wave of rows. Existing rows are NEVER
     deleted — preserves all historical data.

   Run:
     bunx tsx prisma/seed-price-observations.ts
     bun run db:seed-price-observations
*/
import { PrismaClient } from "@prisma/client";

// Import the live engine — `tsx` resolves the `@/` alias from tsconfig.json.
import { estimatePrice, PRICE_MODEL_VERSION } from "../src/lib/price-engine";

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
      brandId: true,
      categoryId: true,
      modelId: true,
      productId: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  console.log(
    `[price-obs] backfilling ${listings.length} PUBLISHED listings…`,
  );

  // ──────────────────────────────────────────────────────────
  // Phase 1 — create one PriceObservation per listing
  // ──────────────────────────────────────────────────────────
  let obsCreated = 0;
  let obsFailed = 0;
  for (const l of listings) {
    if (!l.price) continue;
    try {
      await db.priceObservation.create({
        data: {
          listingId: l.id,
          productId: l.productId ?? null,
          brandId: l.brandId ?? null,
          categoryId: l.categoryId ?? null,
          modelId: l.modelId ?? null,
          askingPrice: l.price, // BigInt — native column type
          currency: "IRR",
          source: "LISTING",
          sourceType: "HEAVIX",
          observedAt: l.publishedAt ?? l.createdAt,
          market: "IRAN",
          quality: "MEDIUM",
          status: "ACTIVE",
        },
      });
      obsCreated++;
    } catch (err: unknown) {
      obsFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[price-obs] failed for listing ${l.id}: ${msg}`);
    }
  }
  console.log(
    `[price-obs] created ${obsCreated} PriceObservation rows` +
      (obsFailed ? ` (${obsFailed} failed)` : ""),
  );

  // ──────────────────────────────────────────────────────────
  // Phase 2 — compute + persist a PriceEstimate per listing
  // (run AFTER all observations exist so estimatePrice benefits
  //  from the full comparable pool we just seeded.)
  // ──────────────────────────────────────────────────────────
  let estCreated = 0;
  let estSkipped = 0;
  let estFailed = 0;
  for (const l of listings) {
    try {
      const est = await estimatePrice({ listingId: l.id });

      // INSUFFICIENT → no estimatedPrice; skip persisting.
      if (est.estimatedPrice == null) {
        estSkipped++;
        continue;
      }

      await db.priceEstimate.create({
        data: {
          listingId: l.id,
          estimatedPrice: est.estimatedPrice,
          priceLower: est.priceLower ?? 0,
          priceUpper: est.priceUpper ?? 0,
          confidence: est.confidence,
          comparableCount: est.comparableCount,
          dataFreshness: est.dataFreshness,
          mainDrivers: JSON.stringify(est.mainDrivers),
          warnings: JSON.stringify(est.warnings),
          modelVersion: est.modelVersion ?? PRICE_MODEL_VERSION,
        },
      });
      estCreated++;
    } catch (err: unknown) {
      estFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[price-est] failed for listing ${l.id}: ${msg}`);
    }
  }
  console.log(
    `[price-est] created ${estCreated} PriceEstimate rows` +
      ` (${estSkipped} skipped — INSUFFICIENT data` +
      (estFailed ? `, ${estFailed} failed)` : ")"),
  );

  // ──────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────
  const obsTotal = await db.priceObservation.count();
  const estTotal = await db.priceEstimate.count();
  const obsBySource = await db.priceObservation.groupBy({
    by: ["source"],
    _count: true,
  });
  const estByConf = await db.priceEstimate.groupBy({
    by: ["confidence"],
    _count: true,
  });
  console.log(`[price-obs] total PriceObservation rows now: ${obsTotal}`);
  console.log(`[price-obs] by source:`, JSON.stringify(obsBySource));
  console.log(`[price-est] total PriceEstimate rows now: ${estTotal}`);
  console.log(`[price-est] by confidence:`, JSON.stringify(estByConf));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
