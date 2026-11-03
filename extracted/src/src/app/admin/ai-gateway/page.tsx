"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/ai-gateway — AI Gateway logs dashboard
   Priority #54, #56
   ============================================================ */

type Log = {
  id: string;
  taskType: string;
  model: string;
  input: string | null;
  output: string | null;
  latencyMs: number | null;
  success: boolean;
  error: string | null;
  createdAt: string;
};

const TASK_LABELS: Record<string, string> = {
  SEARCH: "جستجو",
  SEMANTIC_SEARCH: "جستجوی معنایی",
  LISTING_BUILDER: "سازنده آگهی",
  PRICE_ANALYSIS: "تحلیل قیمت",
  MARKET_ANALYST: "تحلیل‌گر بازار",
  SELLER_ASSISTANT: "دستیار فروشنده",
  SCRAPER: "استخراج آگهی",
  MODERATION: "مدیریت محتوا",
};

export default function AIGatewayPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? `?task=${filter}` : "";
      const res = await fetch(`/api/ai-gateway${params}`);
      const json = await res.json();
      if (json.success) { setLogs(json.data || []); setStats(json.stats); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleString("fa-IR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Activity className="h-6 w-6 text-[#F58220]" />
          دروازه هوش مصنوعی
        </h1>
        <p className="mt-1 text-sm text-zinc-500">مرکز مدیریت و نظارت بر تمام درخواست‌های AI — لاگ، هزینه و کارایی</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xl font-black text-zinc-900">{toFa(stats.total)}</p>
            <p className="text-[11px] text-zinc-500">کل درخواست‌ها</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xl font-black text-emerald-600">{toFa(stats.successful)}</p>
            <p className="text-[11px] text-zinc-500">موفق</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xl font-black text-red-600">{toFa(stats.failed)}</p>
            <p className="text-[11px] text-zinc-500">ناموفق</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xl font-black text-[#F58220]">{toFa(stats.avgLatency)}ms</p>
            <p className="text-[11px] text-zinc-500">میانگین تأخیر</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("")} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${!filter ? "bg-[#F58220] text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"}`}>همه</button>
        {Object.entries(TASK_LABELS).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${filter === v ? "bg-[#F58220] text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"}`}>{l}</button>
        ))}
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">هنوز درخواست AI‌ای ثبت نشده.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-right font-bold">نوع</th>
                <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                <th className="px-4 py-3 text-center font-bold">تأخیر</th>
                <th className="px-4 py-3 text-right font-bold">ورودی</th>
                <th className="px-4 py-3 text-center font-bold">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((l) => (
                <tr key={l.id} className="transition hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                      {TASK_LABELS[l.taskType] || l.taskType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {l.success ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" /> : <XCircle className="mx-auto h-4 w-4 text-red-500" />}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{l.latencyMs ? toFa(l.latencyMs) + "ms" : "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400 max-w-xs truncate">{l.input || "—"}</td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-400">{fmtDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
