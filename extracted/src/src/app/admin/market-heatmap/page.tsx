"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { toFa } from "@/lib/format";
import {
  Flame,
  TrendingUp,
  Eye,
  Megaphone,
  Search as SearchIcon,
  Loader2,
  RefreshCw,
  MapPin,
} from "lucide-react";

/* ============================================================
   /admin/market-heatmap — Market Heatmap admin page.

   Renders a category × province heatmap with three metrics:
     • listings  (count of PUBLISHED listings)
     • views     (sum of Listing.viewCount)
     • searches  (count of SearchQuery)

   Below the matrix: hot categories list + hot provinces list.

   Data is fetched from the public /api/market-heatmap endpoint
   (no auth needed for read; the page itself is admin-gated by
   the layout).
   ============================================================ */

type Metric = "listings" | "searches" | "views";

type Cell = {
  categorySlug: string;
  categoryName: string;
  provinceSlug: string;
  provinceName: string;
  intensity: number;
  rawValue: number;
};

type HotCategory = {
  category: { id: string; slug: string; name: string; icon: string | null };
  listingCount: number;
  searchCount: number;
  viewCount: number;
  heatScore: number;
};

type HotProvince = {
  province: { id: string; slug: string; name: string; nameEn: string | null };
  listingCount: number;
  searchCount: number;
  viewCount: number;
  heatScore: number;
};

const METRICS: { value: Metric; label: string; icon: any }[] = [
  { value: "listings", label: "آگهی‌ها", icon: Megaphone },
  { value: "views", label: "بازدیدها", icon: Eye },
  { value: "searches", label: "جستجوها", icon: SearchIcon },
];

const DAY_OPTIONS = [7, 30, 90];

export default function MarketHeatmapPage() {
  const [metric, setMetric] = useState<Metric>("listings");
  const [days, setDays] = useState(30);
  const [cells, setCells] = useState<Cell[]>([]);
  const [hotCats, setHotCats] = useState<HotCategory[]>([]);
  const [hotProvs, setHotProvs] = useState<HotProvince[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matrixRes, catsRes, provsRes] = await Promise.all([
        fetch(`/api/market-heatmap?metric=${metric}&days=${days}&action=matrix`, {
          cache: "no-store",
        }),
        fetch(`/api/market-heatmap?days=${days}&action=hot-categories`, {
          cache: "no-store",
        }),
        fetch(`/api/market-heatmap?days=${days}&action=hot-provinces`, {
          cache: "no-store",
        }),
      ]);
      const [matrix, cats, provs] = await Promise.all([
        matrixRes.json(),
        catsRes.json(),
        provsRes.json(),
      ]);
      if (matrix.success) setCells(matrix.cells ?? []);
      else setError(matrix.error ?? "خطا در دریافت نقشه حرارتی");
      if (cats.success) setHotCats(cats.rows ?? []);
      if (provs.success) setHotProvs(provs.rows ?? []);
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }, [metric, days]);

  useEffect(() => {
    load();
  }, [load]);

  // Build the matrix shape from the flat cells array.
  const { categoryRows, provinceCols, cellMap, maxValue } = useMemo(() => {
    const catMap = new Map<string, { slug: string; name: string }>();
    const provMap = new Map<string, { slug: string; name: string }>();
    const map = new Map<string, Cell>(); // key = `${catSlug}::${provSlug}`
    let max = 0;

    for (const c of cells) {
      catMap.set(c.categorySlug, { slug: c.categorySlug, name: c.categoryName });
      provMap.set(c.provinceSlug, { slug: c.provinceSlug, name: c.provinceName });
      map.set(`${c.categorySlug}::${c.provinceSlug}`, c);
      if (c.rawValue > max) max = c.rawValue;
    }

    // Sort categories by total raw value (sum across provinces) desc,
    // so the hottest categories are at the top.
    const catTotals = new Map<string, number>();
    for (const c of cells) {
      catTotals.set(
        c.categorySlug,
        (catTotals.get(c.categorySlug) ?? 0) + c.rawValue,
      );
    }
    const categoryRows = Array.from(catMap.values()).sort((a, b) => {
      const ta = catTotals.get(a.slug) ?? 0;
      const tb = catTotals.get(b.slug) ?? 0;
      return tb - ta;
    });

    // Sort provinces by total raw value desc.
    const provTotals = new Map<string, number>();
    for (const c of cells) {
      provTotals.set(
        c.provinceSlug,
        (provTotals.get(c.provinceSlug) ?? 0) + c.rawValue,
      );
    }
    const provinceCols = Array.from(provMap.values()).sort((a, b) => {
      const ta = provTotals.get(a.slug) ?? 0;
      const tb = provTotals.get(b.slug) ?? 0;
      return tb - ta;
    });

    return { categoryRows, provinceCols, cellMap: map, maxValue: max };
  }, [cells]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Flame className="h-6 w-6 text-[#F58220]" />
            نقشه حرارتی بازار
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            شدت فعالیت بازار بر اساس دسته × استان — شناسایی مناطق داغ
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        {/* Metric selector */}
        <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1">
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => setMetric(m.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  metric === m.value
                    ? "bg-white text-[#F58220] shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Days selector */}
        <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                days === d
                  ? "bg-white text-[#F58220] shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {toFa(d)} روز
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="mr-auto flex items-center gap-2 text-[11px] text-zinc-500">
          <span>شدت:</span>
          <span className="inline-block h-4 w-4 rounded border border-zinc-200" style={{ background: "rgba(34,197,94,0.05)" }} />
          <span>کم</span>
          <span className="inline-block h-4 w-4 rounded border border-zinc-200" style={{ background: "rgba(34,197,94,0.4)" }} />
          <span className="inline-block h-4 w-4 rounded border border-zinc-200" style={{ background: "rgba(34,197,94,0.7)" }} />
          <span className="inline-block h-4 w-4 rounded border border-zinc-200" style={{ background: "rgba(34,197,94,1)" }} />
          <span>زیاد</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Heatmap matrix */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-black text-zinc-800">
          ماتریس فعالیت: {METRICS.find((m) => m.value === metric)?.label} در {toFa(days)} روز اخیر
        </h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
          </div>
        ) : cells.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-400">
            در این بازه زمانی داده‌ای برای نمایش وجود ندارد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky right-0 z-10 border-b border-l border-zinc-200 bg-zinc-50 px-3 py-2 text-right font-bold text-zinc-600">
                    دسته / استان
                  </th>
                  {provinceCols.map((p) => (
                    <th
                      key={p.slug}
                      className="border-b border-l border-zinc-200 bg-zinc-50 px-2 py-2 text-center font-bold text-zinc-600 whitespace-nowrap"
                      title={p.name}
                    >
                      <span className="inline-block max-w-[80px] truncate align-middle">
                        {p.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((cat) => (
                  <tr key={cat.slug} className="hover:bg-zinc-50/50">
                    <td className="sticky right-0 z-10 border-b border-l border-zinc-200 bg-white px-3 py-2 text-right font-bold text-zinc-700 whitespace-nowrap">
                      <Link
                        href={`/categories/${cat.slug}`}
                        className="text-[#F58220] hover:underline"
                        target="_blank"
                      >
                        {cat.name}
                      </Link>
                    </td>
                    {provinceCols.map((p) => {
                      const cell = cellMap.get(`${cat.slug}::${p.slug}`);
                      if (!cell) {
                        return (
                          <td
                            key={`${cat.slug}-${p.slug}`}
                            className="border-b border-l border-zinc-100 bg-zinc-50/30 px-2 py-2 text-center text-[10px] text-zinc-300"
                          >
                            —
                          </td>
                        );
                      }
                      const bg = `rgba(34,197,94,${(0.1 + cell.intensity * 0.9).toFixed(2)})`;
                      const textColor = cell.intensity > 0.5 ? "text-white" : "text-zinc-700";
                      return (
                        <td
                          key={`${cat.slug}-${p.slug}`}
                          className="border-b border-l border-zinc-100 px-2 py-2 text-center font-bold whitespace-nowrap"
                          style={{ background: bg }}
                          title={`${cat.name} × ${p.name}: ${toFa(cell.rawValue)}`}
                        >
                          <span className={textColor}>{toFa(cell.rawValue)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && cells.length > 0 && (
          <p className="mt-3 text-[11px] text-zinc-500">
            بیشترین مقدار در ماتریس: {toFa(maxValue)} — رنگ هر سلول بر اساس شدت نسبی آن (۰ تا ۱) تنظیم شده است.
          </p>
        )}
      </div>

      {/* Hot categories + provinces */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hot categories */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-800">
            <TrendingUp className="h-4 w-4 text-[#F58220]" />
            دسته‌های داغ
          </h2>
          <p className="mb-3 text-[11px] text-zinc-500">
            ترکیب آگهی، جستجو و بازدید در {toFa(days)} روز اخیر
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
            </div>
          ) : hotCats.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-xs text-zinc-400">
              داده‌ای موجود نیست
            </p>
          ) : (
            <ul className="space-y-2">
              {hotCats.slice(0, 10).map((c, idx) => (
                <li
                  key={c.category.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F58220]/10 text-xs font-black text-[#F58220]">
                    {toFa(idx + 1)}
                  </span>
                  <span className="text-lg">{c.category.icon ?? "📁"}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/categories/${c.category.slug}`}
                      className="block truncate text-sm font-bold text-zinc-800 hover:text-[#F58220]"
                      target="_blank"
                    >
                      {c.category.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500">
                      <span>{toFa(c.listingCount)} آگهی</span>
                      <span>·</span>
                      <span>{toFa(c.searchCount)} جستجو</span>
                      <span>·</span>
                      <span>{toFa(c.viewCount)} بازدید</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-left">
                    <div className="text-xs font-black text-emerald-600">
                      {toFa(Math.round(c.heatScore * 100))}
                    </div>
                    <div className="text-[9px] text-zinc-400">امتیاز</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hot provinces */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-800">
            <MapPin className="h-4 w-4 text-[#F58220]" />
            استان‌های داغ
          </h2>
          <p className="mb-3 text-[11px] text-zinc-500">
            ترکیب آگهی و بازدید در {toFa(days)} روز اخیر
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
            </div>
          ) : hotProvs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-xs text-zinc-400">
              داده‌ای موجود نیست
            </p>
          ) : (
            <ul className="space-y-2">
              {hotProvs.slice(0, 10).map((p, idx) => (
                <li
                  key={p.province.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F58220]/10 text-xs font-black text-[#F58220]">
                    {toFa(idx + 1)}
                  </span>
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-800">
                      {p.province.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500">
                      <span>{toFa(p.listingCount)} آگهی</span>
                      <span>·</span>
                      <span>{toFa(p.viewCount)} بازدید</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-left">
                    <div className="text-xs font-black text-emerald-600">
                      {toFa(Math.round(p.heatScore * 100))}
                    </div>
                    <div className="text-[9px] text-zinc-400">امتیاز</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
