"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Loader2,
  Search,
  GitCompare,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Cog,
  Wrench,
  Repeat,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/lifecycle — Lifecycle Marketplace funnel.
   Visual funnel showing counts per lifecycle stage.
   ============================================================ */

const STAGE_CFG: Record<
  string,
  {
    label: string;
    desc: string;
    icon: any;
    color: string;
    bg: string;
  }
> = {
  DISCOVER: {
    label: "کشف",
    desc: "کاربران در حال جستجو و کشف ماشین‌آلات",
    icon: Search,
    color: "text-blue-600",
    bg: "bg-blue-500",
  },
  COMPARE: {
    label: "مقایسه",
    desc: "آگهی‌های ویژه در حال مقایسه توسط کاربران",
    icon: GitCompare,
    color: "text-violet-600",
    bg: "bg-violet-500",
  },
  INSPECT: {
    label: "بازرسی",
    desc: "درخواست‌های کارشناسی ثبت شده",
    icon: ShieldCheck,
    color: "text-amber-600",
    bg: "bg-amber-500",
  },
  BUY: {
    label: "خرید",
    desc: "پیشنهادهای خرید فعال",
    icon: ShoppingCart,
    color: "text-emerald-600",
    bg: "bg-emerald-500",
  },
  TRANSPORT: {
    label: "حمل‌ونقل",
    desc: "ماشین‌آلات در مرحلهٔ حمل",
    icon: Truck,
    color: "text-cyan-600",
    bg: "bg-cyan-500",
  },
  OPERATE: {
    label: "بهره‌برداری",
    desc: "ماشین‌آلات اجاره‌ای فعال",
    icon: Cog,
    color: "text-orange-600",
    bg: "bg-orange-500",
  },
  MAINTAIN: {
    label: "نگهداری",
    desc: "سوابق سرویس و نگهداری",
    icon: Wrench,
    color: "text-rose-600",
    bg: "bg-rose-500",
  },
  RESELL: {
    label: "بازفروش",
    desc: "ماشین‌آلات فروخته‌شده یا بازفروخته‌شده",
    icon: Repeat,
    color: "text-teal-600",
    bg: "bg-teal-500",
  },
};

type Stage = {
  stage: string;
  order: number;
  count: number;
  pct: number;
};

export default function AdminLifecyclePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/lifecycle");
      const json = await res.json();
      setStages(json.stages || []);
      setSummary(json.summary);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  const totalCount = stages.reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Repeat className="h-6 w-6 text-[#F58220]" />
            چرخهٔ حیات بازار
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            توزیع ماشین‌آلات در مراحل هشت‌گانهٔ چرخهٔ حیات: از کشف تا بازفروش
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="کل آگهی‌ها" value={summary.totalListings} />
              <StatCard label="منتشر شده" value={summary.published} tone="emerald" />
              <StatCard label="فروخته شده" value={summary.sold} tone="red" />
              <StatCard label="ویژه" value={summary.featuredCount} tone="orange" />
              <StatCard label="تأیید شده" value={summary.verifiedCount} tone="blue" />
              <StatCard
                label="پیشنهادهای خرید"
                value={summary.totalOffers}
                tone="emerald"
              />
            </div>
          )}

          {/* Funnel */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-black text-zinc-900">
                قیف چرخهٔ حیات
              </h2>
              <span className="text-xs text-zinc-500">
                مجموع فعالیت: {toFa(totalCount)} مورد
              </span>
            </div>
            <div className="space-y-3">
              {stages.map((s) => {
                const cfg = STAGE_CFG[s.stage] ?? {
                  label: s.stage,
                  desc: "",
                  icon: Cog,
                  color: "text-zinc-600",
                  bg: "bg-zinc-500",
                };
                const Icon = cfg.icon;
                const widthPct = (s.count / maxCount) * 100;
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="flex w-32 shrink-0 items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 ${cfg.color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-zinc-800">
                          {cfg.label}
                        </p>
                        <p className="text-[9px] text-zinc-400">
                          مرحله {toFa(s.order)}
                        </p>
                      </div>
                    </div>
                    <div className="relative h-10 flex-1 overflow-hidden rounded-lg bg-zinc-50">
                      <div
                        className={`flex h-full items-center justify-end rounded-lg ${cfg.bg} transition-all`}
                        style={{ width: `${Math.max(8, widthPct)}%` }}
                      >
                        <span className="px-2 text-xs font-bold text-white">
                          {toFa(s.count)}
                        </span>
                      </div>
                    </div>
                    <span className="w-10 shrink-0 text-left text-[11px] text-zinc-500">
                      {toFa(s.pct)}٪
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stages.map((s) => {
              const cfg = STAGE_CFG[s.stage] ?? {
                label: s.stage,
                desc: "",
                icon: Cog,
                color: "text-zinc-600",
                bg: "bg-zinc-500",
              };
              const Icon = cfg.icon;
              return (
                <div
                  key={s.stage}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 ${cfg.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-2xl font-black text-zinc-900">
                      {toFa(s.count)}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-zinc-800">
                    {cfg.label}
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                    {cfg.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
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
  tone?: "default" | "emerald" | "red" | "orange" | "blue";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    orange: "text-[#F58220]",
    blue: "text-blue-600",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
      <p className={`text-xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
