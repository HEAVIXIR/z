/* FIX-STATS — seed default SiteStat rows for the homepage.
   Idempotent upsert by `key`. Safe to re-run; never deletes
   existing rows or changes admin-edited fields beyond the
   defaults below. */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEFAULTS: Array<{
  key: string;
  labelFa: string;
  labelEn?: string;
  metric: string;
  icon?: string;
  sortOrder: number;
  active: boolean;
}> = [
  {
    key: "categories",
    labelFa: "دسته‌بندی اصلی",
    labelEn: "Categories",
    metric: "categories",
    icon: "FolderTree",
    sortOrder: 1,
    active: true,
  },
  {
    key: "brands",
    labelFa: "برند فعال",
    labelEn: "Brands",
    metric: "brands",
    icon: "Tag",
    sortOrder: 2,
    active: true,
  },
  {
    key: "listings",
    labelFa: "آگهی فعال",
    labelEn: "Listings",
    metric: "listings",
    icon: "Megaphone",
    sortOrder: 3,
    active: true,
  },
  {
    key: "provinces",
    labelFa: "استان تحت پوشش",
    labelEn: "Provinces",
    metric: "provinces",
    icon: "MapPin",
    sortOrder: 4,
    active: true,
  },
];

async function main() {
  for (const d of DEFAULTS) {
    await db.siteStat.upsert({
      where: { key: d.key },
      // Only set customValue on create — never overwrite admin edits.
      create: {
        key: d.key,
        labelFa: d.labelFa,
        labelEn: d.labelEn ?? null,
        metric: d.metric,
        icon: d.icon ?? null,
        sortOrder: d.sortOrder,
        active: d.active,
      },
      update: {
        // Ensure label + metric + icon are kept in sync with the seed on
        // re-run, but DO NOT touch active/sortOrder/customValue (admin may
        // have customized those).
        labelFa: d.labelFa,
        labelEn: d.labelEn ?? null,
        metric: d.metric,
        icon: d.icon ?? null,
      },
    });
    console.log(`✓ upserted SiteStat: ${d.key}`);
  }
  console.log(`\nDone. ${DEFAULTS.length} default stats ensured.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
