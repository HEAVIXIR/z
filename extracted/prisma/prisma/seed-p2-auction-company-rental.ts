/* P2-AUCTION-COMPANY-RENTAL — seed sample data for the public
 * auction UI, company directory, and rentals page.
 *
 * Idempotent: each section checks for existing rows and skips
 * creation when one with the same slug/id exists.
 *
 * Run: `bun run db:seed-p2`
 */
import { db } from "../src/lib/db";

async function main() {
  const now = new Date();

  // ── 1. Seed sample companies ──
  const companySpecs = [
    {
      name: "گروه صنعتی آریا ماشین جم",
      description: "نمایندگی رسمی برندهای کوماتسو و کاترپیلار در ایران — فروش، اجاره و خدمات پس از فروش ماشین‌آلات سنگین.",
      city: "تهران",
      province: "تهران",
      phone: "021-91008000",
      website: "https://ariamj.ir",
      verified: true,
      premium: true,
    },
    {
      name: "مکانیکس جنوب",
      description: "دیلیر لوازم یدکی و ماشین‌آلات معدنی در جنوب ایران — متخصص در دامپ‌تراک و لودر.",
      city: "بندرعباس",
      province: "هرمزگان",
      phone: "076-32221000",
      verified: true,
      premium: false,
    },
    {
      name: "صنایع سنگین پارس",
      description: "اجاره و فروش بیل مکانیکی، گریدر و بلدوزر برای پروژه‌های عمرانی و معدنی.",
      city: "اصفهان",
      province: "اصفهان",
      phone: "031-33880000",
      verified: false,
      premium: false,
    },
    {
      name: "آلات صنعتی کاوه",
      description: "متخصص در اجاره جرثقیل و ماشین‌آلات بالابر — با اپراتور و بیمه کامل.",
      city: "کرج",
      province: "البرز",
      phone: "026-32550000",
      verified: true,
      premium: false,
    },
  ];

  const seededCompanies: { id: string; name: string; slug: string }[] = [];
  for (const spec of companySpecs) {
    const slug = spec.name
      .trim()
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
    const existing = await db.company.findUnique({ where: { slug } });
    if (existing) {
      seededCompanies.push({ id: existing.id, name: existing.name, slug: existing.slug });
      continue;
    }
    const created = await db.company.create({
      data: {
        name: spec.name,
        slug,
        description: spec.description,
        city: spec.city,
        province: spec.province,
        phone: spec.phone,
        website: spec.website ?? null,
        verified: spec.verified,
        premium: spec.premium,
        status: "ACTIVE",
      },
    });
    seededCompanies.push({ id: created.id, name: created.name, slug: created.slug });
    console.log(`  ✓ Company created: ${created.name}`);
  }

  // ── 2. Seed partnership between company 0 ↔ 1 (ACCEPTED) + 0 → 2 (PENDING) ──
  if (seededCompanies.length >= 3) {
    const [c0, c1, c2] = seededCompanies;
    const existing1 = await db.companyPartner.findFirst({
      where: { OR: [{ companyId: c0.id, partnerId: c1.id }, { companyId: c1.id, partnerId: c0.id }] },
    });
    if (!existing1) {
      await db.companyPartner.create({
        data: {
          companyId: c0.id,
          partnerId: c1.id,
          status: "ACCEPTED",
          requestedAt: new Date(now.getTime() - 7 * 86400_000),
          acceptedAt: new Date(now.getTime() - 5 * 86400_000),
        },
      });
      console.log(`  ✓ Partnership ACCEPTED: ${c0.name} ↔ ${c1.name}`);
    }
    const existing2 = await db.companyPartner.findFirst({
      where: { companyId: c0.id, partnerId: c2.id },
    });
    if (!existing2) {
      await db.companyPartner.create({
        data: {
          companyId: c0.id,
          partnerId: c2.id,
          status: "PENDING",
          requestedAt: new Date(now.getTime() - 1 * 86400_000),
        },
      });
      console.log(`  ✓ Partnership PENDING: ${c0.name} → ${c2.name}`);
    }
    // Incoming request to c0 from c3 (PENDING) — for testing accept/reject flow.
    if (seededCompanies.length >= 4) {
      const c3 = seededCompanies[3];
      const existing3 = await db.companyPartner.findFirst({
        where: { companyId: c3.id, partnerId: c0.id },
      });
      if (!existing3) {
        await db.companyPartner.create({
          data: {
            companyId: c3.id,
            partnerId: c0.id,
            status: "PENDING",
            requestedAt: new Date(now.getTime() - 2 * 86400_000),
          },
        });
        console.log(`  ✓ Partnership PENDING (incoming): ${c3.name} → ${c0.name}`);
      }
    }
  }

  // ── 3. Seed sample auctions on existing listings ──
  // Take 3 PUBLISHED listings to host auctions.
  const listings = await db.listing.findMany({
    where: { status: "PUBLISHED" },
    take: 3,
    select: { id: true, title: true, price: true },
  });

  if (listings.length >= 1) {
    const auctionSpecs = [
      {
        listing: listings[0],
        titleSuffix: "— مزایده ویژه",
        startPrice: 2_000_000_000n, // 2 billion Toman
        minIncrement: 50_000_000n, // 50M
        offsetStart: -1 * 3600_000, // started 1h ago (LIVE)
        offsetEnd: 3 * 86400_000, // ends in 3 days
        status: "LIVE" as const,
      },
      ...(listings[1]
        ? [{
            listing: listings[1],
            titleSuffix: "— مزایده ماهانه",
            startPrice: 5_000_000_000n,
            minIncrement: 100_000_000n,
            offsetStart: 2 * 86400_000, // starts in 2 days (UPCOMING)
            offsetEnd: 9 * 86400_000, // ends 9 days from now
            status: "SCHEDULED" as const,
          }]
        : []),
      ...(listings[2]
        ? [{
            listing: listings[2],
            titleSuffix: "— مزایده پایان‌یافته",
            startPrice: 1_500_000_000n,
            minIncrement: 30_000_000n,
            offsetStart: -10 * 86400_000, // started 10 days ago
            offsetEnd: -2 * 86400_000, // ended 2 days ago
            status: "ENDED" as const,
          }]
        : []),
    ];

    for (const spec of auctionSpecs) {
      const auctionTitle = `${spec.listing.title} ${spec.titleSuffix}`;
      const existing = await db.auction.findFirst({ where: { title: auctionTitle } });
      if (existing) {
        console.log(`  • Auction exists: ${auctionTitle}`);
        continue;
      }
      const startDate = new Date(now.getTime() + spec.offsetStart);
      const endDate = new Date(now.getTime() + spec.offsetEnd);
      const created = await db.auction.create({
        data: {
          listingId: spec.listing.id,
          title: auctionTitle,
          description:
            spec.status === "ENDED"
              ? "مزایده پایان یافته — برنده پس از تأیید نهایی اعلام شد."
              : spec.status === "SCHEDULED"
                ? "این مزایده هنوز آغاز نشده است. می‌توانید یادآوری ثبت کنید."
                : "مزایده در حال برگزاری است — بالاترین پیشنهاد تا کنون رکورد فعلی است.",
          startPrice: spec.startPrice,
          minIncrement: spec.minIncrement,
          startDate,
          endDate,
          status: spec.status,
          ...(spec.status === "ENDED"
            ? {
                winningBid: spec.startPrice + spec.minIncrement * 3n,
                winnerName: "شرکت صنعتی آریا",
              }
            : {}),
        },
      });
      // For LIVE auction, add a couple of seed bids.
      if (spec.status === "LIVE") {
        await db.auctionBid.createMany({
          data: [
            {
              auctionId: created.id,
              bidderName: "رحیمی پارسا",
              bidderPhone: "09121111111",
              amount: spec.startPrice + spec.minIncrement,
              isWinning: false,
            },
            {
              auctionId: created.id,
              bidderName: "گروه صنعتی شمال",
              bidderPhone: "021-22223333",
              amount: spec.startPrice + spec.minIncrement * 2n,
              isWinning: true,
            },
          ],
        });
      }
      console.log(`  ✓ Auction created: ${auctionTitle} (${spec.status})`);
    }
  }

  // ── 4. Seed RENT listings ──
  // Clone 2 existing listings as RENT copies (new slug + listingType=RENT).
  const rentSources = await db.listing.findMany({
    where: { status: "PUBLISHED", listingType: "SALE" },
    take: 2,
    include: {
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
  });

  const rentSpecs = [
    {
      period: "DAILY" as const,
      price: 8_000_000n, // 8M/day
      deposit: 50_000_000n,
      minimumRentalPeriod: 3,
      operatorIncluded: true,
      fuelIncluded: false,
      transportIncluded: true,
      suffix: "اجاره روزانه",
    },
    {
      period: "MONTHLY" as const,
      price: 120_000_000n, // 120M/month
      deposit: 200_000_000n,
      minimumRentalPeriod: 1,
      operatorIncluded: true,
      fuelIncluded: true,
      transportIncluded: false,
      suffix: "اجاره ماهانه",
    },
  ];

  for (let i = 0; i < rentSources.length && i < rentSpecs.length; i++) {
    const src = rentSources[i];
    const spec = rentSpecs[i];
    const rentSlug = `${src.slug}-rent-${i + 1}`;
    const existing = await db.listing.findUnique({ where: { slug: rentSlug } });
    if (existing) {
      console.log(`  • Rent listing exists: ${rentSlug}`);
      continue;
    }
    const created = await db.listing.create({
      data: {
        slug: rentSlug,
        title: `${src.title} — ${spec.suffix}`,
        description: src.description ?? "اجاره ماشین‌آلات صنعتی با شرایط منعطف.",
        shortDesc: src.shortDesc ?? `اجاره ${src.title}`,
        price: spec.price,
        priceType: "FIXED",
        listingType: "RENT",
        condition: src.condition,
        province: src.province,
        city: src.city,
        year: src.year,
        workingHours: src.workingHours,
        status: "PUBLISHED",
        showInLatest: true,
        brandId: src.brandId,
        categoryId: src.categoryId,
        rentalPeriod: spec.period,
        deposit: spec.deposit,
        minimumRentalPeriod: spec.minimumRentalPeriod,
        operatorIncluded: spec.operatorIncluded,
        fuelIncluded: spec.fuelIncluded,
        transportIncluded: spec.transportIncluded,
        availabilityStart: new Date(now.getTime() + 1 * 86400_000),
        availabilityEnd: new Date(now.getTime() + 90 * 86400_000),
        publishedAt: now,
        expiresAt: new Date(now.getTime() + 60 * 86400_000),
      },
    });
    // Copy first image as the rent listing's image.
    if (src.images[0]) {
      await db.listingImage.create({
        data: {
          listingId: created.id,
          url: src.images[0].url,
          alt: src.images[0].alt,
          isPrimary: true,
          sortOrder: 0,
        },
      });
    }
    console.log(`  ✓ Rent listing created: ${created.slug} (${spec.period})`);
  }

  console.log("\n✓ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
