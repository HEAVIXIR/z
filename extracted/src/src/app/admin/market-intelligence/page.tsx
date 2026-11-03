import { db } from "@/lib/db";
import { toFa, formatCompactPrice, faDate } from "@/lib/format";
import {
  TrendingUp,
  Eye,
  MapPin,
  Activity,
  Gauge,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketIntelligencePage() {
  const [
    topViewedListings,
    topCategories,
    topBrands,
    regions,
    marketIndex,
    sevenDayStats,
  ] = await Promise.all([
    db.listing.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { viewCount: "desc" },
      take: 10,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true, icon: true } },
      },
    }),
    db.category.findMany({
      where: { active: true, parentId: null },
      include: { _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
    db.brand.findMany({
      where: { active: true },
      include: { _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
      orderBy: { name: "asc" },
      take: 8,
    }),
    db.listing.findMany({
      where: { status: "PUBLISHED", province: { not: null } },
      select: { province: true },
    }),
    db.listing.aggregate({
      where: { status: "PUBLISHED", price: { not: null } },
      _avg: { price: true },
      _min: { price: true },
      _max: { price: true },
      _count: true,
    }),
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [newListings, newOffers, newRequests] = await Promise.all([
        db.listing.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        db.listingOffer.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        db.buyRequest.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      ]);
      return { newListings, newOffers, newRequests };
    })(),
  ]);

  // Group regions
  const regionCounts: Record<string, number> = {};
  regions.forEach((r) => {
    const p = r.province ?? "نامشخص";
    regionCounts[p] = (regionCounts[p] ?? 0) + 1;
  });
  const sortedRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topCats = topCategories
    .map((c) => ({ name: c.name, icon: c.icon, count: c._count.listings }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topBrnds = topBrands
    .map((b) => ({ name: b.name, logoUrl: b.logoUrl, count: b._count.listings }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const avgPrice = marketIndex._avg.price
    ? Number(marketIndex._avg.price)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">هوش بازار</h1>
        <p className="mt-1 text-sm text-zinc-500">
          داشبورد تحلیلی بازار ماشین‌آلات سنگین هویکس
        </p>
      </div>

      {/* Daily brief */}
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-l from-[#F58220]/10 via-white to-white p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#F58220]" />
          <h2 className="text-lg font-black text-zinc-900">گزارش ۷ روز اخیر</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">آگهی جدید</p>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-zinc-900">
              {toFa(sevenDayStats.newListings)}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">پیشنهاد جدید</p>
              <ArrowUp className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-zinc-900">
              {toFa(sevenDayStats.newOffers)}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">درخواست خرید</p>
              <ArrowDown className="h-4 w-4 text-violet-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-zinc-900">
              {toFa(sevenDayStats.newRequests)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top viewed */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">پربازدیدترین آگهی‌ها</h2>
          </div>
          <div className="space-y-2">
            {topViewedListings.map((l, idx) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F58220]/10 text-xs font-black text-[#F58220]">
                  {toFa(idx + 1)}
                </span>
                <span className="text-lg">{l.category?.icon ?? "🚜"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-800">{l.title}</p>
                  <p className="text-[11px] text-zinc-500">
                    {l.brand?.name ?? "—"}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#F58220]">
                    {toFa(l.viewCount)}
                  </p>
                  <p className="text-[10px] text-zinc-400">بازدید</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market index */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">شاخص بازار</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">میانگین قیمت آگهی‌ها</p>
              <p className="mt-1 text-2xl font-black text-[#F58220]">
                {avgPrice > 0 ? formatCompactPrice(avgPrice) : "—"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-zinc-50 p-3 text-center">
                <p className="text-[10px] text-zinc-500">کمینه</p>
                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {marketIndex._min.price
                    ? formatCompactPrice(Number(marketIndex._min.price))
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 text-center">
                <p className="text-[10px] text-zinc-500">بیشینه</p>
                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {marketIndex._max.price
                    ? formatCompactPrice(Number(marketIndex._max.price))
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 text-center">
                <p className="text-[10px] text-zinc-500">کل آگهی</p>
                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {toFa(marketIndex._count)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top categories */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">دسته‌های پربازار</h2>
          </div>
          <div className="space-y-2">
            {topCats.map((c, idx) => {
              const max = topCats[0]?.count || 1;
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-lg">{c.icon ?? "📁"}</span>
                  <span className="w-32 truncate text-sm text-zinc-700">
                    {c.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full bg-[#F58220]"
                      style={{ width: `${(c.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-left text-xs font-bold text-zinc-700">
                    {toFa(c.count)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top regions */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">مناطق فعال</h2>
          </div>
          <div className="space-y-2">
            {sortedRegions.map(([province, count]) => {
              const max = sortedRegions[0]?.[1] || 1;
              return (
                <div key={province} className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <span className="w-28 truncate text-sm text-zinc-700">
                    {province}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-left text-xs font-bold text-zinc-700">
                    {toFa(count)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top brands */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#F58220]" />
          <h2 className="text-lg font-black text-zinc-900">برندهای پربازار</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {topBrnds.map((b) => (
            <div
              key={b.name}
              className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center"
            >
              <div className="mx-auto mb-2 flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg bg-white">
                {b.logoUrl ? (
                   
                  <img
                    src={b.logoUrl}
                    alt={b.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-lg font-black text-[#F58220]">
                    {b.name.charAt(0)}
                  </span>
                )}
              </div>
              <p className="truncate text-xs font-bold text-zinc-800">{b.name}</p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {toFa(b.count)} آگهی
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
