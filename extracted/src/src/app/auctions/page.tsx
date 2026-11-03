import Link from "next/link";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Gavel, ArrowLeft, Clock, Users, TrendingUp, CalendarClock } from "lucide-react";
import { toFa, formatCompactPrice, faDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "LIVE", label: "در حال برگزاری" },
  { key: "UPCOMING", label: "رو به برگزاری" },
  { key: "ENDED", label: "پایان‌یافته" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter: FilterKey = (sp.status?.toUpperCase() as FilterKey) || "LIVE";

  const [headerCats, auctions] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
    db.auction.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: [{ startDate: "asc" }],
      take: 100,
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDesc: true,
            year: true,
            city: true,
            province: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
            brand: { select: { name: true } },
            category: { select: { name: true, icon: true } },
          },
        },
        bids: { orderBy: { amount: "desc" }, take: 1, select: { amount: true } },
        _count: { select: { bids: true } },
      },
    }),
  ]);

  const now = new Date();
  const enriched = auctions
    .map((a) => {
      const liveStatus =
        a.status === "ENDED" || a.status === "CANCELLED"
          ? "ENDED"
          : now < a.startDate
            ? "UPCOMING"
            : now > a.endDate
              ? "ENDED"
              : "LIVE";
      const highestBid = a.bids[0]?.amount ?? null;
      return {
        id: a.id,
        title: a.title,
        startPrice: a.startPrice.toString(),
        minIncrement: a.minIncrement.toString(),
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        status: a.status,
        liveStatus,
        bidCount: a._count.bids,
        currentBid: (highestBid ?? a.startPrice).toString(),
        listing: {
          ...a.listing,
          image: a.listing.images[0]?.url ?? null,
          images: undefined,
        },
      };
    })
    .filter((a) => a.liveStatus === filter);

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">خانه</Link>
            <ArrowLeft className="h-3 w-3" />
            <span className="text-white/70">مزایده ماشین‌آلات</span>
          </nav>

          {/* Header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#F58220]">
                <Gavel className="h-3.5 w-3.5" />
                HEAVIX AUCTION · مزایده ماشین‌آلات
              </div>
              <h1 className="text-3xl font-black text-white lg:text-4xl">
                مزایده ماشین‌آلات صنعتی
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-white/45">
                در مزایده‌های هویکس شرکت کنید — ماشین‌آلات کارکرده و نو با قیمت شروع پایین،
                با تأییدیه کارشناسان و گزارش فنی شفاف.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={`/auctions?status=${f.key}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    filter === f.key
                      ? "border-[#F58220] bg-[#F58220] text-white"
                      : "border-white/10 text-white/60 hover:border-[#F58220]/40 hover:text-white"
                  }`}
                >
                  {f.key === "LIVE" && <TrendingUp className="h-3 w-3" />}
                  {f.key === "UPCOMING" && <CalendarClock className="h-3 w-3" />}
                  {f.key === "ENDED" && <Clock className="h-3 w-3" />}
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Auctions grid */}
          {enriched.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <Gavel className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <p className="text-sm text-white/50">
                {filter === "LIVE"
                  ? "در حال حاضر مزایده فعالی وجود ندارد."
                  : filter === "UPCOMING"
                    ? "مزایده‌ای رو به برگزاری ثبت نشده است."
                    : "مزایده پایان‌یافته‌ای موجود نیست."}
              </p>
              <Link
                href="/auctions?status=LIVE"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F58220] px-5 py-2.5 text-xs font-bold text-white"
              >
                مشاهده مزایده‌های فعال
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {enriched.map((a) => (
                <AuctionCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function AuctionCard({
  a,
}: {
  a: {
    id: string;
    title: string;
    startPrice: string;
    minIncrement: string;
    startDate: string;
    endDate: string;
    liveStatus: string;
    bidCount: number;
    currentBid: string;
    listing: {
      id: string;
      slug: string;
      title: string;
      shortDesc: string | null;
      year: number | null;
      city: string | null;
      province: string | null;
      image: string | null;
      brand: { name: string } | null;
      category: { name: string; icon: string | null } | null;
    };
  };
}) {
  const statusPill =
    a.liveStatus === "LIVE"
      ? { label: "در حال برگزاری", cls: "bg-emerald-500 text-white" }
      : a.liveStatus === "UPCOMING"
        ? { label: "رو به برگزاری", cls: "bg-blue-500 text-white" }
        : { label: "پایان یافته", cls: "bg-zinc-700 text-white/70" };

  return (
    <Link
      href={`/auctions/${a.id}`}
      className="group block h-full overflow-hidden rounded-3xl border border-white/10 bg-[#111] transition-all duration-500 hover:-translate-y-2 hover:border-[#F58220]/40 hover:shadow-[0_25px_60px_rgba(0,0,0,.45)]"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
        {a.listing.image ? (
          <img
            src={a.listing.image}
            alt={a.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl opacity-80">
            {a.listing.category?.icon ?? "🔨"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Status pill */}
        <div className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black ${statusPill.cls}`}>
          {a.liveStatus === "LIVE" && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
          {statusPill.label}
        </div>

        {/* Gavel badge */}
        <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-[#F58220] backdrop-blur">
          <Gavel className="h-3 w-3" />
          مزایده
        </div>

        {/* Brand */}
        {a.listing.brand && (
          <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur">
            {a.listing.brand.name}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="line-clamp-1 text-base font-black text-white">{a.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-white/45">
          {a.listing.shortDesc ?? a.listing.title}
        </p>

        {/* Bid stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-black/30 p-3">
          <div>
            <p className="text-[10px] text-white/40">بالاترین پیشنهاد</p>
            <p className="mt-0.5 text-sm font-black text-[#F58220]">
              {formatCompactPrice(BigInt(a.currentBid))}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/40">تعداد پیشنهادها</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-black text-white">
              <Users className="h-3 w-3 text-white/40" />
              {toFa(a.bidCount)}
            </p>
          </div>
        </div>

        {/* Date + CTA */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3 text-[#F58220]" />
              پایان: {faDate(a.endDate)}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              a.liveStatus === "LIVE"
                ? "bg-[#F58220] text-white"
                : a.liveStatus === "UPCOMING"
                  ? "border border-white/10 text-white/70"
                  : "border border-white/10 text-white/40"
            }`}
          >
            {a.liveStatus === "LIVE"
              ? "شرکت در مزایده"
              : a.liveStatus === "UPCOMING"
                ? "مشاهده و یادآوری"
                : "مشاهده برنده"}
            <ArrowLeft className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
