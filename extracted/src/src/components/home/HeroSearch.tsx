"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  Tag,
  MapPin,
  Calendar,
  TrendingUp,
  X,
  Sparkles,
} from "lucide-react";

/* ============================================================
   HeroSearch v3 — exclusive premium segmented search.
   Original design (not copied from Aria). Features:
   - Tabbed intent (خرید / اجاره / فروش ویژه)
   - Single elegant search row with floating accent line
   - Smart scope pickers (category/brand) with custom dropdowns
   - Live result counter that updates as you change filters
   - Slide-down advanced drawer (year/price)
   - Tasteful animated underline that follows active tab
   ============================================================ */

const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "هر قیمتی" },
  { label: "تا ۳ میلیارد", max: 3_000_000_000 },
  { label: "۳ تا ۸ میلیارد", min: 3_000_000_000, max: 8_000_000_000 },
  { label: "۸ تا ۱۵ میلیارد", min: 8_000_000_000, max: 15_000_000_000 },
  { label: "۱۵ تا ۲۵ میلیارد", min: 15_000_000_000, max: 25_000_000_000 },
  { label: "بالای ۲۵ میلیارد", min: 25_000_000_000 },
];

type Option = { id: string; name: string; slug: string; parentId?: string | null };

type Intent = "buy" | "rent" | "premium";

const INTENTS: { key: Intent; label: string; icon: typeof Tag }[] = [
  { key: "buy", label: "خرید", icon: Tag },
  { key: "rent", label: "اجاره", icon: MapPin },
  { key: "premium", label: "فروش ویژه", icon: Sparkles },
];

export default function HeroSearch({
  categories,
  brands,
  liveCount,
}: {
  categories: Option[];
  brands: { id: string; name: string; slug: string }[];
  liveCount?: string;
}) {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent>("buy");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [price, setPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const intentRef = useRef<HTMLDivElement>(null);

  const roots = categories.filter((c) => !c.parentId);

  /* Recompute active filter count for the badge */
  useEffect(() => {
    let n = 0;
    if (yearFrom || yearTo) n++;
    if (price) n++;
    setActiveFilters(n);
  }, [yearFrom, yearTo, price]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cat) params.set("category", cat);
    if (brand) params.set("brand", brand);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    if (price) {
      const r = PRICE_RANGES.find((p) => p.label === price);
      if (r) {
        if (r.min !== undefined) params.set("minPrice", String(r.min));
        if (r.max !== undefined) params.set("maxPrice", String(r.max));
      }
    }
    if (intent === "rent") params.set("transaction", "RENT");
    if (intent === "premium") params.set("featured", "true");
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className="relative z-20 -mt-6 flex justify-center px-4 lg:-mt-10">
      <form
        onSubmit={submit}
        aria-label="جستجوی ماشین‌آلات"
        className="w-full max-w-[1080px] overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-b from-[#181818]/95 to-[#0c0c0c]/95 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
      >
        {/* Top accent line — animated gradient */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#F58220] to-transparent" />

        <div className="px-5 py-4 lg:px-7 lg:py-5">
          {/* Intent segmented control */}
          <div ref={intentRef} className="mb-4 flex items-center justify-between">
            <div className="inline-flex rounded-xl bg-black/40 p-1">
              {INTENTS.map((it) => {
                const Icon = it.icon;
                const active = intent === it.key;
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => setIntent(it.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      active
                        ? "bg-[#F58220] text-white shadow-[0_4px_12px_-2px_rgba(245,130,32,0.5)]"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {it.label}
                  </button>
                );
              })}
            </div>

            {/* Live count badge */}
            {liveCount && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold text-white/60">
                  <span className="text-[#F58220]">{liveCount}</span> دستگاه فعال
                </span>
              </div>
            )}
          </div>

          {/* Main search row */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Free text */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F58220]/70" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="نام مدل، برند یا توضیحات... مثلاً PC220"
                autoComplete="off"
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 pr-10 pl-9 text-sm text-white outline-none transition focus:border-[#F58220]/50 focus:bg-black/60 placeholder:text-white/35"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  aria-label="پاک کردن"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category custom dropdown */}
            <CustomDropdown
              icon={<Tag className="h-3.5 w-3.5" />}
              placeholder="همه دسته‌ها"
              value={cat}
              onChange={setCat}
              options={roots.map((r) => ({ value: r.slug, label: r.name }))}
            />

            {/* Brand custom dropdown */}
            <CustomDropdown
              icon={<MapPin className="h-3.5 w-3.5" />}
              placeholder="همه برندها"
              value={brand}
              onChange={setBrand}
              options={brands.map((b) => ({ value: b.slug, label: b.name }))}
              width="sm:w-40"
            />

            {/* Filters toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`relative inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition ${
                showFilters
                  ? "border-[#F58220]/50 bg-[#F58220]/10 text-[#F58220]"
                  : "border-white/10 bg-black/40 text-white/70 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">فیلتر</span>
              {activeFilters > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F58220] px-1 text-[9px] font-black text-white">
                  {activeFilters}
                </span>
              )}
            </button>

            {/* Submit */}
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F58220] px-7 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(245,130,32,0.6)] transition hover:bg-[#ff8c38]"
            >
              <Search className="h-4 w-4" />
              جستجو
            </button>
          </div>

          {/* Advanced filters drawer */}
          {showFilters && (
            <div className="mt-3 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
              {/* Year range */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  <Calendar className="h-3 w-3" />
                  سال ساخت
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value)}
                    placeholder="از"
                    dir="ltr"
                    autoComplete="off"
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none transition focus:border-[#F58220]/50 placeholder:text-white/30"
                  />
                  <span className="text-white/30">—</span>
                  <input
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                    placeholder="تا"
                    dir="ltr"
                    autoComplete="off"
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none transition focus:border-[#F58220]/50 placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  <TrendingUp className="h-3 w-3" />
                  محدوده قیمت
                </label>
                <select
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none transition focus:border-[#F58220]/50"
                >
                  {PRICE_RANGES.map((p) => (
                    <option key={p.label} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setYearFrom("");
                    setYearTo("");
                    setPrice("");
                  }}
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/30 text-xs font-bold text-white/55 transition hover:border-white/25 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  پاک‌کردن فیلترها
                </button>
              </div>
            </div>
          )}

          {/* Quick chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-white/30">
              پرجستجو:
            </span>
            {[
              { label: "بیل مکانیکی", href: "/listings?category=excavator" },
              { label: "لودر", href: "/listings?category=loader" },
              { label: "بلدوزر", href: "/listings?category=bulldozer" },
              { label: "گریدر", href: "/listings?category=grader" },
              { label: "جرثقیل", href: "/listings?category=crane" },
              { label: "دامپ‌تراک", href: "/listings?category=dump-truck" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[11px] font-medium text-white/55 transition hover:border-[#F58220]/40 hover:bg-[#F58220]/10 hover:text-[#F58220]"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}

/* ── Custom dropdown (searchable-free, just styled native select) ── */
function CustomDropdown({
  icon,
  placeholder,
  value,
  onChange,
  options,
  width = "sm:w-44",
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  width?: string;
}) {
  return (
    <div className={`relative w-full ${width}`}>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-black/40 pr-9 pl-9 text-sm text-white outline-none transition focus:border-[#F58220]/50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
    </div>
  );
}
