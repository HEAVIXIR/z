"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PackageSearch,
  Loader2,
  RefreshCw,
  Sparkles,
  Award,
  Ban,
  Archive,
} from "lucide-react";
import { toFa, timeAgo, formatCompactPrice, faDate } from "@/lib/format";

/* ============================================================
   /admin/rfq — manage RFQs (list + bulk actions)
   ============================================================ */

type RFQ = {
  id: string;
  title: string;
  machineType: string | null;
  brandPref: string | null;
  quantity: number;
  budgetMin: string | null;
  budgetMax: string | null;
  location: string | null;
  deadline: string | null;
  status: string;
  statusLabel: string;
  buyerName: string | null;
  buyerPhone: string;
  buyerEmail: string | null;
  quoteCount: number;
  createdAt: string;
};

const STATUS_CLS: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700",
  QUOTING: "bg-blue-100 text-blue-700",
  AWARDED: "bg-amber-100 text-amber-700",
  CLOSED: "bg-zinc-100 text-zinc-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function AdminRFQPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rfq");
      const json = await res.json();
      if (json.success) {
        setRfqs(json.data || []);
        setStats(json.stats);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((s) => {
      if (s.size === rfqs.length) return new Set();
      return new Set(rfqs.map((r) => r.id));
    });
  };

  const bulkAction = async (action: "close" | "cancel" | "award") => {
    if (selected.size === 0) return;
    setActing(true);
    try {
      await fetch("/api/admin/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selected) }),
      });
      setSelected(new Set());
      await load();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <PackageSearch className="h-6 w-6 text-[#F58220]" />
            مدیریت RFQ (درخواست خرید B2B)
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مشاهده و مدیریت درخواست‌های خرید ثبت‌شده توسط خریداران
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="کل" value={stats.total} />
          <StatCard label="باز" value={stats.open} tone="emerald" />
          <StatCard label="در حال پیشنهاد" value={stats.quoting} tone="blue" />
          <StatCard label="تأییدشده" value={stats.awarded} tone="amber" />
          <StatCard label="بسته‌شده" value={stats.closed} />
          <StatCard label="لغوشده" value={stats.cancelled} tone="red" />
          <StatCard label="کل پیشنهادها" value={stats.totalQuotes} tone="violet" />
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#F58220]/30 bg-[#F58220]/5 p-3">
          <span className="text-xs font-bold text-[#F58220]">
            {toFa(selected.size)} مورد انتخاب شده:
          </span>
          <button
            onClick={() => bulkAction("award")}
            disabled={acting}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            <Award className="h-3.5 w-3.5" />
            تأیید (Award)
          </button>
          <button
            onClick={() => bulkAction("close")}
            disabled={acting}
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            <Archive className="h-3.5 w-3.5" />
            بستن
          </button>
          <button
            onClick={() => bulkAction("cancel")}
            disabled={acting}
            className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-60"
          >
            <Ban className="h-3.5 w-3.5" />
            لغو
          </button>
          {acting && <Loader2 className="h-4 w-4 animate-spin text-[#F58220]" />}
        </div>
      )}

      {/* RFQs list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : rfqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            هنوز RFQی ثبت نشده. کاربران از صفحه /rfq/new می‌توانند درخواست ثبت
            کنند.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selected.size === rfqs.length && rfqs.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                </th>
                <th className="px-4 py-3 text-right font-bold">عنوان</th>
                <th className="px-4 py-3 text-center font-bold">نوع</th>
                <th className="px-4 py-3 text-center font-bold">تعداد</th>
                <th className="px-4 py-3 text-center font-bold">بودجه</th>
                <th className="px-4 py-3 text-center font-bold">شهر</th>
                <th className="px-4 py-3 text-center font-bold">پیشنهادها</th>
                <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                <th className="px-4 py-3 text-center font-bold">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rfqs.map((r) => (
                <tr key={r.id} className="transition hover:bg-zinc-50">
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4 accent-[#F58220]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-zinc-800">{r.title}</p>
                    <p className="text-[10px] text-zinc-400">
                      {r.buyerName ?? "—"} · {r.buyerPhone}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-600">
                    {r.machineType || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-600">
                    {toFa(r.quantity)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-600">
                    {r.budgetMin || r.budgetMax
                      ? `${r.budgetMin ? formatCompactPrice(BigInt(r.budgetMin)) : ""}${
                          r.budgetMin && r.budgetMax ? "-" : ""
                        }${r.budgetMax ? formatCompactPrice(BigInt(r.budgetMax)) : ""}`
                      : "توافقی"}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-600">
                    {r.location || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                      {toFa(r.quoteCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        STATUS_CLS[r.status] || "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {r.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-[11px] text-zinc-400">
                    {timeAgo(r.createdAt)}
                    {r.deadline && (
                      <div className="text-[10px] text-zinc-400">
                        مهلت: {faDate(r.deadline)}
                      </div>
                    )}
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
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "red" | "amber" | "blue" | "violet";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <p className={`text-xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-1 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
