// @ts-nocheck — seed script, not part of runtime typecheck
/* HEAVIX — seed ListingImage rows for every listing that currently has none.
   Idempotent: skips listings that already have at least one image.
   Picks 1-3 images per listing from /public/images/{machinery,sections,hero}
   based on the listing's category nameEn (root English category).
   First image of each batch is marked isPrimary=true. */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/* Map root-category English name → list of public image URLs that
   visually match that machine/equipment type. Falls back to a generic
   "construction" hero image when no specific match exists. */
const CATEGORY_IMAGES: Record<string, string[]> = {
  Excavator: ["/images/machinery/excavator.png", "/images/hero/hero-construction.png"],
  Loader: ["/images/machinery/loader.png", "/images/hero/hero-construction.png"],
  Grader: ["/images/machinery/grader.png", "/images/sections/road-construction.png"],
  "Dump Truck": ["/images/machinery/dump-truck.png", "/images/sections/road-construction.png"],
  Bulldozer: ["/images/machinery/excavator.png", "/images/hero/hero-construction.png"],
  Crane: ["/images/hero/hero-construction.png", "/images/sections/services.png"],
  "Road Roller": ["/images/sections/road-construction.png", "/images/machinery/grader.png"],
  Forklift: ["/images/sections/parts.png", "/images/sections/services.png"],
  Generator: ["/images/sections/mining.png", "/images/sections/services.png"],
  Compressor: ["/images/sections/mining.png", "/images/sections/services.png"],
  "Concrete Machinery": ["/images/sections/road-construction.png", "/images/hero/hero-road.png"],
  Agricultural: ["/images/sections/agriculture.png", "/images/hero/hero-road.png"],
  "Spare Parts": ["/images/sections/parts.png"],
  "Mining Equipment": ["/images/sections/mining.png", "/images/hero/hero-mining.png"],
  "Aerial Platform": ["/images/sections/services.png", "/images/hero/hero-construction.png"],
  Forestry: ["/images/sections/agriculture.png", "/images/sections/services.png"],
};

const FALLBACK_IMAGES = ["/images/hero/hero-construction.png", "/images/hero/hero-mining.png", "/images/hero/hero-road.png"];

async function main() {
  console.log("🖼  Seeding ListingImage rows for listings without images…");

  // Find listings that have NO images yet. Use a left-join via _count.
  const listings = await db.listing.findMany({
    where: { images: { none: {} } },
    include: {
      category: { select: { id: true, name: true, nameEn: true, parentId: true } },
      _count: { select: { images: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (listings.length === 0) {
    console.log("  ✓ All listings already have images — nothing to do.");
    return;
  }

  console.log(`  • Found ${listings.length} listings without images.`);

  // For listings whose category is a child (parentId !== null), resolve up to
  // the root category nameEn — that's the key into CATEGORY_IMAGES.
  let categoryCache = new Map<string, { nameEn: string | null; name: string | null }>();
  const allCats = await db.category.findMany({ select: { id: true, name: true, nameEn: true, parentId: true } });
  for (const c of allCats) categoryCache.set(c.id, { nameEn: c.nameEn, name: c.name });

  const resolveRootNameEn = (catId: string | null | undefined): string | null => {
    if (!catId) return null;
    let cur = categoryCache.get(catId);
    let guard = 0;
    while (cur && cur) {
      const full = allCats.find((c) => c.id === catId);
      if (!full) break;
      if (!full.parentId) return full.nameEn ?? full.name;
      cur = categoryCache.get(full.parentId) ?? null;
      catId = full.parentId;
      if (++guard > 10) break;
    }
    return cur?.nameEn ?? cur?.name ?? null;
  };

  let created = 0;
  let listingsUpdated = 0;
  for (const l of listings) {
    const rootNameEn = resolveRootNameEn(l.category?.id ?? null) ?? l.category?.nameEn ?? null;
    const pool = (rootNameEn && CATEGORY_IMAGES[rootNameEn]) || FALLBACK_IMAGES;
    // Each listing gets 1-3 images from its category pool.
    const count = Math.min(pool.length, 1 + (Math.abs(hashCode(l.id)) % 3));
    const picks = pool.slice(0, count);

    if (picks.length === 0) continue;

    await db.listingImage.createMany({
      data: picks.map((url, idx) => ({
        listingId: l.id,
        url,
        alt: l.title,
        isPrimary: idx === 0,
        sortOrder: idx,
      })),
    });
    created += picks.length;
    listingsUpdated += 1;
  }

  console.log(`  ✓ Created ${created} ListingImage rows across ${listingsUpdated} listings.`);

  // Sanity check: how many listings still have 0 images?
  const stillEmpty = await db.listing.count({ where: { images: { none: {} } } });
  if (stillEmpty > 0) {
    console.log(`  ! ${stillEmpty} listings still have 0 images (unexpected — check categories).`);
  } else {
    console.log("  ✓ Every listing now has at least 1 image.");
  }

  console.log("✅ Listing image seed complete.");
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
