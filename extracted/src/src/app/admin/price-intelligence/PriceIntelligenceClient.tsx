"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Loader2,
  RefreshCw,
  Gauge,
  AlertTriangle,
  History,
  Lightbulb,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { toFa, formatCompactPrice } from "@/lib/format";

/* ============================================================
   Client-side UI for /admin/price-intelligence.
   Receives SSR-loaded stats rows + outliers from the server page
   and additionally fetches monthly history + suggestions from
   the public API for the active filter.
   ============================================================ */

type Filter = { category: string; brand: string; year: string };

type StatsRow = {
  categoryId: string | null;
  brandId: string | null;
  categoryName: string;
  brandName: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
};

type OutlierRow = {
  id: string;
  title: string;
  slug: string;
  price: string;
  year: number | null;
  brandName: string | null;
  categoryName: string | null;
  deviation: number;
  median: number;
  direction: "above" | "below";
};

type HistoryPoint = { month: string; avgPrice: number | null; count: number };
type Suggestion = {
  suggestedMin: number | null;
  suggestedMax: number | null;
  suggestedAvg: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sampleSize: number;
};

export default function PriceIntelligenceClient({
  categories,
  brands,
  filters,
  statsRows,
  outliers,
  categoryId,
  brandId,
  year,
}: {
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  filters: Filter;
  statsRows: StatsRow[];
  outliers: OutlierRow[];
  categoryId: string;
  brandId: string;
  year: number | undefined;
}) {
  const router = useRouter();
  const [localFilters, setLocalFilters] = useState<Filter>(filters);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (localFilters.category) params.set("category", localFilters.category);
    if (localFilters.brand) params.set("brand", localFilters.brand);
    if (localFilters.year) params.set("year", localFilters.year);
    router.push(`/admin/price-intelligence?${params.toString()}`);
  };

  // Fetch history + suggestions for the current filter
  useEffect(() => {
    let cancelled = false;
    setLoadingExtra(true);
    Promise.all([
      fetch(
        `/api/price-intelligence?action=history&${new URLSearchParams({
          ...(categoryId ? { categoryId } : {}),
          ...(brandId ? { brandId } : {}),
          months: "12",
        }).toString()}`,
      ).then((r) => r.json()),
      categoryId
        ? fetch(
            `/api/price-intelligence?action=suggestions&${new URLSearchParams({
              categoryId,
              ...(brandId ? { brandId } : {}),
              ...(year ? { year: String(year) } : {}),
            }).toString()}`,
          ).then((r) => r.json())
        : Promise.resolve(null),
    ])
      .then(([h, s]) => {
        if (cancelled) return;
        setHistory(h?.points ?? []);
        setSuggestion(s ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setHistory([]);
        setSuggestion(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingExtra(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, brandId, year]);

  const maxHistoryAvg = useMemo(() => {
    const vals = history.map((h) => h.avgPrice ?? 0);
    return vals.length ? Math.max(...vals) : 0;
  }, [history]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <TrendingUp className="h-6 w-6 text-[#F58220]" />
            هوش قیمتی
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            تحلیل قیمت‌های ثبت‌شده در آگهی‌ها — میانگین، میانه، تاریخچه و کشف خارج‌ازحد
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-500">دسته</span>
            <select
              value={localFilters.category}
              onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-700 outline-none focus:border-[#F58220]"
            >
              <option value="">همه</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-500">برند</span>
            <select
              value={localFilters.brand}
              onChange={(e) => setLocalFilters({ ...localFilters, brand: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-700 outline-none focus:border-[#F58220]"
            >
              <option value="">همه</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-500">سال</span>
            <input
              type="number"
              value={localFilters.year}
              onChange={(e) => setLocalFilters({ ...localFilters, year: e.target.value })}
              placeholder="مثلاً ۱۴۰۲"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-700 outline-none focus:border-[#F58220]"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={applyFilters}
              className="w-full rounded-xl bg-[#F58220] px-4 py-2 text-sm font-black text-white transition hover:bg-[#e67414]"
            >
              اعمال فیلتر
            </button>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {suggestion && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="پیشنهاد کمینه" value={suggestion.suggestedMin ? formatCompactPrice(suggestion.suggestedMin) : "—"} tone="emerald" icon={ArrowDown} />
          <Card label="پیشنهاد میانگین" value={suggestion.suggestedAvg ? formatCompactPrice(suggestion.suggestedAvg) : "—"} tone="amber" icon={Gauge} />
          <Card label="پیشنهاد بیشینه" value={suggestion.suggestedMax ? formatCompactPrice(suggestion.suggestedMax) : "—"} tone="violet" icon={ArrowUp} />
          <Card label="اعتماد" value={suggestion.confidence === "HIGH" ? "بالا" : suggestion.confidence === "MEDIUM" ? "متوسط" : "پایین"} subValue={`نمونه: ${toFa(suggestion.sampleSize)}`} tone="default" icon={Lightbulb} />
        </div>
      )}

      {/* Stats table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-[#F58220]" />
          <h2 className="text-sm font-black text-zinc-800">آمار قیمت‌ها بر اساس دسته + برند</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
            {toFa(statsRows.length)} گروه
          </span>
        </div>
        {statsRows.length === 0 ? (
          <p className="text-xs text-zinc-400">رکورد قیمتی برای این فیلتر موجود نیست.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">دسته</th>
                  <th className="px-3 py-2 text-right font-bold">برند</th>
                  <th className="px-3 py-2 text-center font-bold">میانگین</th>
                  <th className="px-3 py-2 text-center font-bold">کمینه</th>
                  <th className="px-3 py-2 text-center font-bold">بیشینه</th>
                  <th className="px-3 py-2 text-center font-bold">تعداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {statsRows.map((r, i) => (
                  <tr key={`${r.categoryId}-${r.brandId}-${i}`} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-right font-bold text-zinc-700">{r.categoryName}</td>
                    <td className="px-3 py-2 text-right text-zinc-500">{r.brandName}</td>
                    <td className="px-3 py-2 text-center font-bold text-[#F58220]">
                      {r.avg != null ? formatCompactPrice(r.avg) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-zinc-500">
                      {r.min != null ? formatCompactPrice(r.min) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-zinc-500">
                      {r.max != null ? formatCompactPrice(r.max) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-zinc-600">
                      {toFa(r.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-[#F58220]" />
          <h2 className="text-sm font-black text-zinc-800">تاریخچه ماهانه (۱۲ ماه اخیر)</h2>
          {loadingExtra && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F58220]" />}
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-zinc-400">داده‌ای برای این فیلتر موجود نیست.</p>
        ) : (
          <div className="space-y-1.5">
            {history.map((h) => {
              const val = h.avgPrice ?? 0;
              const pct = maxHistoryAvg > 0 ? (val / maxHistoryAvg) * 100 : 0;
              return (
                <div key={h.month} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[11px] font-bold text-zinc-500" dir="ltr">
                    {h.month}
                  </span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-zinc-100">
                    <div
                      className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#F58220] to-[#ffa84d] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2">
                      <span className="text-[10px] font-bold text-zinc-400">
                        {toFa(h.count)} رکورد
                      </span>
                      <span className="text-[11px] font-black text-zinc-800">
                        {val ? formatCompactPrice(val) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outliers */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-black text-zinc-800">آگهی‌های خارج‌ازحد (≥ ۵۰٪ انحراف از میانه)</h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            {toFa(outliers.length)} مورد
          </span>
        </div>
        {outliers.length === 0 ? (
          <p className="text-xs text-zinc-400">آگهی خارج‌ازحدی شناسایی نشد.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">عنوان</th>
                  <th className="px-3 py-2 text-center font-bold">برند / دسته</th>
                  <th className="px-3 py-2 text-center font-bold">قیمت</th>
                  <th className="px-3 py-2 text-center font-bold">میانه</th>
                  <th className="px-3 py-2 text-center font-bold">انحراف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {outliers.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-right font-bold text-zinc-700">
                      <Link
                        href={`/listings/${o.slug}`}
                        target="_blank"
                        className="hover:text-[#F58220]"
                      >
                        {o.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-zinc-500">
                      {[o.brandName, o.categoryName].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-zinc-700">
                      {formatCompactPrice(BigInt(o.price))}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-zinc-500">
                      {formatCompactPrice(o.median)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          o.direction === "above"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {o.direction === "above" ? "بالاتر" : "پایین‌تر"}{" "}
                        {toFa(Math.abs(Math.round(o.deviation * 100)))}٪
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  subValue,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  tone?: "default" | "emerald" | "amber" | "violet";
  icon: any;
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-300" />
      </div>
      <p className={`mt-2 text-lg font-black ${tones[tone]}`}>{value}</p>
      {subValue && <p className="mt-0.5 text-[10px] text-zinc-400">{subValue}</p>}
    </div>
  );
}
