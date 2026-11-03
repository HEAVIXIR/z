import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* ============================================================
   GET /api/homepage-sections (public)
   Returns active sections ordered by `order`.
   Auto-seeds defaults if table is empty.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SECTIONS = [
  { key: "hero", title: "هیرو و جستجو", order: 1, active: true, config: "{}" },
  { key: "categories", title: "دسته‌بندی ماشین‌آلات", order: 2, active: true, config: "{}" },
  { key: "stats", title: "آمار پلتفرم", order: 3, active: true, config: "{}" },
  { key: "featured-machines", title: "ماشین‌آلات تأییدشده", order: 4, active: true, config: JSON.stringify({ limit: 8 }) },
  { key: "exclusive-sale", title: "فروش ویژه", order: 5, active: true, config: "{}" },
  { key: "services", title: "خدمات هویکس", order: 6, active: true, config: "{}" },
  { key: "latest-ads", title: "آخرین آگهی‌ها", order: 7, active: true, config: JSON.stringify({ limit: 10 }) },
  { key: "sell7", title: "فروش در ۷ روز", order: 8, active: true, config: "{}" },
  { key: "why-us", title: "چرا هویکس؟", order: 9, active: true, config: "{}" },
  { key: "brands", title: "برندهای معتبر", order: 10, active: true, config: "{}" },
  { key: "cta", title: "دعوت به اقدام", order: 11, active: true, config: "{}" },
];

export async function GET() {
  let sections = await db.homePageSection.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  // Auto-seed if empty
  if (sections.length === 0) {
    await db.homePageSection.createMany({ data: DEFAULT_SECTIONS });
    sections = await db.homePageSection.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });
  }

  return NextResponse.json({
    success: true,
    data: sections.map((s) => ({
      key: s.key,
      title: s.title,
      subtitle: s.subtitle,
      description: s.description,
      order: s.order,
      active: s.active,
      config: JSON.parse(s.config || "{}"),
    })),
  });
}
