import Link from "next/link";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BrandLiveSearch from "./BrandLiveSearch";
import {
  Building2,
  MapPin,
  ShieldCheck,
  Star,
  ArrowLeft,
  Search,
} from "lucide-react";
import { toFa } from "@/lib/format";
import {
  BRAND_TYPE_LABELS,
  VERIFICATION_LABELS,
  verificationBadgeClass,
} from "@/lib/brand-labels";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

type BrandRow = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  country: string | null;
  logoUrl: string | null;
  type: string | null;
  status: string;
  verification: string;
  featured: boolean;
  listingsCount: number;
};

export default async function BrandsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const industryFilter =
    typeof sp.industry === "string" ? sp.industry : undefined;
  const countryFilter =
    typeof sp.country === "string" ? sp.country : undefined;
  const typeFilter = typeof sp.type === "string" ? sp.type : undefined;

  const where: any = {};
  if (industryFilter) where.industries = { some: { industry: industryFilter } };
  if (countryFilter) where.country = countryFilter;
  if (typeFilter) where.type = typeFilter;

  const [brands, industries, countries, allTypes] = await Promise.all([
    db.brand.findMany({
      where,
      take: PAGE_SIZE,
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        nameEn: true,
        country: true,
        logoUrl: true,
        type: true,
        status: true,
        verification: true,
        featured: true,
        _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
      },
    }),
    db.industry.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      select: { key: true, nameFa: true },
    }),
    db.brand.findMany({
      where: { country: { not: null } },
      distinct: ["country"],
      select: { country: true },
      orderBy: { country: "asc" },
    }),
    db.brand.findMany({
      where: { type: { not: null } },
      distinct: ["type"],
      select: { type: true },
      orderBy: { type: "asc" },
    }),
  ]);

  const brandRows: BrandRow[] = brands.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    nameEn: b.nameEn,
    country: b.country,
    logoUrl: b.logoUrl,
    type: b.type,
    status: b.status,
    verification: b.verification,
    featured: b.featured,
    listingsCount: b._count.listings,
  }));

  const countryList = countries
    .map((c) => c.country)
    .filter((c): c is string => Boolean(c));
  const typeList = allTypes
    .map((t) => t.type)
    .filter((t): t is string => Boolean(t));

  // Featured first is already enforced by orderBy — just split for the heading.
  const featuredBrands = brandRows.filter((b) => b.featured).slice(0, 8);

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#111] to-[#0b0b0b]">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 right-1/2 h-72 w-[600px] translate-x-1/2 rounded-full bg-[#F58220]/10 blur-[120px]"
          />
          <div className="mx-auto max-w-[1400px] px-6 py-14 lg:px-10 lg:py-20">
            <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
              <Link href="/" className="hover:text-[#F58220]">
                خانه
              </Link>
              <ArrowLeft className="h-3 w-3" />
              <span className="text-white/60">دایرکتوری برندها</span>
            </nav>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#F58220]/20 bg-[#F58220]/[0.06] px-3 py-1 text-[11px] font-bold tracking-wider text-[#F58220]">
              <Star className="h-3 w-3 fill-current" />
              HEAVIX BRAND DIRECTORY
            </span>
            <h1 className="text-4xl font-black leading-tight text-white lg:text-5xl">
              دایرکتوری برندهای صنعتی هویکس
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
              مرجع کامل برندهای ماشین‌آلات سنگین، قطعات و تجهیزات صنعتی. جستجوی
              هوشمند با پشتیبانی از نام‌های فارسی، انگلیسی و نام‌های جایگزین
              ( alias ) — نتیجهٔ دقیق حتی با املای متفاوت.
            </p>

            {/* Live search box (client component) */}
            <div className="mt-8 max-w-2xl">
              <BrandLiveSearch />
            </div>

            {/* Quick stats */}
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <p className="text-2xl font-black text-[#F58220]">
                  {toFa(brandRows.length)}
                </p>
                <p className="text-[11px] text-white/40">برند فعال</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#F58220]">
                  {toFa(industries.length)}
                </p>
                <p className="text-[11px] text-white/40">صنعت</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#F58220]">
                  {toFa(countryList.length)}
                </p>
                <p className="text-[11px] text-white/40">کشور</p>
              </div>
              {featuredBrands.length > 0 && (
                <div>
                  <p className="text-2xl font-black text-[#F58220]">
                    {toFa(featuredBrands.length)}
                  </p>
                  <p className="text-[11px] text-white/40">برند ویژه</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
          {/* Filters */}
          <div className="mb-8 space-y-4 rounded-3xl border border-white/10 bg-[#111] p-5">
            {/* Industry filter */}
            {industries.length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                  صنعت
                </h3>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={!industryFilter}
                    href="/brands"
                    preserve={{ country: countryFilter, type: typeFilter }}
                    label="همه"
                  />
                  {industries.map((i) => (
                    <FilterChip
                      key={i.key}
                      active={industryFilter === i.key}
                      href="/brands"
                      params={{ industry: i.key }}
                      preserve={{ country: countryFilter, type: typeFilter }}
                      label={i.nameFa}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Country filter */}
            {countryList.length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                  کشور
                </h3>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={!countryFilter}
                    href="/brands"
                    preserve={{ industry: industryFilter, type: typeFilter }}
                    label="همه"
                  />
                  {countryList.map((c) => (
                    <FilterChip
                      key={c}
                      active={countryFilter === c}
                      href="/brands"
                      params={{ country: c }}
                      preserve={{ industry: industryFilter, type: typeFilter }}
                      label={c}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Type filter */}
            {typeList.length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                  نوع برند
                </h3>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={!typeFilter}
                    href="/brands"
                    preserve={{ industry: industryFilter, country: countryFilter }}
                    label="همه"
                  />
                  {typeList.map((t) => (
                    <FilterChip
                      key={t}
                      active={typeFilter === t}
                      href="/brands"
                      params={{ type: t }}
                      preserve={{
                        industry: industryFilter,
                        country: countryFilter,
                      }}
                      label={BRAND_TYPE_LABELS[t] ?? t}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active filter notice + count */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/50">
              <span className="font-bold text-white">{toFa(brandRows.length)}</span>{" "}
              برند یافت شد
              {(industryFilter || countryFilter || typeFilter) && (
                <Link
                  href="/brands"
                  className="mr-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/60 transition hover:border-[#F58220]/30 hover:text-[#F58220]"
                >
                  حذف فیلترها
                  <ArrowLeft className="h-3 w-3" />
                </Link>
              )}
            </p>
          </div>

          {/* Brand grid */}
          {brandRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#111] p-12 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-white/30" />
              <p className="text-sm text-white/40">
                برندی با این فیلترها یافت نشد. فیلترها را تغییر دهید یا همه
                برندها را مشاهده کنید.
              </p>
              <Link
                href="/brands"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#F58220]"
              >
                مشاهده همه برندها
                <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {brandRows.map((b) => (
                <BrandCard key={b.id} b={b} />
              ))}
            </div>
          )}

          {/* Show-more notice (cap reached) */}
          {brandRows.length === PAGE_SIZE && (
            <p className="mt-6 text-center text-xs text-white/35">
              نمایش {toFa(PAGE_SIZE)} برند اول. برای نتایج بیشتر از جستجوی بالا
              استفاده کنید.
            </p>
          )}
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}

/* ── Brand card (server-rendered) ────────────────────────────────────── */

function BrandCard({ b }: { b: BrandRow }) {
  const verInfo = VERIFICATION_LABELS[b.verification];
  const showVer = verInfo && verInfo.level !== "none" && verInfo.label;
  const typeLabel = b.type ? BRAND_TYPE_LABELS[b.type] ?? null : null;

  return (
    <Link
      href={`/brands/${encodeURIComponent(b.slug)}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/40 hover:shadow-[0_20px_50px_rgba(0,0,0,.4)]"
    >
      {b.featured && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#F58220] px-2 py-0.5 text-[9px] font-bold text-white">
          <Star className="h-2.5 w-2.5 fill-current" />
          ویژه
        </span>
      )}

      {/* Logo */}
      <div className="mb-3 flex h-16 w-full items-center justify-center overflow-hidden rounded-xl bg-white/5">
        {b.logoUrl ? (
          <img
            src={b.logoUrl}
            alt={b.name}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <Building2 className="h-8 w-8 text-[#F58220]/60" />
        )}
      </div>

      {/* Name + nameEn */}
      <h3 className="line-clamp-1 text-sm font-black text-white transition-colors group-hover:text-[#F58220]">
        {b.name}
      </h3>
      {b.nameEn && (
        <p className="line-clamp-1 text-[11px] text-white/35">{b.nameEn}</p>
      )}

      {/* Country */}
      {b.country && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-white/45">
          <MapPin className="h-3 w-3 text-[#F58220]" />
          {b.country}
        </p>
      )}

      {/* Badges row */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {showVer && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${verificationBadgeClass(
              verInfo!.level,
            )}`}
          >
            <ShieldCheck className="h-2.5 w-2.5" />
            {verInfo!.label}
          </span>
        )}
        {typeLabel && (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/55">
            {typeLabel}
          </span>
        )}
      </div>

      {/* Listings count */}
      <div className="mt-3 border-t border-white/10 pt-2.5 text-[11px] text-white/55">
        {toFa(b.listingsCount)} آگهی فعال
      </div>
    </Link>
  );
}

/* ── Filter chip helper ──────────────────────────────────────────────── */

function FilterChip({
  active,
  href,
  params,
  preserve,
  label,
}: {
  active: boolean;
  href: string;
  params?: Record<string, string>;
  preserve?: Record<string, string | undefined>;
  label: string;
}) {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) search.set(k, v);
  }
  if (preserve) {
    for (const [k, v] of Object.entries(preserve)) {
      if (v && !search.has(k)) search.set(k, v);
    }
  }
  const qs = search.toString();
  const fullHref = qs ? `${href}?${qs}` : href;
  return (
    <Link
      href={fullHref}
      className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
        active
          ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]"
          : "border-white/10 bg-white/5 text-white/55 hover:border-[#F58220]/30 hover:text-[#F58220]"
      }`}
    >
      {label}
    </Link>
  );
}
