import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { resolveBrandBySlugOrAlias } from "@/lib/brand-resolve";
import {
  BRAND_TYPE_LABELS,
  BRAND_STATUS_LABELS,
  VERIFICATION_LABELS,
  verificationBadgeClass,
  statusBadgeClass,
} from "@/lib/brand-labels";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ListingCard from "@/components/listings/ListingCard";
import {
  Building2,
  MapPin,
  ArrowLeft,
  Package,
  Megaphone,
  ShieldCheck,
  Award,
  Calendar,
  Tags,
  Factory,
  Layers,
} from "lucide-react";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const brand = await resolveBrandBySlugOrAlias(slug);
  if (!brand) notFound();

  // Resolve industry keys → Persian labels (single round trip).
  const industryKeys = brand.industries.map((i) => i.industry);
  const industryRows =
    industryKeys.length > 0
      ? await db.industry.findMany({
          where: { key: { in: industryKeys } },
          select: { key: true, nameFa: true },
        })
      : [];
  const industryMap = new Map(industryRows.map((r) => [r.key, r.nameFa]));

  const [listings, models] = await Promise.all([
    db.listing.findMany({
      where: { status: "PUBLISHED", brandId: brand.id },
      orderBy: [
        { featured: "desc" },
        { publishedAt: { sort: "desc", nulls: "last" } },
      ],
      take: 24,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true, slug: true, icon: true } },
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
    }),
    db.productModel.findMany({
      where: { brandId: brand.id },
      take: 12,
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const cardData = listings.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    shortDesc: l.shortDesc,
    brandName: l.brand?.name ?? null,
    price: l.price,
    priceType: l.priceType,
    image: l.images[0]?.url ?? null,
    icon: l.category?.icon ?? null,
    year: l.year,
    city: l.city,
    workingHours: l.workingHours,
    condition: l.condition,
    featured: l.featured,
    verified: l.verified,
    viewCount: l.viewCount,
  }));

  // ── Badges ──────────────────────────────────────────────────────────────
  const typeLabel = brand.type ? BRAND_TYPE_LABELS[brand.type] ?? null : null;
  const statusInfo = BRAND_STATUS_LABELS[brand.status] ?? null;
  const showStatus = brand.status && brand.status !== "ACTIVE" && statusInfo;
  const verInfo = VERIFICATION_LABELS[brand.verification] ?? null;
  const showVerification =
    verInfo && verInfo.level !== "none" && verInfo.label;

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-[1400px] px-6 py-12 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">
              خانه
            </Link>
            <ArrowLeft className="h-3 w-3" />
            <Link href="/brands" className="hover:text-[#F58220]">
              برندها
            </Link>
            <ArrowLeft className="h-3 w-3" />
            <span className="text-white/60">{brand.name}</span>
          </nav>

          {/* Brand hero */}
          <div className="mb-10 flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-[#111] p-8 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building2 className="h-10 w-10 text-[#F58220]" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-right">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-3xl font-black text-white">
                  {brand.name}
                </h1>
                {brand.nameEn && (
                  <span className="text-lg text-white/40">
                    ({brand.nameEn})
                  </span>
                )}
                {/* Verification badge */}
                {showVerification && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${verificationBadgeClass(
                      verInfo!.level,
                    )}`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {verInfo!.label}
                  </span>
                )}
                {/* Status badge (only if not ACTIVE) */}
                {showStatus && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(
                      statusInfo!.color,
                    )}`}
                  >
                    {statusInfo!.label}
                  </span>
                )}
                {/* Type badge */}
                {typeLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/60">
                    <Award className="h-3.5 w-3.5 text-[#F58220]" />
                    {typeLabel}
                  </span>
                )}
              </div>

              {/* Meta line: country / manufacturer / founded */}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/50 sm:justify-start">
                {brand.country && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
                    {brand.country}
                  </span>
                )}
                {brand.manufacturer &&
                  brand.manufacturer !== brand.name && (
                    <span className="inline-flex items-center gap-1">
                      <Factory className="h-3.5 w-3.5 text-[#F58220]" />
                      سازنده: {brand.manufacturer}
                    </span>
                  )}
                {brand.foundedYear && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#F58220]" />
                    تأسیس: {toFa(brand.foundedYear)}
                  </span>
                )}
              </div>

              {brand.description && (
                <p className="mt-3 text-sm leading-7 text-white/50">
                  {brand.description}
                </p>
              )}

              {/* Aliases line */}
              {brand.aliases.length > 0 && (
                <p className="mt-3 text-xs leading-6 text-white/45">
                  <span className="text-white/60">نام‌های دیگر: </span>
                  {brand.aliases.map((a) => a.value).join("، ")}
                </p>
              )}

              {/* Parent brand link */}
              {brand.parentBrand && (
                <p className="mt-2 text-xs text-white/45">
                  از خانوادهٔ{" "}
                  <Link
                    href={`/brands/${encodeURIComponent(
                      brand.parentBrand.slug,
                    )}`}
                    className="font-bold text-[#F58220] hover:underline"
                  >
                    {brand.parentBrand.name}
                  </Link>
                </p>
              )}
            </div>

            {/* Counts */}
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-[#F58220]">
                  {toFa(listings.length)}
                </p>
                <p className="text-[11px] text-white/40">آگهی فعال</p>
              </div>
              {models.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-[#F58220]">
                    {toFa(models.length)}
                  </p>
                  <p className="text-[11px] text-white/40">مدل</p>
                </div>
              )}
            </div>
          </div>

          {/* Industry chips + family + child brands */}
          {(industryKeys.length > 0 ||
            brand.brandFamily ||
            brand.childBrands.length > 0) && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Industry chips */}
              {industryKeys.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#111] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white/60">
                    <Tags className="h-4 w-4 text-[#F58220]" />
                    صنایع
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {industryKeys.map((k) => (
                      <Link
                        key={k}
                        href={`/listings?brand=${encodeURIComponent(
                          brand.slug,
                        )}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/60 transition hover:border-[#F58220]/30 hover:text-[#F58220]"
                      >
                        {industryMap.get(k) ?? k}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand family */}
              {brand.brandFamily && (
                <div className="rounded-2xl border border-white/10 bg-[#111] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white/60">
                    <Layers className="h-4 w-4 text-[#F58220]" />
                    خانوادهٔ برند
                  </h3>
                  <Link
                    href={`/brand-families/${encodeURIComponent(
                      brand.brandFamily.slug,
                    )}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-3 py-1.5 text-xs font-bold text-[#F58220] transition hover:bg-[#F58220]/15"
                  >
                    {brand.brandFamily.name}
                    <ArrowLeft className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Child brands */}
              {brand.childBrands.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#111] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white/60">
                    <Building2 className="h-4 w-4 text-[#F58220]" />
                    برندهای زیرمجموعه
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {brand.childBrands.map((c) => (
                      <Link
                        key={c.id}
                        href={`/brands/${encodeURIComponent(c.slug)}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/60 transition hover:border-[#F58220]/30 hover:text-[#F58220]"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Models */}
          {models.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
                <Package className="h-5 w-5 text-[#F58220]" />
                مدل‌های {brand.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <Link
                    key={m.id}
                    href={`/models/${encodeURIComponent(m.slug)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-white/60 transition hover:border-[#F58220]/30 hover:text-[#F58220]"
                  >
                    {m.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Listings */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
              <Megaphone className="h-5 w-5 text-[#F58220]" />
              آگهی‌های {brand.name}
              <span className="text-sm font-normal text-white/40">
                ({toFa(listings.length)} آگهی)
              </span>
            </h2>
            {cardData.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#111] p-12 text-center">
                <p className="text-sm text-white/40">
                  در حال حاضر آگهی فعالی برای این برند وجود ندارد.
                </p>
                <Link
                  href="/listings"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#F58220]"
                >
                  مشاهده همه آگهی‌ها
                  <ArrowLeft className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cardData.map((l) => (
                  <ListingCard key={l.id} l={l} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
