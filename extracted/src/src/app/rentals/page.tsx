import Link from "next/link";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ArrowLeft,
  Key,
  MapPin,
  Calendar,
  Gauge,
  Search,
  Truck,
  Fuel,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { toFa, formatCompactPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

/* ============================================================
   /rentals — public rental listings page.
   Shows only listings with listingType=RENT. Filter by
   rental period, province, category.
   ============================================================ */

const PERIOD_FILTERS = [
  { key: "HOURLY", label: "ساعتی" },
  { key: "DAILY", label: "روزانه" },
  { key: "WEEKLY", label: "هفتگی" },
  { key: "MONTHLY", label: "ماهانه" },
  { key: "PROJECT", label: "پروژه‌ای" },
] as const;

const PERIOD_LABELS: Record<string, string> = {
  HOURLY: "ساعتی",
  DAILY: "روزانه",
  WEEKLY: "هفتگی",
  MONTHLY: "ماهانه",
  PROJECT: "پروژه‌ای",
};

type SearchParams = {
  period?: string;
  province?: string;
  category?: string;
  q?: string;
};

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const [headerCats, provinces, categories, listings] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
    db.province.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.category.findMany({
      where: { active: true, layer: "CATALOG" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, icon: true },
    }),
    db.listing.findMany({
      where: {
        status: "PUBLISHED",
        listingType: "RENT",
        ...(sp.period ? { rentalPeriod: sp.period } : {}),
        ...(sp.province ? { province: sp.province } : {}),
        ...(sp.category
          ? { OR: [{ category: { slug: sp.category } }, { category: { id: sp.category } }] }
          : {}),
        ...(sp.q ? {
          OR: [
            { title: { contains: sp.q } },
            { shortDesc: { contains: sp.q } },
            { description: { contains: sp.q } },
          ],
        } : {}),
      },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      take: 60,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true, slug: true, icon: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
      },
    }),
  ]);

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">خانه</Link>
            <ArrowLeft className="h-3 w-3" />
            <span className="text-white/70">اجاره ماشین‌آلات</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#F58220]">
              <Key className="h-3.5 w-3.5" />
              HEAVIX RENTAL · اجاره ماشین‌آلات
            </div>
            <h1 className="text-3xl font-black text-white lg:text-4xl">
              اجاره ماشین‌آلات صنعتی
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-white/45">
              ماشین‌آلات صنعتی برای اجاره ساعتی، روزانه، هفتگی، ماهانه و پروژه‌ای —
              همراه با اپراتور، سوخت و حمل‌ونقل قابل‌تأمین.
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#111] p-5">
            <form method="get" action="/rentals" className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  name="q"
                  defaultValue={sp.q || ""}
                  placeholder="جستجوی دستگاه..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/50 pr-9 pl-3 text-sm text-white outline-none transition focus:border-[#F58220] placeholder:text-white/30"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Period */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-white/55">دوره اجاره</label>
                  <select
                    name="period"
                    defaultValue={sp.period || ""}
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white outline-none focus:border-[#F58220]"
                  >
                    <option value="">همه دوره‌ها</option>
                    {PERIOD_FILTERS.map((p) => (
                      <option key={p.key} value={p.key} className="bg-[#111]">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Province */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-white/55">استان</label>
                  <select
                    name="province"
                    defaultValue={sp.province || ""}
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white outline-none focus:border-[#F58220]"
                  >
                    <option value="">همه استان‌ها</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.name} className="bg-[#111]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-white/55">دسته‌بندی</label>
                  <select
                    name="category"
                    defaultValue={sp.category || ""}
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white outline-none focus:border-[#F58220]"
                  >
                    <option value="">همه دسته‌ها</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug} className="bg-[#111]">
                        {c.icon ? `${c.icon} ` : ""}{c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-white/45">{toFa(listings.length)} دستگاه برای اجاره</p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F58220] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38]"
                >
                  <Search className="h-3.5 w-3.5" />
                  اعمال فیلتر
                </button>
              </div>
            </form>
          </div>

          {/* Listings grid */}
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <Key className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <p className="text-sm text-white/50">دستگاهی برای اجاره با این فیلترها یافت نشد.</p>
              <Link
                href="/rentals"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F58220] px-5 py-2.5 text-xs font-bold text-white"
              >
                حذف فیلترها
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((l) => (
                <RentalCard key={l.id} l={l} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function RentalCard({
  l,
}: {
  l: {
    id: string;
    slug: string;
    title: string;
    shortDesc: string | null;
    price: bigint | null;
    year: number | null;
    workingHours: number | null;
    city: string | null;
    province: string | null;
    rentalPeriod: string | null;
    deposit: bigint | null;
    minimumRentalPeriod: number | null;
    operatorIncluded: boolean;
    fuelIncluded: boolean;
    transportIncluded: boolean;
    brand: { name: string } | null;
    category: { name: string; slug: string; icon: string | null } | null;
    images: { url: string }[];
  };
}) {
  const periodLabel = l.rentalPeriod ? PERIOD_LABELS[l.rentalPeriod] : null;
  const included = [
    l.operatorIncluded ? { icon: <UserCheck className="h-3 w-3" />, label: "اپراتور" } : null,
    l.fuelIncluded ? { icon: <Fuel className="h-3 w-3" />, label: "سوخت" } : null,
    l.transportIncluded ? { icon: <Truck className="h-3 w-3" />, label: "حمل" } : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[];

  return (
    <Link
      href={`/listings/${l.slug}`}
      className="group block h-full overflow-hidden rounded-3xl border border-white/10 bg-[#111] transition-all duration-500 hover:-translate-y-2 hover:border-[#F58220]/40 hover:shadow-[0_25px_60px_rgba(0,0,0,.45)]"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
        {l.images[0]?.url ? (
          <img
            src={l.images[0].url}
            alt={l.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl opacity-80">
            {l.category?.icon ?? "🔑"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Period badge */}
        <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#F58220] px-3 py-1 text-[10px] font-black text-white">
          <Key className="h-3 w-3" />
          {periodLabel ?? "اجاره"}
        </div>

        {/* Brand */}
        {l.brand && (
          <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur">
            {l.brand.name}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="line-clamp-1 text-base font-black text-white">{l.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-white/45">{l.shortDesc ?? l.category?.name}</p>

        {/* Specs */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/55">
          {l.year && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#F58220]" />
              {toFa(l.year)}
            </span>
          )}
          {l.workingHours != null && (
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3 w-3 text-[#F58220]" />
              {toFa(l.workingHours)} ساعت
            </span>
          )}
          {(l.province || l.city) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#F58220]" />
              {[l.province, l.city].filter(Boolean).join("، ")}
            </span>
          )}
        </div>

        {/* Included services */}
        {included.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {included.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] font-bold text-emerald-400"
              >
                {s.icon}
                {s.label}
              </span>
            ))}
          </div>
        )}

        {/* Rate */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-black/30 p-3">
          <div>
            <p className="text-[10px] text-white/40">
              نرخ {periodLabel ?? "اجاره"}
            </p>
            <p className="mt-0.5 text-sm font-black text-[#F58220]">
              {l.price ? formatCompactPrice(l.price) : "توافقی"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/40">ودیعه</p>
            <p className="mt-0.5 text-sm font-black text-white">
              {l.deposit ? formatCompactPrice(l.deposit) : "—"}
            </p>
          </div>
        </div>

        {/* Min rental period */}
        {l.minimumRentalPeriod != null && (
          <p className="mt-2 text-[10px] text-white/40">
            حداقل مدت اجاره: {toFa(l.minimumRentalPeriod)} واحد
          </p>
        )}
      </div>
    </Link>
  );
}
