import { db } from "@/lib/db";
import {
  getZeroResultQueries,
  getPopularQueries,
  getDemandByCategory,
  getDemandByBrand,
} from "@/lib/demand-engine";
import DemandEngineClient from "./DemandEngineClient";

export const dynamic = "force-dynamic";

/* ============================================================
   /admin/demand-engine — admin view for the demand engine.
   Tabs:
     1. جستجوهای بدون نتیجه   (zero-result queries)
     2. جستجوهای پرمخاطب       (popular queries)
     3. تقاضا بر اساس دسته     (demand vs supply per category)
     4. تقاضا بر اساس برند     (demand vs supply per brand)

   Surfaces search demand that's NOT being met (zero-results tab),
   trending searches, and demand/supply gaps per category and
   brand. The existing /admin/demand-signals page is retained for
   AI-search intent signals; this page covers the broader search
   demand surface (any public /api/search + /api/listings query).
   ============================================================ */

export default async function DemandEnginePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = sp.days ? Math.min(365, Math.max(1, Number(sp.days))) : 30;

  const [zeroResults, popular, byCategory, byBrand, totalCount] = await Promise.all([
    getZeroResultQueries({ days, limit: 100 }),
    getPopularQueries({ days, limit: 100 }),
    getDemandByCategory(days),
    getDemandByBrand(days),
    db.searchQuery.count({ where: { createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } } }),
  ]);

  return (
    <DemandEngineClient
      days={days}
      totalCount={totalCount}
      zeroResults={zeroResults}
      popular={popular}
      byCategory={byCategory}
      byBrand={byBrand}
    />
  );
}
