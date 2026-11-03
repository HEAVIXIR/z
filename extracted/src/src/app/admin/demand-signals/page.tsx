"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Search,
} from "lucide-react";
import { toFa, faDate } from "@/lib/format";

/* ============================================================
   /admin/demand-signals — view demand signals from zero-result
   AI searches. Surfaces unserved demand to the ops team.
   ============================================================ */

type Signal = {
  id: string;
  query: string;
  category: string | null;
  brand: string | null;
  city: string | null;
  resultCount: number;
  intent: string | null;
  intentLabel: string | null;
  convertedToRequest: boolean;
  createdAt: string;
};

const INTENTS = [
  { value: "", label: "همه" },
  { value: "BUY", label: "خرید" },
  { value: "RENT", label: "اجاره" },
  { value: "COMPARE", label: "مقایسه" },
  { value: "RESEARCH", label: "تحقیق" },
  { value: "PARTS", label: "قطعات" },
  { value: "SERVICE", label: "خدمات" },
];

export default function DemandSignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?intent=${filter}&limit=100` : "?limit=100";
      const res = await fetch(`/api/admin/demand-signals${params}`);
      const json = await res.json();
      if (json.success) {
        setSignals(json.data || []);
        setStats(json.stats);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <TrendingUp className="h-6 w-6 text-[#F58220]" />
            سیگنال‌های تقاضا
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            جستجوهای بدون نتیجه — تقاضای پوشش‌داده‌نشده در بازار
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="کل سیگنال‌ها" value={stats.total} />
          <StatCard
            label="جستجوهای بدون نتیجه"
            value={stats.zeroResults}
            tone="red"
          />
          <StatCard label="تبدیل‌شده به درخواست" value={stats.converted} tone="emerald" />
          <StatCard
            label="نرخ تبدیل"
            value={stats.conversionRate}
            suffix="٪"
            tone="amber"
          />
        </div>
      )}

      {/* Intent filter */}
      <div className="flex flex-wrap items-center gap-2">
        {INTENTS.map((i) => (
          <button
            key={i.value || "all"}
            onClick={() => setFilter(i.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === i.value
                ? "bg-[#F58220] text-white"
                : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>

      {/* Top zero-result queries */}
      {stats?.topZeroQueries?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-amber-900">
            <Target className="h-4 w-4" />
            پرتکرارترین جستجوهای بدون نتیجه
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.topZeroQueries.map((q: any, idx: number) => (
              <span
                key={q.query}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800"
              >
                <span className="text-[10px] text-amber-500">#{toFa(idx + 1)}</span>
                {q.query}
                <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] text-amber-900">
                  {toFa(q.count)} بار
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Signals list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : signals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            هنوز سیگنال تقاضایی ثبت نشده. با جستجوهای بدون نتیجه در آی‌آی‌سرچ،
            این بخش به‌طور خودکار پر می‌شود.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-right font-bold">عبارت جستجو</th>
                <th className="px-4 py-3 text-center font-bold">نیت</th>
                <th className="px-4 py-3 text-center font-bold">برند/دسته</th>
                <th className="px-4 py-3 text-center font-bold">شهر</th>
                <th className="px-4 py-3 text-center font-bold">تبدیل</th>
                <th className="px-4 py-3 text-center font-bold">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {signals.map((s) => (
                <tr key={s.id} className="transition hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-bold text-zinc-800">
                      <Search className="h-3 w-3 text-zinc-400" />
                      {s.query}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.intentLabel ? (
                      <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                        {s.intentLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-500">
                    {[s.category, s.brand].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-500">
                    {s.city || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.convertedToRequest ? (
                      <span className="text-[10px] font-bold text-emerald-600">
                        بله
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-300">خیر</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-400">
                    {faDate(s.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone = "default",
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: "default" | "emerald" | "red" | "amber";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-black ${tones[tone]}`}>
        {toFa(value)}
        {suffix}
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
