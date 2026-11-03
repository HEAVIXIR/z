// @ts-nocheck — seed script, not part of runtime typecheck
/**
 * Phase 4: Marketplace Seed.
 * Per HEAVIX COMPLETION MASTER SPEC V1.0 §19-29.
 *
 * Seeds: BuyRequests, ListingOffers, DealRooms, DealMessages,
 * Auctions, AuctionBids, Inspections, TransportRequests.
 * Also: updates existing listings with canonical location + transactionType.
 *
 * Listing lifecycle (§19): DRAFT → PENDING_REVIEW → PUBLISHED → PAUSED → EXPIRED → SOLD → ARCHIVED → REJECTED
 * Offer lifecycle (§27): PENDING → COUNTERED → ACCEPTED → REJECTED → EXPIRED → CANCELLED
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("=== PHASE 4: MARKETPLACE SEED ===\n");

  // ── 1. Update existing listings with canonical location + transactionType ──
  console.log("1. Updating listings with canonical location + transactionType...");
  
  const iran = await db.country.findFirst({ where: { code: "IR" } });
  const tehran = await db.province.findFirst({ where: { name: "تهران" } });
  const tehranCity = await db.city.findFirst({ where: { provinceId: tehran?.id, name: "تهران" } });
  const isfahan = await db.province.findFirst({ where: { name: "اصفهان" } });
  const isfahanCity = await db.city.findFirst({ where: { provinceId: isfahan?.id, name: "اصفهان" } });
  const mashhad = await db.province.findFirst({ where: { name: "خراسان رضوی" } });
  const mashhadCity = await db.city.findFirst({ where: { provinceId: mashhad?.id, name: "مشهد" } });
  const shiraz = await db.province.findFirst({ where: { name: "فارس" } });
  const shirazCity = await db.city.findFirst({ where: { provinceId: shiraz?.id, name: "شیراز" } });
  const ahvaz = await db.province.findFirst({ where: { name: "خوزستان" } });
  const ahvazCity = await db.city.findFirst({ where: { provinceId: ahvaz?.id, name: "اهواز" } });
  
  const locations = [
    { country: iran, province: tehran, city: tehranCity },
    { country: iran, province: isfahan, city: isfahanCity },
    { country: iran, province: mashhad, city: mashhadCity },
    { country: iran, province: shiraz, city: shirazCity },
    { country: iran, province: ahvaz, city: ahvazCity },
  ].filter(l => l.country && l.province);

  // Get transaction types
  const txTypes = await db.transactionType.findMany();
  const saleType = txTypes.find(t => t.key === "SALE" || t.nameFa?.includes("فروش"));
  const rentType = txTypes.find(t => t.key === "RENT" || t.nameFa?.includes("اجاره"));

  const listings = await db.listing.findMany();
  let updatedCount = 0;
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const loc = locations[i % locations.length];
    const txType = i % 5 === 0 ? rentType : saleType;
    
    const updateData: any = {};
    if (!listing.countryId && loc.country) updateData.countryId = loc.country.id;
    if (!listing.provinceId && loc.province) updateData.provinceId = loc.province.id;
    if (!listing.cityId && loc.city) updateData.cityId = loc.city.id;
    if (!listing.transactionTypeId && txType) updateData.transactionTypeId = txType.id;
    
    if (Object.keys(updateData).length > 0) {
      await db.listing.update({ where: { id: listing.id }, data: updateData });
      updatedCount++;
    }
  }
  console.log(`  ✓ ${updatedCount} listings updated with canonical location + transactionType`);

  // ── 2. Seed BuyRequests ──
  console.log("\n2. Seeding BuyRequests...");
  
  const categories = await db.category.findMany({ where: { layer: "CATALOG", active: true, parentId: { not: null } }, take: 10 });
  const brands = await db.brand.findMany({ where: { active: true, featured: true }, take: 10 });
  
  const buyRequestData = [
    { title: "خرید بیل مکانیکی کوماتسو PC200", cat: "بیل مکانیکی", brand: "کوماتسو", budgetMin: 1500000000n, budgetMax: 2500000000n, city: "تهران", province: "تهران" },
    { title: "خرید لودر کاترپیلار 966H", cat: "لودر", brand: "کاترپیلار", budgetMin: 2000000000n, budgetMax: 3500000000n, city: "اصفهان", province: "اصفهان" },
    { title: "خرید بلدوزر کوماتسو D85A", cat: "بلدوزر", brand: "کوماتسو", budgetMin: 1800000000n, budgetMax: 3000000000n, city: "مشهد", province: "خراسان رضوی" },
    { title: "اجاره جرثقیل لیبهر ۱۰۰ تن", cat: "جرثقیل", brand: "لیبهر", budgetMin: 50000000n, budgetMax: 100000000n, city: "شیراز", province: "فارس", transaction: "RENT" },
    { title: "خرید دامپ‌تراک وولوو A40G", cat: "دامپ‌تراک", brand: "وولوو", budgetMin: 4000000000n, budgetMax: 6000000000n, city: "اهواز", province: "خوزستان" },
  ];

  let brCount = 0;
  for (const br of buyRequestData) {
    const existing = await db.buyRequest.findFirst({ where: { title: br.title } });
    if (!existing) {
      await db.buyRequest.create({
        data: {
          title: br.title,
          description: `${br.title} - حالت خوب - همراه با کارشناسی فنی`,
          category: br.cat,
          brandPref: br.brand,
          transaction: br.transaction || "SALE",
          budgetMin: br.budgetMin,
          budgetMax: br.budgetMax,
          city: br.city,
          province: br.province,
          deadline: "یک ماه",
          status: "ACTIVE",
          verified: true,
        },
      });
      brCount++;
    }
  }
  console.log(`  ✓ ${brCount} buy requests created`);

  // ── 3. Seed ListingOffers ──
  console.log("\n3. Seeding ListingOffers...");
  
  const sampleListings = await db.listing.findMany({ take: 5, where: { status: "PUBLISHED" } });
  const users = await db.user.findMany({ take: 3 });
  let offerCount = 0;
  
  for (let i = 0; i < sampleListings.length && i < users.length; i++) {
    const listing = sampleListings[i];
    const user = users[i % users.length];
    const existing = await db.listingOffer.findFirst({ where: { listingId: listing.id, buyerId: user.id } });
    if (!existing) {
      const offerPrice = listing.price ? BigInt(Math.floor(Number(listing.price) * 0.9)) : 1000000000n;
      await db.listingOffer.create({
        data: {
          listingId: listing.id,
          buyerId: user.id,
          offerAmount: offerPrice,
          status: i === 0 ? "ACCEPTED" : i === 1 ? "COUNTERED" : "PENDING",
          message: `پیشنهاد خرید برای ${listing.title}`,
          buyerPhone: "09120000000",
          buyerName: user.firstName || "خریدار",
        },
      });
      offerCount++;
    }
  }
  console.log(`  ✓ ${offerCount} listing offers created`);

  // ── 4. Seed DealRooms + DealMessages ──
  console.log("\n4. Seeding DealRooms + DealMessages...");
  
  const acceptedOffer = await db.listingOffer.findFirst({ where: { status: "ACCEPTED" } });
  if (acceptedOffer) {
    const existingRoom = await db.dealRoom.findFirst({ where: { listingId: acceptedOffer.listingId } });
    if (!existingRoom) {
      const listing = await db.listing.findUnique({ where: { id: acceptedOffer.listingId } });
      const room = await db.dealRoom.create({
        data: {
          listingId: acceptedOffer.listingId,
          buyerId: acceptedOffer.buyerId,
          sellerId: listing?.sellerId || null,
          buyerPhone: acceptedOffer.buyerPhone || "09120000000",
          status: "NEGOTIATING",
          agreedPrice: acceptedOffer.offerAmount,
        },
      });
      console.log("  ✓ 1 deal room created");

      // Add messages
      const messages = [
        { senderRole: "BUYER", text: "سلام، برای کارشناسی دستگاه چه زمانی مناسب است؟" },
        { senderRole: "SELLER", text: "سلام، شنبه تا چهارشنبه ساعت ۹ تا ۱۵ آماده‌ام." },
        { senderRole: "BUYER", text: "سه‌شنبه ساعت ۱۲ مناسب است. آدرس دقیق را بفرستید." },
        { senderRole: "SELLER", text: "تهران، شهرک صنعتی فاز ۲، پلاک ۱۴۵. تماس: ۰۹۱۲۳۴۵۶۷۸۹" },
      ];
      let msgCount = 0;
      for (const msg of messages) {
        await db.dealMessage.create({
          data: {
            dealRoomId: room.id,
            senderName: msg.senderRole,
            senderRole: msg.senderRole,
            message: msg.text,
            createdAt: new Date(Date.now() - (messages.length - msgCount) * 3600000),
          },
        });
        msgCount++;
      }
      console.log(`  ✓ ${msgCount} deal messages created`);
    } else {
      console.log("  ✓ Deal room already exists");
    }
  } else {
    console.log("  ⚠ No accepted offer found, skipping deal room");
  }

  // ── 5. Seed Auctions + AuctionBids ──
  console.log("\n5. Seeding Auctions...");
  
  const auctionListing = await db.listing.findFirst({ 
    where: { status: "PUBLISHED", price: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (auctionListing) {
    const existingAuction = await db.auction.findFirst({ where: { listingId: auctionListing.id } });
    if (!existingAuction) {
      const startPrice = auctionListing.price || 1000000000n;
      const auction = await db.auction.create({
        data: {
          listingId: auctionListing.id,
          title: `مزایده: ${auctionListing.title}`,
          description: `مزایده عمومی برای ${auctionListing.title}`,
          startPrice,
          reservePrice: BigInt(Math.floor(Number(startPrice) * 0.95)),
          minIncrement: BigInt(Math.floor(Number(startPrice) * 0.01)),
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "LIVE",
        },
      });
      console.log("  ✓ 1 auction created");

      // Add bids
      const bidUsers = await db.user.findMany({ take: 3 });
      let bidCount = 0;
      for (let i = 0; i < bidUsers.length; i++) {
        await db.auctionBid.create({
          data: {
            auctionId: auction.id,
            bidderId: bidUsers[i].id,
            bidderName: bidUsers[i].firstName || `خریدار ${i+1}`,
            bidderPhone: "09120000000",
            amount: BigInt(Number(startPrice) + (i + 1) * 50000000),
            isWinning: i === bidUsers.length - 1,
            createdAt: new Date(Date.now() - (3 - i) * 3600000),
          },
        });
        bidCount++;
      }
      console.log(`  ✓ ${bidCount} auction bids created`);
    } else {
      console.log("  ✓ Auction already exists");
    }
  } else {
    console.log("  ⚠ No suitable listing for auction");
  }

  // ── 6. Seed Inspections ──
  console.log("\n6. Seeding Inspections...");
  
  const inspectionListings = await db.listing.findMany({ take: 3, where: { status: "PUBLISHED" } });
  let inspCount = 0;
  for (const listing of inspectionListings) {
    const existing = await db.inspection.findFirst({ where: { listingId: listing.id } });
    if (!existing) {
      await db.inspection.create({
        data: {
          listingId: listing.id,
          requestedBy: users[0]?.id || "system",
          inspectorId: inspCount === 0 ? (users[0]?.id || "system") : null,
          status: inspCount === 0 ? "COMPLETED" : "SCHEDULED",
          scheduledDate: new Date(Date.now() + inspCount * 24 * 60 * 60 * 1000),
          completedAt: inspCount === 0 ? new Date() : null,
          score: inspCount === 0 ? 85 : null,
          notes: inspCount === 0 ? "دستگاه در وضعیت مطلوب، بدون مشکل اساسی" : null,
          reportUrl: inspCount === 0 ? "/uploads/inspection-report.pdf" : null,
        },
      });
      inspCount++;
    }
  }
  console.log(`  ✓ ${inspCount} inspections created`);

  // ── 7. Seed TransportRequests ──
  console.log("\n7. Seeding TransportRequests...");
  
  const transportListings = await db.listing.findMany({ take: 2, where: { status: "PUBLISHED" }, skip: 3 });
  let transCount = 0;
  for (const listing of transportListings) {
    const existing = await db.transportRequest.findFirst({ where: { listingId: listing.id } });
    if (!existing) {
      await db.transportRequest.create({
        data: {
          listingId: listing.id,
          requestedBy: users[0]?.id || "system",
          status: transCount === 0 ? "QUOTING" : "REQUESTED",
          origin: "تهران",
          destination: transCount === 0 ? "اصفهان" : "مشهد",
          cargoType: "ماشین‌آلات سنگین",
          vehicleType: "FLATBED",
          loadingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });
      transCount++;
    }
  }
  console.log(`  ✓ ${transCount} transport requests created`);

  // ── 8. Seed Company data ──
  console.log("\n8. Seeding Company branches + documents...");
  
  const company = await db.company.findFirst();
  if (company) {
    // Add a branch
    const existingBranch = await db.companyBranch.findFirst({ where: { companyId: company.id } });
    if (!existingBranch && tehranCity) {
      await db.companyBranch.create({
        data: {
          companyId: company.id,
          name: "شعبه مرکزی تهران",
          cityId: tehranCity.id,
          address: "تهران، خیابان ولیعصر، برج آریا",
          phone: "021-88106385",
          
        },
      });
      console.log("  ✓ 1 company branch created");
    }

    // Add a verification record
    const existingVerif = await db.companyVerification.findFirst({ where: { companyId: company.id } });
    if (!existingVerif) {
      await db.companyVerification.create({
        data: {
          companyId: company.id,
          
          status: "APPROVED",
          verifiedAt: new Date(),
          verifiedBy: "admin",
          notes: "مدارک شرکت تأیید شد",
        },
      });
      console.log("  ✓ 1 company verification created");
    }
  } else {
    console.log("  ⚠ No company found");
  }

  console.log("\n=== PHASE 4 SEED COMPLETE ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
}).finally(() => db.$disconnect());
