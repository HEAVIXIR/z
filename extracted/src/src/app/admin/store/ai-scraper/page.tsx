"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  ExternalLink,
  Search,
  Zap,
  Filter,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Phone,
  X,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/store/ai-scraper
   HEAVIX store — AI parts scraper
   Searches Iranian car/machinery parts sites, extracts part info
   via LLM, and imports into the store DB (with "تماس بگیرید"
   support for parts without a price).
   ============================================================ */

type Suggestion = {
  name: string;
  nameEn: string | null;
  nameFa: string | null;
  priceText: string | null;
  priceUsd: number | null;
  brandName: string | null;
  category: string | null;
  categoryName: string | null;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  sourceSite: string | null;
  contactForPrice: boolean;
};

type Category = { id: string; name: string; slug: string };
type Brand = { id: string; name: string; slug: string };

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";

export default function StoreAiScraperPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [limit, setLimit] = useState(8);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Load categories + brands for the filter dropdowns. These are
  // pre-filter helpers only — the scraper itself finds/creates
  // brand & category rows based on what it finds on each page.
  const loadMeta = useCallback(async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        fetch("/api/admin/store/categories?limit=200", { cache: "no-store" }),
        fetch("/api/admin/store/brands?limit=200", { cache: "no-store" }),
      ]);
      const [catJson, brandJson] = await Promise.all([
        catRes.json(),
        brandRes.json(),
      ]);
      if (catJson.success) setCategories(catJson.data);
      if (brandJson.success) setBrands(brandJson.data);
    } catch {
      /* ignore — filters stay empty */
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const keyOf = (s: Suggestion, i: number) =>
    `${i}-${s.sourceUrl}-${s.name}`.slice(0, 200);

  const scrape = async () => {
    if (!query.trim()) {
      setError("لطفاً عبارت جستجو را وارد کنید.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    setImportedKeys(new Set());
    setSelected(new Set());
    setSuggestions([]);
    try {
      const res = await fetch("/api/admin/store/ai-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scrape",
          query: query.trim(),
          category: categoryFilter || undefined,
          brand: brandFilter || undefined,
          limit,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuggestions(data.suggestions ?? []);
        if ((data.suggestions ?? []).length === 0) {
          setMessage(
            data.message ?? "هیچ قطعه‌ای یافت نشد. عبارت دیگری را امتحان کنید.",
          );
        }
      } else {
        setError(data.error ?? "خطا در جستجو.");
      }
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  const importOne = async (s: Suggestion, idx: number) => {
    const k = keyOf(s, idx);
    setImporting(k);
    setError(null);
    try {
      const res = await fetch("/api/admin/store/ai-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          part: {
            ...s,
            // Pre-fill the brand/category from the filter if the
            // scraper didn't find one — gives the admin one-click
            // control when filtering by category/brand.
            brandName:
              s.brandName ||
              (brandFilter
                ? brands.find((b) => b.id === brandFilter)?.name ?? null
                : null),
            categoryName:
              s.categoryName ||
              s.category ||
              (categoryFilter
                ? categories.find((c) => c.id === categoryFilter)?.name ?? null
                : null),
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportedKeys((prev) => new Set(prev).add(k));
        setImportedCount((c) => c + 1);
        setMessage(`قطعه «${data.part?.name ?? s.name}» در فروشگاه ثبت شد.`);
      } else {
        setError(data.error ?? "خطا در ثبت قطعه.");
      }
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setImporting(null);
    }
  };

  const bulkImport = async () => {
    if (selected.size === 0) return;
    setBulkImporting(true);
    setError(null);
    const items = suggestions.filter((_, i) => selected.has(String(i)));
    // Pre-fill brand/category from filter, same as importOne.
    const enrichedParts = items.map((s) => ({
      ...s,
      brandName:
        s.brandName ||
        (brandFilter
          ? brands.find((b) => b.id === brandFilter)?.name ?? null
          : null),
      categoryName:
        s.categoryName ||
        s.category ||
        (categoryFilter
          ? categories.find((c) => c.id === categoryFilter)?.name ?? null
          : null),
    }));
    try {
      const res = await fetch("/api/admin/store/ai-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-import", parts: enrichedParts }),
      });
      const data = await res.json();
      if (data.ok) {
        const okKeys = new Set<string>();
        items.forEach((s) => {
          const idx = suggestions.indexOf(s);
          if (idx >= 0) okKeys.add(keyOf(s, idx));
        });
        setImportedKeys((prev) => new Set([...prev, ...okKeys]));
        setSelected(new Set());
        setImportedCount((c) => c + (data.imported ?? 0));
        setMessage(
          `${toFa(data.imported ?? 0)} از ${toFa(data.total ?? 0)} قطعه با موفقیت در فروشگاه ثبت شد.`,
        );
      } else {
        setError(data.error ?? "خطا در ثبت قطعات.");
      }
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setBulkImporting(false);
    }
  };

  const toggleSelect = (k: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === suggestions.length) setSelected(new Set());
    else setSelected(new Set(suggestions.map((_, i) => String(i))));
  };

  // Auto-dismiss the message after 4 seconds.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zinc-900">
            <Sparkles className="h-6 w-6 text-[#F58220]" />
            اسکرپر قطعات هوش مصنوعی
          </h1>
          <p className="text-sm text-zinc-500">
            جستجوی قطعات خودرو و ماشین‌آلات در سایت‌های ایرانی و افزودن به فروشگاه هویکس
          </p>
        </div>
        {importedCount > 0 && (
          <div className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={16} />
            {toFa(importedCount)} قطعه وارد شده
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-[#F58220]/30 bg-[#F58220]/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#F58220]" />
          <div className="text-sm text-zinc-700">
            <p className="font-bold">چگونه کار می‌کند؟</p>
            <p className="mt-1 text-zinc-600">
              هوش مصنوعی عبارت شما را در وب جستجو می‌کند، صفحات سایت‌های ایرانی فروش قطعات را
              می‌خواند و اطلاعات ساختاریافته (نام فارسی/انگلیسی، برند، دسته، قیمت، تصویر و منبع)
              را استخراج می‌کند. قطعاتی که قیمت ندارند با علامت{" "}
              <b className="text-[#F58220]">«تماس بگیرید»</b> در فروشگاه ثبت می‌شوند.
            </p>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              عبارت جستجو *
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="مثلاً: لنت ترمز تویوتا کرولا، فیلتر روغن پژو ۲۰۶، تسمه تایم…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) scrape();
                }}
                className={INPUT_CLS + " pr-9"}
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              دسته (اختیاری)
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={INPUT_CLS}
            >
              <option value="">همه دسته‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              برند (اختیاری)
            </label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className={INPUT_CLS}
            >
              <option value="">همه برندها</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              تعداد نتایج
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className={INPUT_CLS}
            >
              <option value={5}>۵ نتیجه</option>
              <option value={8}>۸ نتیجه</option>
              <option value={10}>۱۰ نتیجه</option>
              <option value={15}>۱۵ نتیجه</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={scrape}
            disabled={loading || !query.trim()}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e0701a] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {loading ? "در حال جستجو..." : "جستجو"}
          </button>
        </div>
      </div>

      {/* Error / message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          ⚠ {error}
        </div>
      )}
      {message && !error && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          ✓ {message}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#F58220]" />
          <p className="mt-4 text-sm text-zinc-500">
            هوش مصنوعی در حال جستجوی سایت‌های ایرانی و استخراج اطلاعات قطعات است...
          </p>
        </div>
      )}

      {/* Bulk action bar */}
      {!loading && suggestions.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
            <input
              type="checkbox"
              checked={
                selected.size === suggestions.length && suggestions.length > 0
              }
              onChange={toggleSelectAll}
              className="h-4 w-4 accent-[#F58220]"
            />
            انتخاب همه
          </label>
          <span className="text-xs text-zinc-400">
            {toFa(selected.size)} انتخاب‌شده
          </span>
          <span className="text-xs text-zinc-400">|</span>
          <span className="text-xs text-zinc-400">
            کل: {toFa(suggestions.length)} · ثبت‌شده: {toFa(importedKeys.size)}
          </span>
          <button
            onClick={bulkImport}
            disabled={selected.size === 0 || bulkImporting}
            className="mr-auto inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {bulkImporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            ثبت گروهی ({toFa(selected.size)})
          </button>
        </div>
      )}

      {/* Results grid */}
      {!loading && suggestions.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {suggestions.map((s, idx) => {
            const k = keyOf(s, idx);
            const isImported = importedKeys.has(k);
            const isSelected = selected.has(String(idx));
            return (
              <div
                key={k}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                  isImported
                    ? "border-emerald-300 bg-emerald-50/30"
                    : isSelected
                      ? "border-[#F58220] ring-2 ring-[#F58220]/20"
                      : "border-zinc-200"
                }`}
              >
                {/* Image + badges */}
                <div className="relative h-40 bg-zinc-100">
                  {s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt={s.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-300">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <label className="absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/95 shadow">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(String(idx))}
                      className="h-4 w-4 accent-[#F58220]"
                    />
                  </label>
                  {s.sourceSite && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                      {s.sourceSite}
                    </span>
                  )}
                  {s.brandName && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-[#F58220] px-2.5 py-0.5 text-[11px] font-bold text-white">
                      {s.brandName}
                    </span>
                  )}
                  {s.contactForPrice ? (
                    <span className="absolute bottom-3 left-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      تماس بگیرید
                    </span>
                  ) : (
                    <span className="absolute bottom-3 left-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      دارای قیمت
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold leading-6 text-zinc-800">
                      {s.name}
                    </h3>
                    {s.sourceUrl && (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:text-[#F58220]"
                        title="مشاهده در سایت منبع"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  {s.nameEn && (
                    <div className="mt-0.5 text-xs text-zinc-500" dir="ltr">
                      {s.nameEn}
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {s.priceText && (
                      <div className="flex items-center gap-1.5 text-zinc-700">
                        {s.contactForPrice ? (
                          <Phone size={14} className="text-amber-500" />
                        ) : (
                          <DollarSign size={14} className="text-emerald-500" />
                        )}
                        <b>{s.priceText}</b>
                      </div>
                    )}
                    {s.brandName && (
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <Tag size={14} className="text-zinc-400" />
                        {s.brandName}
                      </div>
                    )}
                    {s.categoryName && (
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <Filter size={14} className="text-zinc-400" />
                        {s.categoryName}
                      </div>
                    )}
                    {s.priceUsd != null && !s.contactForPrice && (
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <DollarSign size={14} className="text-emerald-500" />$
                        {toFa(s.priceUsd)}
                      </div>
                    )}
                  </div>

                  {s.description && (
                    <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-500">
                      {s.description}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end">
                    {isImported ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={16} />
                        در فروشگاه ثبت شد ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => importOne(s, idx)}
                        disabled={importing === k}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
                      >
                        {importing === k ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Plus size={14} />
                        )}
                        {importing === k ? "در حال ثبت..." : "افزودن به فروشگاه"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && suggestions.length === 0 && !error && !message && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <h3 className="text-lg font-bold text-zinc-600">آماده شروع</h3>
          <p className="mt-1 text-sm text-zinc-400">
            عبارت جستجو را وارد کنید (مثلاً «لنت ترمز پراید» یا «فیلتر هوا کامیون») و روی
            «جستجو» بزنید.
          </p>
        </div>
      )}

      {/* Close-message X (mobile-friendly) */}
      {message && (
        <button
          onClick={() => setMessage(null)}
          className="fixed bottom-6 left-6 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg md:hidden"
          aria-label="بستن"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
