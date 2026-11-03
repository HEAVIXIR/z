import Link from "next/link";
import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import {
  getHotCategories,
  getHotProvinces,
} from "@/lib/market-heatmap";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Flame, TrendingUp, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

/* ============================================================
   /market-insights — PUBLIC market insights page.

   A simplified public version of the admin heatmap: shows the
   top hot categories + top hot provinces on the live market.
   No matrix (the matrix needs the wider admin layout) — just
   two ranked lists with bar charts.
   ============================================================ */

export default async function MarketInsightsPage() {
  // Load all CATALOG categories for the header nav.
  const allCategories = await db.category.findMany({
    where: { active: true, layer: "CATALOG" },
    orderBy: [{ sortOrder: "asc" }],
    include: { _count: { select: { listings: { where: { status: "PUBLISHED" } } } } },
  });
  const categories = allCategories.map((c) => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    slug: c.slug,
    icon: c.icon,
    imageUrl: c.imageUrl,
    featured: c.featured,
    parentId: c.parentId,
    listingCount: c._count.listings,
  }));

  const siteSettings = await db.siteSettings.findUnique({ where: { id: "main" } });

  // Pull hot categories + provinces for the last 30 days.
  const [hotCats, hotProvs] = await Promise.all([
    getHotCategories(null, 30),
    getHotProvinces(null, 30),
  ]);

  const topCats = hotCats.slice(0, 10);
  const topProvs = hotProvs.slice(0, 10);
  const maxCatScore = topCats[0]?.heatScore ?? 1;
  const maxProvScore = topProvs[0]?.heatScore ?? 1;

  return (
    <div
      dir="rtl"
      className="site-theme flex min-h-screen flex-col bg-[#0b0b0b] text-white"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,130,32,0.08), transparent 70%)",
      }}
    >
      <Header categories={categories} />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
          {/* Header */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-4 py-1.5 text-xs font-bold text-[#F58220]">
              <Flame className="h-3.5 w-3.5" />
              MARKET INSIGHTS
            </span>
            <h1 className="mt-4 text-4xl font-black text-white lg:text-5xl">
              نقشه بازار هویکس
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/55">
              تحلیل زنده بازار ماشین‌آلات صنعتی ایران — داغ‌ترین دسته‌ها و
              فعال‌ترین استان‌ها در ۳۰ روز اخیر، بر اساس آگهی‌ها، جستجوها و
              بازدیدهای کاربران هویکس.
            </p>
          </div>

          {/* Two columns */}
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* Hot categories */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-5 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#F58220]" />
                <h2 className="text-lg font-black text-white">داغ‌ترین دسته‌ها</h2>
              </div>
              {topCats.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/40">
                  هنوز داده‌ای برای نمایش وجود ندارد.
                </p>
              ) : (
                <ul className="space-y-3">
                  {topCats.map((c, idx) => (
                    <li key={c.category.id}>
                      <Link
                        href={`/categories/${c.category.slug}`}
                        className="group block"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F58220]/15 text-xs font-black text-[#F58220]">
                            {toFa(idx + 1)}
                          </span>
                          <span className="text-lg">{c.category.icon ?? "📁"}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-bold text-white transition group-hover:text-[#F58220]">
                            {c.category.name}
                          </span>
                          <span className="shrink-0 text-xs font-bold text-emerald-400">
                            {toFa(Math.round(c.heatScore * 100))}
                          </span>
                        </div>
                        <div className="mt-1.5 mr-10 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-[#F58220] to-amber-400"
                            style={{ width: `${(c.heatScore / maxCatScore) * 100}%` }}
                          />
                        </div>
                        <div className="mt-1 mr-10 flex items-center gap-3 text-[10px] text-white/40">
                          <span>{toFa(c.listingCount)} آگهی</span>
                          <span>·</span>
                          <span>{toFa(c.searchCount)} جستجو</span>
                          <span>·</span>
                          <span>{toFa(c.viewCount)} بازدید</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Hot provinces */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-5 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#F58220]" />
                <h2 className="text-lg font-black text-white">فعال‌ترین استان‌ها</h2>
              </div>
              {topProvs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/40">
                  هنوز داده‌ای برای نمایش وجود ندارد.
                </p>
              ) : (
                <ul className="space-y-3">
                  {topProvs.map((p, idx) => (
                    <li key={p.province.id}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F58220]/15 text-xs font-black text-[#F58220]">
                          {toFa(idx + 1)}
                        </span>
                        <MapPin className="h-4 w-4 text-white/40" />
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                          {p.province.name}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-emerald-400">
                          {toFa(Math.round(p.heatScore * 100))}
                        </span>
                      </div>
                      <div className="mt-1.5 mr-10 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400"
                          style={{ width: `${(p.heatScore / maxProvScore) * 100}%` }}
                        />
                      </div>
                      <div className="mt-1 mr-10 flex items-center gap-3 text-[10px] text-white/40">
                        <span>{toFa(p.listingCount)} آگهی</span>
                        <span>·</span>
                        <span>{toFa(p.viewCount)} بازدید</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-3xl border border-[#F58220]/30 bg-gradient-to-l from-[#F58220]/10 via-transparent to-transparent p-8 text-center">
            <h3 className="text-2xl font-black text-white">
              دنبال ماشین‌آلات خاصی می‌گردید؟
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">
              از میان هزاران آگهی فعال در سراسر کشور، دستگاه مورد نظر خود را پیدا کنید.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/listings"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#F58220] px-8 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
              >
                مشاهده آگهی‌ها
              </Link>
              <Link
                href="/listings/new"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-8 text-sm font-bold text-white transition hover:border-[#F58220]/40 hover:bg-white/10"
              >
                ثبت آگهی
              </Link>
            </div>
          </div>

          {/* Footer note about methodology */}
          <p className="mt-8 text-center text-[11px] text-white/30">
            امتیاز هر دسته/استان بر اساس ترکیب وزن‌دار آگهی، جستجو و بازدید
            محاسبه می‌شود. داده‌ها در ۳۰ روز اخیر (پیش‌فرض) را پوشش می‌دهد.
          </p>
        </section>
      </main>

      <Footer
        settings={
          siteSettings
            ? {
                about: siteSettings.about,
                phone: siteSettings.phone,
                email: siteSettings.email,
                address: siteSettings.address,
                workingHours: siteSettings.workingHours,
                copyright: siteSettings.copyright,
                newsletterEnabled: siteSettings.newsletterEnabled,
              }
            : null
        }
      />
    </div>
  );
}
