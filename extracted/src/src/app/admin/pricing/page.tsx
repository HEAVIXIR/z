import { db } from "@/lib/db";
import { listOverrides } from "@/lib/price-engine";
import PricingEngineClient from "./PricingEngineClient";

export const dynamic = "force-dynamic";

/* ============================================================
   /admin/pricing — HEAVIX Price Estimation Engine admin
   PRICE-ENGINE task. Persian RTL.

   Tabs (spec §13):
     • Estimates      — pick a listing → show estimate + comparables + health
     • Observations   — table of PriceObservation with filters
     • Overrides      — list overrides (admin/time/reason) + create new
     • History        — pick brand+category → monthly CSS bar chart
   ============================================================ */

export default async function AdminPricingPage() {
  const [categories, brands, overrides] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: "asc" },
      take: 200,
    }),
    db.brand.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    listOverrides(100),
  ]);

  return (
    <PricingEngineClient
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      brands={brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug }))}
      overrides={overrides}
    />
  );
}
