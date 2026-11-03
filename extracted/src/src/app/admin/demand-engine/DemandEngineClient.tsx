"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Search,
  TrendingUp,
  TrendingDown,
  Flame,
  FolderTree,
  Tag,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   Client-side UI for /admin/demand-engine.
   ============================================================ */

type ZeroResult = {
  query: string;
  normalizedQuery: string;
  count: number;
  lastSeen: string;
};

type Popular = {
  query: string;
  normalizedQuery: string;
  count: number;
  trend: number | null;
};

type CategoryDemand = {
  category: { id: string; name: string; slug: string } | null;
  searchCount: number;
  listingCount: number;
  demandScore: number;
};

type BrandDemand = {
  brand: { id: string; name: string; slug: string } | null;
  searchCount: number;
  listingCount: number;
  demandScore: number;
};

type Tab = "zero" | "popular" | "category" | "brand";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "zero", label: "جستجوهای بدون نتیجه", icon: Search },
  { id: "popular", label: "جستجوهای پرمخاطب", icon: Flame },
  { id: "category", label: "تقاضا بر اساس دسته", icon: FolderTree },
  { id: "brand", label: "تقاضا بر اساس برند", icon: Tag },
];

export default function DemandEngineClient({
  days,
  totalCount,
  zeroResults,
  popular,
  byCategory,
  byBrand,
}: {
  days: number;
  totalCount: number;
  zeroResults: ZeroResult[];
  popular: Popular[];
  byCategory: CategoryDemand[];
  byBrand: BrandDemand[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("zero");

  const daysOptions = [7, 14, 30, 60, 90];

  const stats = useMemo(() => {
    const zeroCount = zeroResults.reduce((s, q) => s + q.count, 0);
    const popularCount = popular.reduce((s, q) => s + q.count, 0);
    const uniqueQueries = new Set<string>([
      ...zeroResults.map((q) => q.normalizedQuery),
      ...popular.map((q) => q.normalizedQuery),
    ]);
    return {
      zeroCount,
      popularCount,
      uniqueQueries: uniqueQueries.size,
    };
  }, [zeroResults, popular]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Activity className="h-6 w-6 text-[#F58220]" />
            موتور تقاضا
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            تحلیل تقاضای جستجوی کاربران — بدون‌نتیجه، پرمخاطب، و تقاضا در برابر عرضه
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-500">بازه:</span>
          {daysOptions.map((d) => (
            <button
              key={d}
              onClick={() => router.push(`/admin/demand-engine?days=${d}`)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                days === d
                  ? "bg-[#F58220] text-white"
                  : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {toFa(d)} روز
            </button>
          ))}
          <button
            onClick={() => router.refresh()}
            className="mr-2 inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            به‌روزرسانی
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="کل جستجوها" value={totalCount} tone="default" />
        <StatCard label="جستجوهای بدون‌نتیجه" value={stats.zeroCount} tone="red" />
        <StatCard label="جستجوهای پرمخاطب" value={stats.popularCount} tone="amber" />
        <StatCard label="عبارات یکتا" value={stats.uniqueQueries} tone="emerald" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === t.id
                  ? "bg-[#F58220] text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "zero" && <ZeroResultsTable rows={zeroResults} />}
      {tab === "popular" && <PopularTable rows={popular} />}
      {tab === "category" && <DemandTable rows={byCategory} kind="category" />}
      {tab === "brand" && <DemandTable rows={byBrand} kind="brand" />}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "red" | "amber" | "emerald";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    red: "text-red-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <Search className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
      <p className="text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function ZeroResultsTable({ rows }: { rows: ZeroResult[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState text="هنوز جستجوی بدون‌نتیجه‌ای ثبت نشده. با جستجوهای کاربران این بخش به‌طور خودکار پر می‌شود." />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-right font-bold">#</th>
              <th className="px-4 py-3 text-right font-bold">عبارت جستجو</th>
              <th className="px-4 py-3 text-center font-bold">تعداد تکرار</th>
              <th className="px-4 py-3 text-center font-bold">آخرین بار</th>
              <th className="px-4 py-3 text-center font-bold">عمل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r, i) => (
              <tr key={`${r.normalizedQuery}-${i}`} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-center text-xs text-zinc-400">
                  {toFa(i + 1)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-zinc-800">
                  {r.query}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                    {toFa(r.count)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-zinc-500">
                  {new Date(r.lastSeen).toLocaleDateString("fa-IR")}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/listings?q=${encodeURIComponent(r.query)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-bold text-zinc-500 hover:border-[#F58220] hover:text-[#F58220]"
                  >
                    <Search className="h-3 w-3" />
                    جستجو
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PopularTable({ rows }: { rows: Popular[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState text="هنوز جستجوی پرمخاطبی ثبت نشده." />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-right font-bold">#</th>
              <th className="px-4 py-3 text-right font-bold">عبارت جستجو</th>
              <th className="px-4 py-3 text-center font-bold">تعداد</th>
              <th className="px-4 py-3 text-center font-bold">روند</th>
              <th className="px-4 py-3 text-center font-bold">عمل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r, i) => (
              <tr key={`${r.normalizedQuery}-${i}`} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-center text-xs text-zinc-400">
                  {toFa(i + 1)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-zinc-800">
                  {r.query}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-xs font-bold text-[#F58220]">
                    {toFa(r.count)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <TrendBadge trend={r.trend} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/listings?q=${encodeURIComponent(r.query)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-bold text-zinc-500 hover:border-[#F58220] hover:text-[#F58220]"
                  >
                    <Search className="h-3 w-3" />
                    جستجو
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
        <Minus className="h-3 w-3" />
        جدید
      </span>
    );
  }
  if (trend > 1.2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <TrendingUp className="h-3 w-3" />
        +{toFa(Math.round((trend - 1) * 100))}٪
      </span>
    );
  }
  if (trend < 0.8) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
        <TrendingDown className="h-3 w-3" />
        {toFa(Math.round((1 - trend) * 100))}٪
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
      <Minus className="h-3 w-3" />
      پایدار
    </span>
  );
}

function DemandTable({
  rows,
  kind,
}: {
  rows: Array<CategoryDemand | BrandDemand>;
  kind: "category" | "brand";
}) {
  if (rows.length === 0) {
    return (
      <EmptyState text={`هنوز سیگنال تقاضایی برای ${kind === "category" ? "دسته" : "برند"}ی ثبت نشده.`} />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-right font-bold">
                {kind === "category" ? "دسته" : "برند"}
              </th>
              <th className="px-4 py-3 text-center font-bold">تقاضا (جستجو)</th>
              <th className="px-4 py-3 text-center font-bold">عرضه (آگهی)</th>
              <th className="px-4 py-3 text-center font-bold">شاخص تقاضا</th>
              <th className="px-4 py-3 text-center font-bold">عمل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r, i) => {
              const ent = kind === "category" ? (r as CategoryDemand).category : (r as BrandDemand).brand;
              const href = ent
                ? kind === "category"
                  ? `/categories/${ent.slug}`
                  : `/brands/${ent.slug}`
                : null;
              return (
                <tr key={`${kind}-${ent?.id ?? "unknown"}-${i}`} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-right font-bold text-zinc-800">
                    {ent ? (
                      <Link
                        href={href!}
                        target="_blank"
                        className="hover:text-[#F58220]"
                      >
                        {ent.name}
                      </Link>
                    ) : (
                      <span className="text-zinc-400">نامشخص (slug حذف‌شده)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-xs font-bold text-[#F58220]">
                      {toFa(r.searchCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600">
                      {toFa(r.listingCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DemandScoreBadge score={r.demandScore} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ent && (
                      <Link
                        href={href!}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-bold text-zinc-500 hover:border-[#F58220] hover:text-[#F58220]"
                      >
                        <ArrowUp className="h-3 w-3" />
                        مشاهده
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DemandScoreBadge({ score }: { score: number }) {
  // 0-100: higher = more demand relative to supply
  let tone = "bg-zinc-100 text-zinc-600";
  let label = "پایدار";
  if (score >= 70) {
    tone = "bg-red-50 text-red-700";
    label = "تقاضای بالا";
  } else if (score >= 40) {
    tone = "bg-amber-50 text-amber-700";
    label = "تقاضای متوسط";
  } else if (score < 20 && score > 0) {
    tone = "bg-emerald-50 text-emerald-700";
    label = "عرضه بالا";
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {label} · {toFa(score)}
    </span>
  );
}
