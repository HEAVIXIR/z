import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toFa, formatCompactPrice, faDate, PRICE_TYPE_LABELS } from "@/lib/format";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Megaphone,
  Eye,
  Star,
  Wallet,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/seller/dashboard");

  const [listings, offers, headerCats] = await Promise.all([
    db.listing.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true, icon: true } },
        _count: { select: { offers: true, favorites: true } },
      },
    }),
    db.listingOffer.findMany({
      where: { listing: { sellerId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { listing: { select: { title: true, slug: true } } },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
  ]);

  const totalViews = listings.reduce((sum, l) => sum + (l.viewCount ?? 0), 0);
  const totalOffers = offers.length;
  const totalFavorites = listings.reduce(
    (sum, l) => sum + (l._count?.favorites ?? 0),
    0,
  );
  const publishedCount = listings.filter((l) => l.status === "PUBLISHED").length;

  const stats = [
    {
      title: "آگهی‌های من",
      value: listings.length,
      icon: Megaphone,
      color: "text-[#F58220]",
      bg: "bg-[#F58220]/10",
    },
    {
      title: "منتشرشده",
      value: publishedCount,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "بازدید کل",
      value: totalViews,
      icon: Eye,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "پیشنهادهای خرید",
      value: totalOffers,
      icon: Wallet,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "علاقه‌مندی‌ها",
      value: totalFavorites,
      icon: Star,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
    },
    {
      title: "نرخ تبدیل",
      value: listings.length > 0 ? Math.round((totalOffers / listings.length) * 100) : 0,
      icon: TrendingUp,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#F58220]">
                SELLER DASHBOARD
              </span>
              <h1 className="mt-2 text-3xl font-black text-white lg:text-4xl">
                سلام، {user.firstName} {user.lastName}
              </h1>
              <p className="mt-1 text-sm text-white/55">
                {user.companyName ?? "فروشندهٔ هویکس"} — خلاصهٔ فعالیت شما
              </p>
            </div>
            <Link
              href="/listings/new"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
            >
              <Megaphone className="h-4 w-4" />
              ثبت آگهی جدید
            </Link>
          </div>

          {/* Stats grid */}
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div
                key={s.title}
                className="rounded-3xl border border-white/10 bg-[#111] p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/55">{s.title}</p>
                    <p className="mt-2 text-3xl font-black text-white">
                      {toFa(s.value)}
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

          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            {/* Listings */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-white">
                  آگهی‌های من ({toFa(listings.length)})
                </h2>
              </div>

              {listings.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#111] p-10 text-center">
                  <Megaphone className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-3 text-sm text-white/50">
                    هنوز آگهی ثبت نکرده‌اید.
                  </p>
                  <Link
                    href="/listings/new"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white"
                  >
                    ثبت اولین آگهی
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((l) => (
                    <Link
                      key={l.id}
                      href={`/listings/${l.slug}`}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111] p-4 transition hover:border-[#F58220]/40 hover:bg-[#141414]"
                    >
                      <span className="text-2xl">{l.category?.icon ?? "🚜"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {l.featured && (
                            <Star className="ml-1 inline h-3 w-3 fill-amber-500 text-amber-500" />
                          )}
                          {l.title}
                        </p>
                        <p className="text-[11px] text-white/45">
                          {l.brand?.name ?? "—"} · {l.category?.name ?? "—"}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-[#F58220]">
                          {l.price ? formatCompactPrice(l.price) : "توافقی"}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {PRICE_TYPE_LABELS[l.priceType] ?? l.priceType}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1 text-[10px] text-white/50">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {toFa(l.viewCount)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          {toFa(l._count.offers)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Offers */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-white">
                  آخرین پیشنهادها
                </h2>
              </div>

              {offers.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#111] p-10 text-center">
                  <MessageSquare className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-3 text-sm text-white/50">
                    هنوز پیشنهاد خریدی دریافت نکرده‌اید.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-2xl border border-white/10 bg-[#111] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F58220]">
                          {o.offerAmount ? formatCompactPrice(o.offerAmount) : "—"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            o.status === "PENDING"
                              ? "bg-amber-500/15 text-amber-400"
                              : o.status === "ACCEPTED"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : o.status === "REJECTED"
                                  ? "bg-red-500/15 text-red-400"
                                  : "bg-white/10 text-white/60"
                          }`}
                        >
                          {o.status === "PENDING"
                            ? "در انتظار"
                            : o.status === "ACCEPTED"
                              ? "پذیرفته شد"
                              : o.status === "REJECTED"
                                ? "رد شد"
                                : o.status}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs text-white/70">
                        {o.listing?.title ?? "—"}
                      </p>
                      <p className="mt-1 text-[10px] text-white/40">
                        {o.buyerName ?? "خریدار"} · {o.buyerPhone}
                      </p>
                      {o.message && (
                        <p className="mt-2 line-clamp-2 text-[11px] text-white/55">
                          «{o.message}»
                        </p>
                      )}
                      <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-white/35">
                        <Clock className="h-3 w-3" />
                        {faDate(o.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/seller"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#F58220]"
            >
              <ArrowLeft className="h-4 w-4 rotate-180" />
              بازگشت به مرکز فروشندگان
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
