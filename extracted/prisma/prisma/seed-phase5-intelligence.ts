/**
 * Phase 5: Intelligence Seed.
 * Per HEAVIX COMPLETION MASTER SPEC V1.0 §21-25, §41, §62.
 *
 * Seeds: PriceRecords (more), Opportunities, DemandSignals,
 * KnowledgeEntries, and updates SearchIndex.
 *
 * Intelligence domains:
 * - Search (§21-22): Persian normalization, ranking
 * - Price Intelligence (§23): PriceEstimate with confidence
 * - Compare Engine (§24): model/product/listing compare
 * - Demand Engine (§25): BuyRequest matching
 * - Knowledge Graph (§41): entity relationships
 * - Market Intelligence (§62): heatmap, trends, signals
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("=== PHASE 5: INTELLIGENCE SEED ===\n");

  // ── 1. Add more PriceRecords for price intelligence ──
  console.log("1. Seeding PriceRecords...");
  
  const listings = await db.listing.findMany({ 
    where: { status: "PUBLISHED", price: { not: null } },
    take: 10,
    include: { brand: { select: { name: true } } },
  });
  
  let priceCount = 0;
  for (const listing of listings) {
    // Create historical price observations (3 per listing)
    for (let i = 0; i < 3; i++) {
      const basePrice = Number(listing.price);
      const variation = 0.95 + (i * 0.025); // 0.95, 0.975, 1.0
      const observedPrice = BigInt(Math.floor(basePrice * variation));
      const monthsAgo = i + 1;
      const observedAt = new Date();
      observedAt.setMonth(observedAt.getMonth() - monthsAgo);
      
      const existing = await db.priceRecord.findFirst({
        where: { listingId: listing.id, recordedAt: observedAt },
      });
      if (!existing) {
        await db.priceRecord.create({
          data: {
            listingId: listing.id,
            price: Number(observedPrice),
            source: i === 0 ? "MARKET_SURVEY" : i === 1 ? "AI_ESTIMATE" : "ADMIN",
            recordedAt: observedAt,
            condition: listing.condition || "USED",
            year: listing.year,
          },
        });
        priceCount++;
      }
    }
  }
  console.log(`  ✓ ${priceCount} price records created`);

  // ── 2. Seed Opportunities ──
  console.log("\n2. Seeding Opportunities...");
  
  const opportunities = [
    { title: "افزایش تقاضای بیل مکانیکی در تهران", type: "HIGH_DEMAND_LOW_SUPPLY", entityType: "Category", score: 0.85, description: "تقاضای بالای بیل مکانیکی با عرضه محدود در منطقه تهران" },
    { title: "قیمت لودر در بازار کاهش یافت", type: "PRICE_DROP", entityType: "Category", score: 0.72, description: "کاهش ۱۰ درصدی قیمت لودر در یک ماه گذشته" },
    { title: "فرصت خرید بلدوزر کوماتسو D85A", type: "UNDERPRICED_LISTING", entityType: "Listing", score: 0.90, description: "آگهی با قیمت ۱۵٪ زیر میانگین بازار" },
    { title: "رشد تقاضای جرثقیل در خوزستان", type: "NEW_TREND", entityType: "Category", score: 0.78, description: "رشد ۲۵ درصدی جستجوهای جرثقیل در منطقه خوزستان" },
  ];
  
  let oppCount = 0;
  for (const opp of opportunities) {
    const existing = await db.opportunity.findFirst({ where: { title: opp.title } });
    if (!existing) {
      await db.opportunity.create({
        data: {
          title: opp.title,
          type: opp.type,
          entityType: opp.entityType,
          score: opp.score,
          description: opp.description,
          status: "NEW",
          metadata: JSON.stringify({ source: "SEED", generatedAt: new Date().toISOString() }),
        },
      });
      oppCount++;
    }
  }
  console.log(`  ✓ ${oppCount} opportunities created`);

  // ── 3. Seed KnowledgeEntries ──
  console.log("\n3. Seeding KnowledgeEntries...");
  
  const knowledgeEntries = [
    { entityType: "BRAND", entityId: "komatsu", title: "اطلاعات برند کوماتسو", key: "founded", value: "1921", unit: "سال", source: "MANUFACTURER" },
    { entityType: "BRAND", entityId: "komatsu", title: "کشور سازنده کوماتسو", key: "country", value: "ژاپن", source: "MANUFACTURER" },
    { entityType: "BRAND", entityId: "caterpillar", title: "اطلاعات برند کاترپیلار", key: "founded", value: "1925", unit: "سال", source: "MANUFACTURER" },
    { entityType: "BRAND", entityId: "caterpillar", title: "کشور سازنده کاترپیلار", key: "country", value: "آمریکا", source: "MANUFACTURER" },
    { entityType: "CATEGORY", entityId: "excavator", title: "وزن استاندارد بیل مکانیکی ۲۰ تن", key: "weight", value: "20000", unit: "kg", source: "HEAVIX" },
    { entityType: "CATEGORY", entityId: "excavator", title: "قدرت موتور بیل مکانیکی ۲۰ تن", key: "engine_power", value: "120", unit: "kW", source: "HEAVIX" },
    { entityType: "PRODUCT", entityId: "komatsu-pc200-8", title: "حداکثر عمق حفاری PC200-8", key: "dig_depth", value: "6.62", unit: "m", source: "MANUFACTURER" },
    { entityType: "PRODUCT", entityId: "komatsu-pc200-8", title: "وزن PC200-8", key: "operating_weight", value: "20000", unit: "kg", source: "MANUFACTURER" },
  ];
  
  let keCount = 0;
  for (const ke of knowledgeEntries) {
    const existing = await db.knowledgeEntry.findFirst({
      where: { entityType: ke.entityType, entityId: ke.entityId, key: ke.key },
    });
    if (!existing) {
      await db.knowledgeEntry.create({
        data: {
          entityType: ke.entityType,
          entityId: ke.entityId,
          title: ke.title,
          key: ke.key,
          value: ke.value,
          unit: ke.unit || null,
          source: ke.source,
          verified: true,
          verifiedBy: "admin",
          verifiedAt: new Date(),
        },
      });
      keCount++;
    }
  }
  console.log(`  ✓ ${keCount} knowledge entries created`);

  // ── 4. Seed SearchQuery (popular search terms) ──
  console.log("\n4. Seeding SearchQuery history...");
  
  const searchTerms = [
    { query: "بیل مکانیکی", resultsCount: 15, normalizedQuery: "بیل مکانیکی" },
    { query: "لودر کاترپیلار", resultsCount: 8, normalizedQuery: "لودر کاترپیلار" },
    { query: "کوماتسو PC200", resultsCount: 5, normalizedQuery: "کوماتسو pc200" },
    { query: "بلدوزر", resultsCount: 4, normalizedQuery: "بلدوزر" },
    { query: "دامپ تراک وولوو", resultsCount: 3, normalizedQuery: "دامپ تراک وولوو" },
  ];
  
  let sqCount = 0;
  for (const sq of searchTerms) {
    const existing = await db.searchQuery.findFirst({ where: { query: sq.query } }).catch(() => null);
    if (!existing) {
      await db.searchQuery.create({
        data: {
          query: sq.query,
          normalizedQuery: sq.normalizedQuery,
          resultCount: sq.resultsCount,
          hasResults: sq.resultsCount > 0,
        },
      }).catch(() => {});
      sqCount++;
    }
  }
  console.log(`  ✓ ${sqCount} search queries created`);

  // ── 5. Seed SocialReels (link to listings) ──
  console.log("\n5. Seeding SocialReels metadata...");
  // SocialReels are generated on-demand via the admin UI, not seeded.
  // But we can create a placeholder record to verify the table works.
  const reelListing = await db.listing.findFirst({ where: { status: "PUBLISHED" } });
  if (reelListing) {
    const existingReel = await db.socialReel.findFirst();
    if (!existingReel) {
      await db.socialReel.create({
        data: {
          listingId: reelListing.id,
          platform: "INSTAGRAM",
          prompt: `Cinematic showcase of ${reelListing.title}`,
          status: "PENDING",
          duration: 5,
        },
      });
      console.log("  ✓ 1 social reel placeholder created");
    } else {
      console.log("  ✓ Social reels already exist");
    }
  }

  console.log("\n=== PHASE 5 SEED COMPLETE ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
}).finally(() => db.$disconnect());
