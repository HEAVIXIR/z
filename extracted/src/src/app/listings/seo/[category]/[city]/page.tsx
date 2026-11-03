import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { toFa, formatCompactPrice } from "@/lib/format";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ListingCard from "@/components/listings/ListingCard";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  FolderTree,
  Search,
  Building2,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ============================================================
   Programmatic SEO landing pages.
   /listings/seo/[category]/[city]
   - decodeURIComponent both params
   - find matching category (by slug, then by name contains)
   - find listings in that category + city
   - show category description, listings grid, related searches
   - generate SEO meta tags
   ============================================================ */

type Props = {
  params: Promise<{ category: string; city: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, city } = await params;
  const categoryDec = decodeURIComponent(category);
  const cityDec = decodeURIComponent(city);
  const title = `${categoryDec} در ${cityDec} | هویکس`;
  const description = `خرید و فروش ${categoryDec} نو و کارکرده در ${cityDec}. مشاهدهٔ آگهی‌های ${categoryDec} با قیمت به‌روز، کارشناسی هویکس و خدمات پس از فروش.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fa_IR",
    },
    keywords: [
      categoryDec,
      cityDec,
      `${categoryDec} ${cityDec}`,
      `خرید ${categoryDec}`,
      `قیمت ${categoryDec}`,
      "ماشین‌آلات سنگین",
      "هویکس",
    ],
  };
}

export default async function SeoLandingPage({ params }: Props) {
  const { category, city } = await params;
  const categoryRaw = decodeURIComponent(category);
  const cityRaw = decodeURIComponent(city);

  const [headerCats, cat] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
    db.category.findFirst({
      where: {
        OR: [
          { slug: categoryRaw },
          { name: { contains: categoryRaw } },
          { nameEn: { contains: categoryRaw } },
        ],
      },
      include: {
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
      },
    }),
  ]);

  /* Build where: city match + (category match OR category children) */
  const where: any = {
    status: "PUBLISHED",
    city: { contains: cityRaw },
  };

  if (cat) {
    const children = await db.category.findMany({
      where: { parentId: cat.id, active: true },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);
    where.OR = [
      { categoryId: cat.id },
      ...(childIds.length > 0 ? [{ categoryId: { in: childIds } }] : []),
    ];
  } else {
    // No exact category match — fall back to title contains
    where.OR = [
      { title: { contains: categoryRaw } },
      { description: { contains: categoryRaw } },
      { shortDesc: { contains: categoryRaw } },
    ];
  }

  const [listings, totalCount] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: [{ featured: "desc" }, { publishedAt: { sort: "desc", nulls: "last" as const } }],
      take: 24,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true, icon: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
      },
    }),
    db.listing.count({ where }),
  ]);

  const categoryDisplay = cat?.name ?? categoryRaw;
  const categoryDescription =
    cat?.description ??
    `${categoryDisplay} یکی از دسته‌های پرتقاضای ماشین‌آلات صنعتی در بازار ایران است. در هویکس می‌توانید انواع ${categoryDisplay} نو و کارکرده را در ${cityRaw} با قیمت‌های به‌روز و کارشناسی رسمی پیدا کنید.`;

  /* Related searches — combine category with other major cities */
  const relatedCities = [
    "تهران",
    "اصفهان",
    "شیراز",
    "مشهد",
    "کرج",
    "اهواز",
    "تبریز",
    "قم",
  ].filter((c) => c !== cityRaw);

  const relatedSearches = [
    ...relatedCities.slice(0, 6).map((c) => ({
      label: `${categoryDisplay} در ${c}`,
      href: `/listings/seo/${encodeURIComponent(categoryDisplay)}/${encodeURIComponent(c)}`,
    })),
    {
      label: `اجاره ${categoryDisplay} در ${cityRaw}`,
      href: `/listings?type=RENT&q=${encodeURIComponent(categoryDisplay)} ${encodeURIComponent(cityRaw)}`,
    },
    {
      label: `قیمت ${categoryDisplay} در ${cityRaw}`,
      href: `/listings?q=${encodeURIComponent(`قیمت ${categoryDisplay} ${cityRaw}`)}`,
    },
    {
      label: `${categoryDisplay} نو در ${cityRaw}`,
      href: `/listings?q=${encodeURIComponent(categoryDisplay)}&condition=NEW`,
    },
  ];

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">
              خانه
            </Link>
            <ArrowRight className="h-3 w-3" />
            <Link href="/listings" className="hover:text-[#F58220]">
              آگهی‌ها
            </Link>
            {cat && (
              <>
                <ArrowRight className="h-3 w-3" />
                <Link
                  href={`/categories/${cat.slug}`}
                  className="hover:text-[#F58220]"
                >
                  {cat.name}
                </Link>
              </>
            )}
            <ArrowRight className="h-3 w-3" />
            <span className="truncate text-white/70">{cityRaw}</span>
          </nav>

          {/* Hero / category description */}
          <div className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-l from-[#F58220]/10 via-[#141414] to-[#141414] p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F58220]/15 text-4xl">
                {cat?.icon ?? <FolderTree className="h-7 w-7 text-[#F58220]" />}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black leading-tight text-white lg:text-3xl">
                  {categoryDisplay} در {cityRaw}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">
                  {categoryDescription}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
                    {cityRaw}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-[#F58220]" />
                    {toFa(totalCount)} آگهی فعال
                  </span>
                  {cat && (
                    <span className="inline-flex items-center gap-1">
                      <FolderTree className="h-3.5 w-3.5 text-[#F58220]" />
                      دسته: {cat.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Listings grid */}
          <section className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">
                آگهی‌های {categoryDisplay} در {cityRaw}
              </h2>
              <Link
                href={`/listings?${cat ? `category=${cat.slug}&` : ""}q=${encodeURIComponent(cityRaw)}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#F58220] hover:underline"
              >
                مشاهدهٔ همه
                <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>

            {listings.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-white/20" />
                <p className="text-sm text-white/50">
                  در حال حاضر آگهی فعالی برای {categoryDisplay} در {cityRaw} وجود ندارد.
                </p>
                <Link
                  href="/requests/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F58220] px-5 py-2.5 text-xs font-bold text-white"
                >
                  ثبت درخواست خرید
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {listings.map((l) => (
                  <ListingCard
                    key={l.id}
                    l={{
                      id: l.id,
                      slug: l.slug,
                      title: l.title,
                      shortDesc: l.shortDesc,
                      description: l.description,
                      brandName: l.brand?.name ?? null,
                      price: l.price ? (l.price as any) : null,
                      priceType: l.priceType,
                      image: l.images[0]?.url ?? null,
                      icon: l.category?.icon ?? null,
                      year: l.year,
                      city: l.city,
                      province: l.province,
                      workingHours: l.workingHours,
                      condition: l.condition,
                      featured: l.featured,
                      viewCount: l.viewCount,
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Related searches */}
          <section className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
              <TrendingUp className="h-5 w-5 text-[#F58220]" />
              جستجوهای مرتبط
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedSearches.map((r) => (
                <Link
                  key={r.href + r.label}
                  href={r.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#111] px-4 py-2 text-xs text-white/70 transition hover:border-[#F58220]/40 hover:bg-[#F58220]/10 hover:text-[#F58220]"
                >
                  <Search className="h-3 w-3" />
                  {r.label}
                </Link>
              ))}
            </div>
          </section>

          {/* SEO long-form description */}
          <section className="mb-12 rounded-3xl border border-white/10 bg-[#111] p-6">
            <h2 className="mb-3 text-lg font-black text-white">
              دربارهٔ {categoryDisplay} در {cityRaw}
            </h2>
            <div className="space-y-3 text-sm leading-8 text-white/60">
              <p>
                بازار {categoryDisplay} در {cityRaw} یکی از فعال‌ترین بخش‌های
                خرید و فروش ماشین‌آلات صنعتی در ایران است. هویکس با ارائهٔ
                آگهی‌های تأییدشده، کارشناسی رسمی و خدمات پس از فروش، خرید و
                فروش {categoryDisplay} در {cityRaw} را امن و شفاف می‌کند.
              </p>
              <p>
                در هویکس می‌توانید انواع {categoryDisplay} نو، کارکرده و
                بازسازی‌شده را با قیمت‌های واقعی بازار مشاهده کنید. هر آگهی با
                مشخصات فنی کامل، تصاویر واقعی و نمرهٔ کارشناسی هویکس ارائه
                می‌شود تا با خیال راحت تصمیم بگیرید.
              </p>
              <p>
                علاوه بر خرید، خدمات اجاره {categoryDisplay} در {cityRaw}،
                حمل و نقل، قطعات یدکی و تعمیرات تخصصی نیز از طریق شبکهٔ
                شرکای هویکس در دسترس است.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer settings={null} />
    </div>
  );
}
