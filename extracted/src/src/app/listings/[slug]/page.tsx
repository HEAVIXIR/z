import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import {
  toFa,
  formatFullPrice,
  PRICE_TYPE_LABELS,
  CONDITION_LABELS,
  LISTING_TYPE_LABELS,
  faDate,
  computeTrustScore,
} from "@/lib/format";
import TrustBadge from "@/components/listings/TrustBadge";
import CompareButton from "@/components/listings/CompareButton";
import MessageButton from "@/components/listings/MessageButton";
import FavoriteButton from "@/components/listings/FavoriteButton";
import PriceEstimateCard from "@/components/listings/PriceEstimateCard";
import DealRoomStartButton from "@/components/listings/DealRoomStartButton";
import InspectionRequestButton from "@/components/listings/InspectionRequestButton";
import { getCurrentUser } from "@/lib/auth";
import { AttributeValueRow, type AttributeValueDisplayValue } from "@/components/listings/AttributeValueDisplay";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ArrowRight,
  MapPin,
  Calendar,
  Gauge,
  Tag,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Wrench,
  Star,
  Sliders,
  Truck,
  Handshake,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [listing, headerCats, currentUser] = await Promise.all([
    db.listing.findUnique({
      where: { slug },
      include: {
        brand: { select: { name: true, nameEn: true, country: true } },
        category: { select: { name: true, slug: true, icon: true } },
        seller: { select: { id: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
    getCurrentUser(),
  ]);

  if (!listing || listing.status !== "PUBLISHED") notFound();

  // Seed the favorite button state for the authed user (1 row max).
  const existingFav = currentUser
    ? await db.favorite.findUnique({
        where: {
          userId_listingId: { userId: currentUser.id, listingId: listing.id },
        },
        select: { id: true },
      })
    : null;
  const isOwner = !!currentUser && !!listing.sellerId && currentUser.id === listing.sellerId;

  /* ── Attribute values (Technical Specifications) — server-side fetch ── */
  const attrRows = await db.listingAttributeValue.findMany({
    where: { listingId: listing.id },
    orderBy: [
      { attribute: { sortOrder: "asc" } },
      { attribute: { name: "asc" } },
    ],
    include: {
      attribute: {
        include: {
          options: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] },
        },
      },
    },
  });

  // Filter to visibleOnDetail AND non-empty value, then project for the display component.
  const specsRows: AttributeValueDisplayValue[] = attrRows
    .filter((v) => v.attribute.visibleOnDetail)
    .filter((v) => {
      // Non-empty check across all value columns.
      const has =
        (v.textValue && v.textValue.trim() !== "") ||
        v.numberValue !== null ||
        v.booleanValue !== null ||
        v.dateValue !== null ||
        v.optionId !== null;
      return has;
    })
    .map((v) => {
      const option = v.optionId
        ? v.attribute.options.find((o) => o.id === v.optionId) ?? null
        : null;
      return {
        id: v.id,
        textValue: v.textValue,
        numberValue: v.numberValue,
        booleanValue: v.booleanValue,
        dateValue: v.dateValue,
        optionId: v.optionId,
        unit: v.unit,
        sourceType: v.sourceType,
        confidence: v.confidence,
        sourceReference: v.sourceReference,
        verifiedAt: v.verifiedAt,
        verifiedBy: v.verifiedBy,
        attribute: {
          id: v.attribute.id,
          key: v.attribute.key,
          name: v.attribute.name,
          nameEn: v.attribute.nameEn,
          labelFa: v.attribute.labelFa,
          labelEn: v.attribute.labelEn,
          type: v.attribute.type,
          unit: v.attribute.unit,
          visibleOnDetail: v.attribute.visibleOnDetail,
          options: v.attribute.options.map((o) => ({
            id: o.id,
            value: o.value,
            label: o.label,
          })),
        },
        option: option
          ? { id: option.id, value: option.value, label: option.label }
          : null,
      };
    });

  /* Increment view count (fire-and-forget) */
  db.listing
    .update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  /* P1-2 — track LISTING_VIEW analytics event (fire-and-forget).
     Server-side render path so we capture every page-load, including
     ones without JavaScript. The trackEvent helper never throws and
     never blocks this render. */
  trackEvent({
    eventType: "LISTING_VIEW",
    listingId: listing.id,
    categoryId: listing.categoryId ?? null,
    brandId: listing.brandId ?? null,
    page: `/listings/${listing.slug}`,
  });

  const priceLabel =
    listing.price != null
      ? formatFullPrice(listing.price)
      : PRICE_TYPE_LABELS[listing.priceType] ?? "تماس بگیرید";

  const specs = [
    listing.brand && { icon: Tag, label: "برند", value: listing.brand.name },
    listing.year && { icon: Calendar, label: "سال ساخت", value: toFa(listing.year) },
    listing.workingHours != null && {
      icon: Gauge,
      label: "ساعت کارکرد",
      value: `${toFa(listing.workingHours)} ساعت`,
    },
    listing.condition && {
      icon: ShieldCheck,
      label: "وضعیت",
      value: CONDITION_LABELS[listing.condition] ?? listing.condition,
    },
    listing.city && { icon: MapPin, label: "شهر", value: listing.city },
    listing.province && { icon: MapPin, label: "استان", value: listing.province },
  ].filter(Boolean) as { icon: typeof Tag; label: string; value: string }[];

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
            {listing.category && (
              <>
                <ArrowRight className="h-3 w-3" />
                <Link
                  href={`/listings?category=${listing.category.slug}`}
                  className="hover:text-[#F58220]"
                >
                  {listing.category.name}
                </Link>
              </>
            )}
            <ArrowRight className="h-3 w-3" />
            <span className="truncate text-white/70">{listing.title}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Main column */}
            <div>
              {/* Gallery */}
              <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
                <div className="relative aspect-[16/10] bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
                  {listing.images[0]?.url ? (
                     
                    <img
                      src={listing.images[0].url}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-[10rem] opacity-80">
                        {listing.category?.icon ?? "🚜"}
                      </span>
                    </div>
                  )}
                  {listing.featured && (
                    <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#F58220] px-4 py-2 text-sm font-bold text-white shadow-lg">
                      <Star className="h-4 w-4 fill-current" />
                      آگهی ویژه
                    </div>
                  )}
                </div>
                {listing.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-3 no-scrollbar">
                    {listing.images.map((img) => (
                       
                      <img
                        key={img.id}
                        src={img.url}
                        alt={img.alt ?? listing.title}
                        className="h-20 w-28 shrink-0 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Title + badges */}
              <div className="mb-6 rounded-3xl border border-white/10 bg-[#111] p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {listing.brand && (
                      <span className="rounded-full bg-[#F58220]/15 px-3 py-1 text-xs font-bold text-[#F58220]">
                        {listing.brand.name}
                      </span>
                    )}
                    {listing.category && (
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                        {listing.category.icon} {listing.category.name}
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                      {LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType}
                    </span>
                  </div>
                  <FavoriteButton
                    listingId={listing.id}
                    initialFavorited={!!existingFav}
                    count={listing.favoriteCount}
                    size="md"
                    variant="solid"
                  />
                </div>
                <h1 className="text-2xl font-black leading-tight text-white lg:text-3xl">
                  {listing.title}
                </h1>
                {listing.shortDesc && (
                  <p className="mt-3 text-sm leading-7 text-white/60">{listing.shortDesc}</p>
                )}
                <div className="mt-4 flex items-center gap-4 text-xs text-white/40">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {listing.city ?? "—"}، {listing.province ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {toFa(listing.viewCount)} بازدید
                  </span>
                  {listing.publishedAt && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {faDate(listing.publishedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Specs grid */}
              {specs.length > 0 && (
                <div className="mb-6 rounded-3xl border border-white/10 bg-[#111] p-6">
                  <h2 className="mb-5 text-lg font-bold text-white">مشخصات فنی</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {specs.map((s) => (
                      <div
                        key={s.label}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                      >
                        <s.icon className="h-5 w-5 shrink-0 text-[#F58220]" />
                        <div>
                          <div className="text-[11px] text-white/40">{s.label}</div>
                          <div className="text-sm font-bold text-white">{s.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {listing.description && (
                <div className="mb-6 rounded-3xl border border-white/10 bg-[#111] p-6">
                  <h2 className="mb-4 text-lg font-bold text-white">توضیحات</h2>
                  <p className="whitespace-pre-line text-sm leading-8 text-white/65">
                    {listing.description}
                  </p>
                </div>
              )}

              {/* HEAVIX Price Estimate (data-driven) */}
              <PriceEstimateCard listingId={listing.id} />

              {/* Technical Specifications (dynamic attributes) */}
              {specsRows.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-[#111] p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F58220]/15 text-[#F58220]">
                        <Sliders className="h-4 w-4" />
                      </div>
                      <h2 className="text-lg font-bold text-white">مشخصات فنی کامل</h2>
                    </div>
                    {specsRows.some((r) => r.sourceType && r.sourceType !== "SELLER_INPUT") && (
                      <span className="hidden text-[10px] text-white/40 sm:inline">
                        نشان <span className="text-emerald-300">«تأیید کارشناس»</span> یعنی این
                        مقدار توسط کارشناس هویکس تأیید شده است.
                      </span>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                    <table className="w-full">
                      <tbody>
                        {specsRows.map((r) => (
                          <AttributeValueRow key={r.id ?? r.attribute.id} v={r} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: price + contact */}
            <aside className="lg:sticky lg:top-32 lg:h-fit">
              <div className="rounded-3xl border border-white/10 bg-[#111] p-6">
                <div className="text-xs text-white/50">قیمت</div>
                <div className="mt-1 text-3xl font-black text-[#F58220]">{priceLabel}</div>
                <div className="mt-1 text-xs text-white/40">
                  {PRICE_TYPE_LABELS[listing.priceType] ?? ""}
                </div>

                <div className="my-5 border-t border-white/10" />

                {/* HEAVIX Verified trust score */}
                <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                      IronClad Inspection
                    </div>
                    <div className="mt-0.5 text-xs text-white/60">
                      نمره کارشناسی هویکس
                    </div>
                  </div>
                  <TrustBadge listing={listing} size="lg" />
                </div>

                {/* Contact button */}
                <a
                  href="tel:02191008000"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] text-sm font-bold text-white transition hover:bg-[#ff8c38]"
                >
                  <Phone className="h-4 w-4" />
                  تماس با فروشنده
                </a>
                {/* P1-MESSAGING — start a conversation about this listing */}
                <MessageButton
                  listingId={listing.id}
                  sellerId={listing.sellerId ?? null}
                  isOwner={isOwner}
                  label="ارسال پیام به فروشنده"
                />

                {/* COMPARE-ENGINE — add to comparison session */}
                <CompareButton listingId={listing.id} title={listing.title} />

                {/* P2-DEAL-INSPECT-TRANSPORT — start deal room + inspection + transport */}
                <div className="mt-3 space-y-2">
                  {currentUser ? (
                    <DealRoomStartButton listingId={listing.id} isOwner={isOwner} />
                  ) : (
                    <Link
                      href={`/login?next=/listings/${listing.slug}`}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#F58220]/40 bg-[#F58220]/10 text-sm font-bold text-[#F58220] transition hover:bg-[#F58220]/20"
                    >
                      <Handshake className="h-4 w-4" />
                      شروع مذاکره در اتاق معامله
                    </Link>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {currentUser ? (
                      <InspectionRequestButton listingId={listing.id} dealRoomId={null} />
                    ) : (
                      <Link
                        href={`/login?next=/listings/${listing.slug}`}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        درخواست کارشناسی
                      </Link>
                    )}
                    <Link
                      href={`/transport/request?listingId=${listing.id}`}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-xs font-bold text-violet-300 transition hover:bg-violet-500/20"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      درخواست حمل
                    </Link>
                  </div>
                </div>

                <div className="my-5 border-t border-white/10" />

                {/* Trust badges */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    معامله امن هویکس
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F58220]" />
                    کارشناسی اختصاصی
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Wrench className="h-4 w-4 shrink-0 text-[#F58220]" />
                    خدمات پس از فروش via MEKANIX
                  </div>
                </div>

                <div className="my-5 border-t border-white/10" />

                {/* Sell in 7 days CTA */}
                <Link
                  href="/#sell7"
                  className="block rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center transition hover:bg-amber-500/15"
                >
                  <div className="text-xs font-black text-amber-300">⚡ فروش در ۷ روز</div>
                  <div className="mt-1 text-[11px] text-white/55">
                    دستگاهت را در کمپین فروش تضمینی ثبت کن
                  </div>
                </Link>
              </div>
            </aside>
          </div>

          {/* Back link */}
          <div className="mt-10">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-[#F58220]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              بازگشت به فهرست آگهی‌ها
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
