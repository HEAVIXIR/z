"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, Users, Megaphone, Flame, Loader2, ArrowLeft,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/growth-engine — Supply/Demand engine dashboard
   Priority #63, #64
   ============================================================ */

type GrowthData = {
  supply: { total: number; newThisWeek: number; newThisMonth: number; verified: number; featured: number; growthRate: number };
  demand: { total: number; newThisWeek: number; newThisMonth: number; growthRate: number };
  sellers: { total: number; newThisWeek: number; buyerCount: number; ratio: number };
  funnel: { views: number; leads: number; offers: number; accepted: number; conversionRate: number };
  summary: { totalListings: number; totalRequests: number; totalSellers: number; pendingOffers: number; supplyDemandRatio: string };
};

export default function GrowthEnginePage() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/growth-engine")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); else setError(d.error ?? "خطا"); })
      .catch(() => setError("خطای شبکه"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div>;
  if (error || !data) return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm font-bold text-red-600">{error ?? "خطا"}</div>;

  const { supply, demand, sellers, funnel, summary } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <TrendingUp className="h-6 w-6 text-[#F58220]" />
          موتور رشد — عرضه و تقاضا
        </h1>
        <p className="mt-1 text-sm text-zinc-500">پیگیری همزمان موتور عرضه (فروشندگان + آگهی) و موتور تقاضا (درخواست‌ها + خریداران)</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
          <Megaphone className="mx-auto mb-1 h-5 w-5 text-[#F58220]" />
          <p className="text-lg font-black text-zinc-900">{toFa(summary.totalListings)}</p>
          <p className="text-[10px] text-zinc-500">آگهی</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
          <Flame className="mx-auto mb-1 h-5 w-5 text-[#F58220]" />
          <p className="text-lg font-black text-zinc-900">{toFa(summary.totalRequests)}</p>
          <p className="text-[10px] text-zinc-500">درخواست</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-teal-500" />
          <p className="text-lg font-black text-zinc-900">{toFa(summary.totalSellers)}</p>
          <p className="text-[10px] text-zinc-500">فروشنده</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
          <p className="text-lg font-black text-zinc-900">{toFa(funnel.conversionRate)}٪</p>
          <p className="text-[10px] text-zinc-500">نرخ تبدیل</p>
        </div>
        <div className="rounded-2xl border border-[#F58220]/30 bg-[#F58220]/5 p-4 text-center">
          <p className="text-lg font-black text-[#F58220]">{summary.supplyDemandRatio}</p>
          <p className="text-[10px] text-zinc-500">نسبت عرضه/تقاضا</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Supply Engine */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
            <Megaphone className="h-4 w-4 text-emerald-500" />
            موتور عرضه (Supply)
          </h2>
          <div className="space-y-3">
            <MetricRow label="کل آگهی" value={supply.total} />
            <MetricRow label="آگهی جدید این هفته" value={supply.newThisWeek} badge={`+${toFa(supply.growthRate)}٪`} />
            <MetricRow label="آگهی جدید این ماه" value={supply.newThisMonth} />
            <MetricRow label="آگهی تأییدشده" value={supply.verified} />
            <MetricRow label="آگهی ویژه" value={supply.featured} />
          </div>
        </div>

        {/* Demand Engine */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
            <Flame className="h-4 w-4 text-[#F58220]" />
            موتور تقاضا (Demand)
          </h2>
          <div className="space-y-3">
            <MetricRow label="کل درخواست خرید" value={demand.total} />
            <MetricRow label="درخواست جدید این هفته" value={demand.newThisWeek} badge={`+${toFa(demand.growthRate)}٪`} />
            <MetricRow label="درخواست جدید این ماه" value={demand.newThisMonth} />
            <MetricRow label="پیشنهاد قیمت معوق" value={summary.pendingOffers} />
            <MetricRow label="خریداران" value={sellers.buyerCount} />
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
            <TrendingUp className="h-4 w-4 text-[#F58220]" />
            قیف تبدیل (Funnel)
          </h2>
          <div className="space-y-2">
            <FunnelRow label="بازدید" value={funnel.views} max={funnel.views} color="bg-blue-500" />
            <FunnelRow label="سرنخ" value={funnel.leads} max={funnel.views} color="bg-teal-500" />
            <FunnelRow label="پیشنهاد قیمت" value={funnel.offers} max={funnel.views} color="bg-[#F58220]" />
            <FunnelRow label="پذیرفته‌شده" value={funnel.accepted} max={funnel.views} color="bg-emerald-500" />
          </div>
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-2xl font-black text-emerald-600">{toFa(funnel.conversionRate)}٪</p>
            <p className="text-[10px] text-zinc-500">نرخ تبدیل سرنخ به معامله</p>
          </div>
        </div>

        {/* Seller metrics */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700">
            <Users className="h-4 w-4 text-teal-500" />
            متریک فروشندگان
          </h2>
          <div className="space-y-3">
            <MetricRow label="کل فروشندگان" value={sellers.total} />
            <MetricRow label="فروشنده جدید این هفته" value={sellers.newThisWeek} />
            <MetricRow label="خریداران" value={sellers.buyerCount} />
            <MetricRow label="نسبت خریدار/فروشنده" value={sellers.ratio} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, badge }: { label: string; value: number; badge?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-2.5">
      <span className="text-sm text-zinc-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-zinc-800">{toFa(value)}</span>
        {badge && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">{badge}</span>}
      </div>
    </div>
  );
}

function FunnelRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-600">{label}</span>
        <span className="font-bold text-zinc-800">{toFa(value)} ({toFa(pct)}٪)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
