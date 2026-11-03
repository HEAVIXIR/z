import { db } from "@/lib/db";
import { toFa, formatCompactPrice } from "@/lib/format";
import {
  Target,
  TrendingUp,
  MapPin,
  DollarSign,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OpportunityRadarPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    allCategories,
    allListings,
    newListingsByCat,
    regions,
    buyRequestsByCat,
  ] = await Promise.all([
    db.category.findMany({
      where: { active: true, parentId: null },
      include: { _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
    }),
    db.listing.findMany({
      where: { status: "PUBLISHED", price: { not: null } },
      select: { price: true, categoryId: true, province: true },
    }),
    db.listing.groupBy({
      by: ["categoryId"],
      where: { createdAt: { gte: sevenDaysAgo }, status: "PUBLISHED" },
      _count: true,
    }),
    db.listing.findMany({
      where: { status: "PUBLISHED", province: { not: null } },
      select: { province: true },
    }),
    db.buyRequest.groupBy({
      by: ["category"],
      where: { status: "ACTIVE" },
      _count: true,
    }),
  ]);

  // High-demand / low-supply categories
  const catMap = new Map(allCategories.map((c) => [c.id, c]));
  const demandByCatName = new Map<string, number>();
  buyRequestsByCat.forEach((r) => {
    if (r.category) {
      demandByCatName.set(
        r.category,
        (demandByCatName.get(r.category) ?? 0) + r._count,
      );
    }
  });

  const opportunityCats = allCategories
    .filter((c) => c._count.listings < 3)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      icon: c.icon,
      listings: c._count.listings,
      demand: demandByCatName.get(c.name) ?? 0,
    }));

  // Growing categories (new listings in last 7 days)
  const growingCats = newListingsByCat
    .map((g) => {
      const cat = g.categoryId ? catMap.get(g.categoryId) : null;
      return cat
        ? {
            name: cat.name,
            icon: cat.icon,
            newCount: g._count,
            totalCount: cat._count.listings,
          }
        : null;
    })
    .filter((x): x is { name: string; icon: string | null; newCount: number; totalCount: number } => x !== null)
    .sort((a, b) => b.newCount - a.newCount)
    .slice(0, 5);

  // Underserved regions
  const regionCounts: Record<string, number> = {};
  regions.forEach((r) => {
    const p = r.province ?? "نامشخص";
    regionCounts[p] = (regionCounts[p] ?? 0) + 1;
  });
  const underservedRegions = Object.entries(regionCounts)
    .filter(([_, count]) => count < 3)
    .slice(0, 5);

  // Price opportunities — listings below 70% of average
  const prices = allListings
    .map((l) => Number(l.price))
    .filter((p) => p > 0);
  const avgPrice = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0;

  const priceOpportunities = await db.listing.findMany({
    where: {
      status: "PUBLISHED",
      price: { not: null, lt: BigInt(Math.floor(avgPrice * 0.7)) },
    },
    orderBy: { price: "asc" },
    take: 5,
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true, icon: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Target className="h-6 w-6 text-[#F58220]" />
          رادار فرصت‌ها
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          فرصت‌های بازار — تقاضای بالا، عرضهٔ کم، مناطق دست‌نخورده و قیمت‌های مناسب
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* High demand / low supply */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">تقاضای بالا / عرضهٔ کم</h2>
          </div>
          <div className="space-y-2">
            {opportunityCats.length === 0 ? (
              <p className="rounded-xl bg-zinc-50 p-4 text-center text-xs text-zinc-400">
                همهٔ دسته‌ها عرضهٔ کافی دارند.
              </p>
            ) : (
              opportunityCats.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                >
                  <span className="text-lg">{c.icon ?? "📁"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-800">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {c.demand > 0
                        ? `${toFa(c.demand)} درخواست فعال`
                        : "بدون درخواست فعال"}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-red-600">
                      {toFa(c.listings)}
                    </p>
                    <p className="text-[10px] text-zinc-400">آگهی</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Growing categories */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <ArrowUp className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-black text-zinc-900">دسته‌های در حال رشد (۷ روز)</h2>
          </div>
          <div className="space-y-2">
            {growingCats.length === 0 ? (
              <p className="rounded-xl bg-zinc-50 p-4 text-center text-xs text-zinc-400">
                رشد قابل‌توجهی در این بازه ثبت نشده است.
              </p>
            ) : (
              growingCats.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                >
                  <span className="text-lg">{c.icon ?? "📁"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-800">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      از {toFa(c.totalCount)} آگهی کل
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
                      <ArrowUp className="h-3 w-3" />
                      {toFa(c.newCount)}
                    </p>
                    <p className="text-[10px] text-zinc-400">جدید</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Underserved regions */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-black text-zinc-900">مناطق دست‌نخورده</h2>
          </div>
          <div className="space-y-2">
            {underservedRegions.length === 0 ? (
              <p className="rounded-xl bg-zinc-50 p-4 text-center text-xs text-zinc-400">
                همهٔ استان‌ها به‌اندازه کافی پوشش دارند.
              </p>
            ) : (
              underservedRegions.map(([province, count]) => (
                <div
                  key={province}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                >
                  <MapPin className="h-4 w-4 text-violet-600" />
                  <span className="flex-1 text-sm font-bold text-zinc-800">
                    {province}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-violet-600">{toFa(count)}</p>
                    <p className="text-[10px] text-zinc-400">آگهی</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Price opportunities */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-black text-zinc-900">فرصت‌های قیمتی</h2>
          </div>
          <p className="mb-3 text-[11px] text-zinc-500">
            آگهی‌هایی با قیمت کمتر از ۷۰٪ میانگین بازار ({avgPrice > 0 ? formatCompactPrice(avgPrice) : "—"})
          </p>
          <div className="space-y-2">
            {priceOpportunities.length === 0 ? (
              <p className="rounded-xl bg-zinc-50 p-4 text-center text-xs text-zinc-400">
                فرصت قیمتی مشخصی یافت نشد.
              </p>
            ) : (
              priceOpportunities.map((l) => (
                <a
                  key={l.id}
                  href={`/listings/${l.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 transition hover:bg-emerald-100"
                >
                  <span className="text-lg">{l.category?.icon ?? "🚜"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-800">
                      {l.title}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {l.brand?.name ?? "—"} · {l.province ?? "—"}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-emerald-700">
                      {l.price ? formatCompactPrice(l.price) : "—"}
                    </p>
                    <p className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                      <ArrowDown className="h-2.5 w-2.5" />
                      زیر بازار
                    </p>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Strategic recommendation */}
      <div className="rounded-2xl border border-[#F58220]/30 bg-gradient-to-l from-[#F58220]/10 via-white to-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#F58220]" />
          <h2 className="text-lg font-black text-zinc-900">توصیهٔ استراتژیک</h2>
          <Sparkles className="h-4 w-4 text-[#F58220]" />
        </div>
        <div className="space-y-2 text-sm leading-7 text-zinc-700">
          {opportunityCats.length > 0 && (
            <p>
              • روی جذب فروشنده در دسته‌های{" "}
              <span className="font-bold text-[#F58220]">
                {opportunityCats.map((c) => c.name).join("، ")}
              </span>{" "}
              تمرکز کنید — عرضه کم است.
            </p>
          )}
          {growingCats.length > 0 && (
            <p>
              • دسته‌های{" "}
              <span className="font-bold text-emerald-700">
                {growingCats.map((c) => c.name).join("، ")}
              </span>{" "}
              در حال رشد هستند — می‌توانید کمپین تبلیغاتی روی آن‌ها اجرا کنید.
            </p>
          )}
          {underservedRegions.length > 0 && (
            <p>
              • استان‌های{" "}
              <span className="font-bold text-violet-700">
                {underservedRegions.map(([p]) => p).join("، ")}
              </span>{" "}
              کم‌پوشیده هستند — امکان توسعهٔ شبکهٔ دیلری وجود دارد.
            </p>
          )}
          {priceOpportunities.length > 0 && (
            <p>
              • {toFa(priceOpportunities.length)} آگهی زیر قیمت بازار موجود است —
              می‌توانید در خبرنامهٔ خریداران اطلاع‌رسانی کنید.
            </p>
          )}
          {opportunityCats.length === 0 &&
            growingCats.length === 0 &&
            underservedRegions.length === 0 &&
            priceOpportunities.length === 0 && (
              <p>• بازار در حالت تعادل است — فرصت فوری‌ای شناسایی نشد.</p>
            )}
        </div>
      </div>
    </div>
  );
}
