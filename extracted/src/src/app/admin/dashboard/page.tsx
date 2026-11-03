import Link from "next/link";
import { db } from "@/lib/db";
import { toFa, timeAgo, formatCompactPrice } from "@/lib/format";
import {
  Megaphone,
  Building2,
  FolderTree,
  Eye,
  Star,
  TrendingUp,
  Crown,
  Activity,
  Flag,
  BookMarked,
  Gavel,
  PackageSearch,
  Users,
  Settings,
  Sparkles,
  Brain,
  HeartPulse,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ============================================================
   /admin/dashboard — HEAVIX Command Center
   Quick links + system health overview + recent activity.
   ============================================================ */

export default async function DashboardPage() {
  const [
    totalListings,
    publishedListings,
    featuredListings,
    totalBrands,
    totalCategories,
    totalViews,
    recentListings,
    recentRequests,
    recentRFQs,
    recentOffers,
    featureFlags,
    aiStats,
    catalogIssues,
  ] = await Promise.all([
    db.listing.count(),
    db.listing.count({ where: { status: "PUBLISHED" } }),
    db.listing.count({ where: { status: "PUBLISHED", featured: true } }),
    db.brand.count(),
    db.category.count({ where: { parentId: null } }),
    db.listing.aggregate({ _sum: { viewCount: true } }),
    db.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true, icon: true } },
      },
    }),
    db.buyRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        city: true,
        createdAt: true,
      },
    }),
    db.rFQ.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        machineType: true,
        status: true,
        createdAt: true,
      },
    }),
    db.listingOffer.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { listing: { select: { title: true, slug: true } } },
    }),
    db.featureFlag.findMany({ orderBy: { createdAt: "asc" } }),
    db.aIGatewayLog.aggregate({
      _count: true,
      _sum: { latencyMs: true },
      _avg: { latencyMs: true },
    }),
    Promise.all([
      db.listing.count({ where: { status: "PUBLISHED", images: { none: {} } } }),
      db.listing.count({ where: { status: "PUBLISHED", price: null } }),
      db.listing.count({ where: { status: "PUBLISHED", brandId: null } }),
      db.listing.count({ where: { status: "PUBLISHED", categoryId: null } }),
      db.listing.count({
        where: {
          status: "PUBLISHED",
          OR: [{ description: null }, { description: "" }],
        },
      }),
    ]),
  ]);

  // AI gateway success/fail breakdown
  const [aiSuccess, aiFailed] = await Promise.all([
    db.aIGatewayLog.count({ where: { success: true } }),
    db.aIGatewayLog.count({ where: { success: false } }),
  ]);

  // Catalog health score (weighted formula)
  const weights = { high: 12, medium: 6, low: 3 };
  const issues = [
    { count: catalogIssues[0], severity: "high" as const }, // missing image
    { count: catalogIssues[1], severity: "medium" as const }, // missing price
    { count: catalogIssues[2], severity: "medium" as const }, // missing brand
    { count: catalogIssues[3], severity: "high" as const }, // missing category
    { count: catalogIssues[4], severity: "medium" as const }, // missing desc
  ];
  const totalPenalty = issues.reduce(
    (sum, i) => sum + Math.min(i.count, 10) * weights[i.severity],
    0,
  );
  const healthScore = Math.max(0, Math.min(100, 100 - totalPenalty));
  const healthColor =
    healthScore >= 85
      ? "text-emerald-600"
      : healthScore >= 65
        ? "text-amber-600"
        : "text-red-600";
  const healthBg =
    healthScore >= 85
      ? "bg-emerald-100"
      : healthScore >= 65
        ? "bg-amber-100"
        : "bg-red-100";
  const healthLabel =
    healthScore >= 85 ? "عالی" : healthScore >= 65 ? "متوسط" : "ضعیف";

  const stats = [
    {
      title: "کل آگهی‌ها",
      value: totalListings,
      icon: Megaphone,
      color: "text-[#F58220]",
      bg: "bg-[#F58220]/10",
    },
    {
      title: "آگهی‌های منتشرشده",
      value: publishedListings,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "آگهی‌های ویژه",
      value: featuredListings,
      icon: Crown,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      title: "برندها",
      value: totalBrands,
      icon: Building2,
      color: "text-violet-600",
      bg: "bg-violet-100",
    },
    {
      title: "دسته‌بندی‌ها",
      value: totalCategories,
      icon: FolderTree,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "کل بازدیدها",
      value: totalViews._sum.viewCount ?? 0,
      icon: Eye,
      color: "text-pink-600",
      bg: "bg-pink-100",
    },
  ];

  const quickLinks = [
    { title: "آگهی‌ها", href: "/admin/listings", icon: Megaphone, color: "text-[#F58220]" },
    { title: "برندها", href: "/admin/taxonomy/brands", icon: Building2, color: "text-violet-600" },
    { title: "دسته‌بندی‌ها", href: "/admin/categories", icon: FolderTree, color: "text-blue-600" },
    { title: "درخواست‌های خرید", href: "/admin/requests", icon: PackageSearch, color: "text-emerald-600" },
    { title: "پیشنهادها", href: "/admin/offers", icon: Users, color: "text-pink-600" },
    { title: "RFQ (درخواست خرید B2B)", href: "/admin/rfq", icon: PackageSearch, color: "text-teal-600" },
    { title: "مزایده", href: "/admin/auctions", icon: Gavel, color: "text-amber-600" },
    { title: "پرچم‌های ویژگی", href: "/admin/feature-flags", icon: Flag, color: "text-[#F58220]" },
    { title: "دیکشنری صنعتی", href: "/admin/dictionary", icon: BookMarked, color: "text-indigo-600" },
    { title: "سیگنال‌های تقاضا", href: "/admin/demand-signals", icon: TrendingUp, color: "text-cyan-600" },
    { title: "دروازه هوش مصنوعی", href: "/admin/ai-gateway", icon: Brain, color: "text-rose-600" },
    { title: "تحلیل‌گر بازار", href: "/admin/ai-analyst", icon: Sparkles, color: "text-fuchsia-600" },
    { title: "سلامت کاتالوگ", href: "/admin/catalog-health", icon: HeartPulse, color: "text-red-600" },
    { title: "موتور رشد", href: "/admin/growth-engine", icon: TrendingUp, color: "text-emerald-600" },
    { title: "فازهای راه‌اندازی", href: "/admin/launch-phases", icon: Activity, color: "text-blue-600" },
    { title: "کاربران", href: "/admin/users", icon: Users, color: "text-zinc-600" },
    { title: "مقالات", href: "/admin/articles", icon: BookMarked, color: "text-purple-600" },
    { title: "تنظیمات", href: "/admin/settings", icon: Settings, color: "text-zinc-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-zinc-900">مرکز فرماندهی</h1>
        <p className="mt-2 text-sm text-zinc-500">
          نمای کلی پلتفرم هویکس — سلامت سیستم، دسترسی سریع و فعالیت‌های اخیر
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">{s.title}</p>
                <p className="mt-2 text-3xl font-black text-zinc-900">
                  {toFa(s.value.toLocaleString("en-US"))}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}
              >
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Health */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Catalog health */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-black text-zinc-900">
              <HeartPulse className="h-5 w-5 text-red-600" />
              سلامت کاتالوگ
            </h2>
            <Link
              href="/admin/catalog-health"
              className="text-[11px] font-bold text-[#F58220] hover:underline"
            >
              جزئیات ←
            </Link>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-black ${healthColor}`}>
              {toFa(healthScore)}
            </span>
            <span className="mb-1 text-xs text-zinc-500">از {toFa(100)}</span>
          </div>
          <span
            className={`mt-3 inline-flex items-center gap-1 rounded-full ${healthBg} px-3 py-1 text-xs font-bold ${healthColor}`}
          >
            <CheckCircle2 className="h-3 w-3" />
            {healthLabel}
          </span>
          <div className="mt-4 space-y-1.5 text-[11px] text-zinc-500">
            <Row label="بدون تصویر" value={catalogIssues[0]} />
            <Row label="بدون قیمت" value={catalogIssues[1]} />
            <Row label="بدون برند" value={catalogIssues[2]} />
            <Row label="بدون دسته‌بندی" value={catalogIssues[3]} />
          </div>
        </div>

        {/* Feature flags */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-black text-zinc-900">
              <Flag className="h-5 w-5 text-[#F58220]" />
              پرچم‌های ویژگی
            </h2>
            <Link
              href="/admin/feature-flags"
              className="text-[11px] font-bold text-[#F58220] hover:underline"
            >
              مدیریت ←
            </Link>
          </div>
          {featureFlags.length === 0 ? (
            <p className="text-xs text-zinc-400">
              هنوز پرچمی ثبت نشده. به صفحه پرچم‌ها بروید تا پیش‌فرض‌ها ساخته شوند.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-emerald-600">
                  {toFa(featureFlags.filter((f) => f.enabled).length)}
                </span>
                <span className="mb-1 text-xs text-zinc-500">
                  فعال از {toFa(featureFlags.length)}
                </span>
              </div>
              <div className="mt-4 space-y-1.5">
                {featureFlags.slice(0, 5).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="truncate text-zinc-600">{f.label}</span>
                    <span
                      className={`flex items-center gap-1 font-bold ${
                        f.enabled ? "text-emerald-600" : "text-zinc-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          f.enabled ? "bg-emerald-500" : "bg-zinc-300"
                        }`}
                      />
                      {f.enabled ? "فعال" : "غیرفعال"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI Gateway */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-black text-zinc-900">
              <Brain className="h-5 w-5 text-rose-600" />
              دروازه هوش مصنوعی
            </h2>
            <Link
              href="/admin/ai-gateway"
              className="text-[11px] font-bold text-[#F58220] hover:underline"
            >
              جزئیات ←
            </Link>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-zinc-900">
              {toFa(aiStats._count)}
            </span>
            <span className="mb-1 text-xs text-zinc-500">کل درخواست</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg bg-emerald-50 p-2">
              <p className="text-base font-black text-emerald-600">
                {toFa(aiSuccess)}
              </p>
              <p className="text-zinc-500">موفق</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-base font-black text-red-600">{toFa(aiFailed)}</p>
              <p className="text-zinc-500">ناموفق</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2">
              <p className="text-base font-black text-amber-600">
                {aiStats._avg.latencyMs
                  ? toFa(Math.round(aiStats._avg.latencyMs))
                  : toFa(0)}
              </p>
              <p className="text-zinc-500">ms میانگین</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">دسترسی سریع</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickLinks.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center transition hover:border-[#F58220] hover:bg-[#F58220]/5"
            >
              <a.icon className={`h-5 w-5 ${a.color}`} />
              <span className="text-[11px] font-bold leading-tight text-zinc-700 transition group-hover:text-[#F58220]">
                {a.title}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent listings */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black text-zinc-900">
              <Megaphone className="h-5 w-5 text-[#F58220]" />
              آخرین آگهی‌ها
            </h2>
            <Link
              href="/admin/listings"
              className="text-xs font-bold text-[#F58220] hover:underline"
            >
              مشاهده همه ←
            </Link>
          </div>
          <div className="space-y-3">
            {recentListings.map((l) => (
              <Link
                key={l.id}
                href={`/admin/listings`}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 transition hover:border-[#F58220]/40"
              >
                <span className="text-xl">{l.category?.icon ?? "🚜"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-800">
                    {l.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {l.brand?.name ?? "—"} · {timeAgo(l.createdAt)}
                  </p>
                </div>
                {l.featured && (
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                )}
                <span className="text-[10px] font-bold text-zinc-400">
                  {toFa(l.viewCount)} بازدید
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* RFQs + requests + offers */}
        <div className="space-y-5">
          {/* Recent RFQs */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black text-zinc-900">
                <PackageSearch className="h-4 w-4 text-teal-600" />
                آخرین RFQها
              </h3>
              <Link
                href="/admin/rfq"
                className="text-[11px] font-bold text-[#F58220] hover:underline"
              >
                همه ←
              </Link>
            </div>
            <div className="space-y-2">
              {recentRFQs.length === 0 ? (
                <p className="text-xs text-zinc-400">RFQی ثبت نشده.</p>
              ) : (
                recentRFQs.map((r) => (
                  <Link
                    key={r.id}
                    href="/admin/rfq"
                    className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-2 transition hover:border-[#F58220]/40"
                  >
                    <PackageSearch className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700">
                      {r.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        r.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-700"
                          : r.status === "AWARDED"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="shrink-0 text-[9px] text-zinc-400">
                      {timeAgo(r.createdAt)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent buy requests */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black text-zinc-900">
                <Users className="h-4 w-4 text-emerald-600" />
                درخواست‌های خرید
              </h3>
              <Link
                href="/admin/requests"
                className="text-[11px] font-bold text-[#F58220] hover:underline"
              >
                همه ←
              </Link>
            </div>
            <div className="space-y-2">
              {recentRequests.length === 0 ? (
                <p className="text-xs text-zinc-400">درخواستی ثبت نشده.</p>
              ) : (
                recentRequests.map((r) => (
                  <Link
                    key={r.id}
                    href="/admin/requests"
                    className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-2 transition hover:border-[#F58220]/40"
                  >
                    <Users className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700">
                      {r.title}
                    </p>
                    {r.city && (
                      <span className="shrink-0 text-[9px] text-zinc-400">
                        {r.city}
                      </span>
                    )}
                    <span className="shrink-0 text-[9px] text-zinc-400">
                      {timeAgo(r.createdAt)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent offers */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black text-zinc-900">
                <TrendingUp className="h-4 w-4 text-pink-600" />
                آخرین پیشنهادها
              </h3>
              <Link
                href="/admin/offers"
                className="text-[11px] font-bold text-[#F58220] hover:underline"
              >
                همه ←
              </Link>
            </div>
            <div className="space-y-2">
              {recentOffers.length === 0 ? (
                <p className="text-xs text-zinc-400">پیشنهادی ثبت نشده.</p>
              ) : (
                recentOffers.map((o) => (
                  <Link
                    key={o.id}
                    href="/admin/offers"
                    className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-2 transition hover:border-[#F58220]/40"
                  >
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-pink-600" />
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700">
                      {o.listing?.title ?? "—"}
                    </p>
                    <span className="shrink-0 text-[9px] font-bold text-[#F58220]">
                      {formatCompactPrice(o.offerAmount)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span
        className={`font-bold ${
          value === 0
            ? "text-emerald-600"
            : value < 5
              ? "text-amber-600"
              : "text-red-600"
        }`}
      >
        {toFa(value)}
      </span>
    </div>
  );
}
