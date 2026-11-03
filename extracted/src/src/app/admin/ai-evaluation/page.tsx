"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  RefreshCw,
  Loader2,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  Activity,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/ai-evaluation — AI Evaluation dashboard.
   Shows accuracy, avg latency, cost estimate, by task type.
   ============================================================ */

type ByTask = {
  taskType: string;
  total: number;
  success: number;
  accuracy: number;
  avgLatency: number | null;
  totalCost: number;
};

type Metrics = {
  totalRequests: number;
  successCount: number;
  accuracy: number;
  avgLatency: number;
  maxLatency: number;
  totalCost: number;
  avgCost: number;
};

type DayPoint = {
  date: string;
  total: number;
  success: number;
  cost: number;
};

const TASK_LABELS: Record<string, string> = {
  SEARCH: "جستجو",
  SEMANTIC_SEARCH: "جستجوی معنایی",
  LISTING_BUILDER: "سازنده آگهی",
  PRICE_ANALYSIS: "تحلیل قیمت",
  MARKET_ANALYST: "تحلیل‌گر بازار",
  SELLER_ASSISTANT: "دستیار فروشنده",
  SCRAPER: "اسکرپر",
  MODERATION: "تأیید محتوا",
};

export default function AdminAiEvaluationPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [byTask, setByTask] = useState<ByTask[]>([]);
  const [timeseries, setTimeseries] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-evaluation");
      const json = await res.json();
      setMetrics(json.metrics);
      setByTask(json.byTask || []);
      setTimeseries(json.timeseries || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxTotal = Math.max(1, ...timeseries.map((t) => t.total));
  const maxCost = Math.max(0.0001, ...timeseries.map((t) => t.cost));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Brain className="h-6 w-6 text-[#F58220]" />
            ارزیابی هوش مصنوعی
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            معیارهای عملکرد هوش مصنوعی: دقت، تأخیر، هزینه و تحلیل بر اساس نوع
            وظیفه
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
          {/* Top metrics */}
          {metrics && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <MetricCard
                icon={<Activity className="h-4 w-4" />}
                label="کل درخواست‌ها"
                value={toFa(metrics.totalRequests)}
              />
              <MetricCard
                icon={<Target className="h-4 w-4" />}
                label="دقت (نرخ موفقیت)"
                value={`${toFa(metrics.accuracy)}٪`}
                tone="emerald"
              />
              <MetricCard
                icon={<Clock className="h-4 w-4" />}
                label="میانگین تأخیر"
                value={`${toFa(metrics.avgLatency)}ms`}
                tone="blue"
              />
              <MetricCard
                icon={<Clock className="h-4 w-4" />}
                label="بیشترین تأخیر"
                value={`${toFa(metrics.maxLatency)}ms`}
                tone="amber"
              />
              <MetricCard
                icon={<DollarSign className="h-4 w-4" />}
                label="هزینه کل (۳۰ روز)"
                value={`$${toFa(metrics.totalCost.toFixed(2))}`}
                tone="red"
              />
              <MetricCard
                icon={<DollarSign className="h-4 w-4" />}
                label="میانگین هزینه/درخواست"
                value={`$${toFa(metrics.avgCost.toFixed(4))}`}
                tone="red"
              />
            </div>
          )}

          {/* Timeseries chart */}
          {timeseries.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-900">
                <TrendingUp className="h-4 w-4 text-[#F58220]" />
                روند ۱۴ روز اخیر
              </h2>
              <div className="flex h-48 items-end gap-1.5">
                {timeseries.map((d) => {
                  const heightPct = (d.total / maxTotal) * 100;
                  const costPct = (d.cost / maxCost) * 100;
                  return (
                    <div
                      key={d.date}
                      className="group relative flex flex-1 flex-col items-center justify-end"
                      title={`${d.date}: ${d.total} درخواست`}
                    >
                      <div className="absolute -top-7 hidden rounded bg-zinc-900 px-2 py-1 text-[10px] text-white group-hover:block">
                        {toFa(d.total)} درخواست
                      </div>
                      <div
                        className="relative flex w-full flex-col justify-end overflow-hidden rounded-t"
                        style={{ height: "100%" }}
                      >
                        <div
                          className="absolute bottom-0 w-full bg-[#F58220]/80"
                          style={{ height: `${heightPct}%` }}
                        />
                        <div
                          className="absolute bottom-0 w-full bg-[#F58220]"
                          style={{ height: `${costPct}%` }}
                        />
                      </div>
                      <span className="mt-1 text-[9px] text-zinc-400">
                        {toFa(new Date(d.date).getDate())}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded bg-[#F58220]/80" />
                  تعداد درخواست
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded bg-[#F58220]" />
                  هزینه (نسبی)
                </span>
              </div>
            </div>
          )}

          {/* By task type breakdown */}
          {byTask.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-3">
                <h2 className="text-sm font-black text-zinc-900">
                  مقایسه بر اساس نوع وظیفه
                </h2>
              </div>
              <table className="w-full text-right text-sm">
                <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">نوع وظیفه</th>
                    <th className="px-4 py-3 font-bold">درخواست</th>
                    <th className="px-4 py-3 font-bold">موفق</th>
                    <th className="px-4 py-3 font-bold">دقت</th>
                    <th className="px-4 py-3 font-bold">تأخیر متوسط</th>
                    <th className="px-4 py-3 font-bold">هزینه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {byTask.map((b) => (
                    <tr key={b.taskType} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-800">
                          {TASK_LABELS[b.taskType] ?? b.taskType}
                        </div>
                        <code className="font-mono text-[10px] text-zinc-400">
                          {b.taskType}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {toFa(b.total)}
                      </td>
                      <td className="px-4 py-3 text-emerald-600">
                        {toFa(b.success)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className={`h-full ${
                                b.accuracy >= 80
                                  ? "bg-emerald-500"
                                  : b.accuracy >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${b.accuracy}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-zinc-700">
                            {toFa(b.accuracy)}٪
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {b.avgLatency ? `${toFa(b.avgLatency)}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-red-600">
                        ${toFa(b.totalCost.toFixed(4))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {byTask.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
              <Brain className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
              <p className="text-sm text-zinc-400">
                هنوز داده‌ای از دروازه AI ثبت نشده. پس از چند درخواست هوش مصنوعی،
                معیارها در اینجا نمایش داده خواهند شد.
              </p>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "emerald" | "blue" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-zinc-400">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className={`text-lg font-black ${tones[tone]}`}>{value}</p>
    </div>
  );
}
