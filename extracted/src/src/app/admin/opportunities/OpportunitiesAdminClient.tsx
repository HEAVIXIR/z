"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  Target,
  TrendingUp,
  MapPin,
  DollarSign,
  Tag,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

/* ============================================================
   OpportunitiesAdminClient — persisted Opportunity Engine UI.
   • "اسکن فرصت‌ها" button → POST { action: "scan" }.
   • Filters: type + status.
   • Table of opportunities with status-change actions.
   ============================================================ */

type Opportunity = {
  id: string;
  type: string;
  entityType: string;
  entityId: string | null;
  title: string;
  description: string | null;
  score: number;
  metadata: string | null;
  status: string;
  createdAt: string;
};

const TYPE_META: Record<string, { fa: string; icon: any; cls: string }> = {
  UNDERPRICED_LISTING: {
    fa: "زیر قیمت بازار",
    icon: DollarSign,
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  HIGH_DEMAND_LOW_SUPPLY: {
    fa: "تقاضای بالا، عرضهٔ کم",
    icon: TrendingUp,
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  TRENDING_BRAND: {
    fa: "برند صعودی",
    icon: Sparkles,
    cls: "bg-violet-100 text-violet-700 border-violet-200",
  },
  PRICE_DROP: {
    fa: "کاهش قیمت",
    icon: Tag,
    cls: "bg-blue-100 text-blue-700 border-blue-200",
  },
  NEW_TREND: {
    fa: "روند جدید",
    icon: Target,
    cls: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

const STATUS_META: Record<string, { fa: string; cls: string; icon: any }> = {
  NEW: {
    fa: "جدید",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  SEEN: {
    fa: "دیده‌شده",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Eye,
  },
  ACTED_ON: {
    fa: "اقدامشده",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  DISMISSED: {
    fa: "ردشده",
    cls: "bg-zinc-200 text-zinc-600 border-zinc-300",
    icon: XCircle,
  },
};

const TYPE_FILTERS = [
  { value: "", label: "همهٔ انواع" },
  { value: "UNDERPRICED_LISTING", label: "زیر قیمت بازار" },
  { value: "HIGH_DEMAND_LOW_SUPPLY", label: "تقاضای بالا، عرضهٔ کم" },
  { value: "TRENDING_BRAND", label: "برند صعودی" },
  { value: "PRICE_DROP", label: "کاهش قیمت" },
];

const STATUS_FILTERS = [
  { value: "", label: "همهٔ وضعیت‌ها" },
  { value: "NEW", label: "جدید" },
  { value: "SEEN", label: "دیده‌شده" },
  { value: "ACTED_ON", label: "اقدامشده" },
  { value: "DISMISSED", label: "ردشده" },
];

export default function OpportunitiesAdminClient() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/opportunities?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("خطا در دریافت فرصت‌ها.");
        return;
      }
      const j = await res.json();
      setItems(j.items ?? []);
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const scan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "خطا در اسکن.");
        return;
      }
      setToast(`اسکن کامل شد — ${j.found ?? 0} فرصت جدید.`);
      await load();
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      setScanning(false);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "خطا در به‌روزرسانی.");
        return;
      }
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Target className="h-6 w-6 text-[#F58220]" />
            موتور فرصت‌ها
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            فرصت‌های بازار به‌صورت خودکار شناسایی و در پایگاه‌داده ثبت می‌شوند —
            زیر قیمت بازار، تقاضای بالای بدون عرضه، برندهای صعودی و کاهش قیمت.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            به‌روزرسانی
          </button>
          <button
            onClick={scan}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scanning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            اسکن فرصت‌ها
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          {toast}
          <button
            onClick={() => setToast(null)}
            className="mr-auto rounded px-2 text-xs underline"
          >
            بستن
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label="نوع"
          value={typeFilter}
          options={TYPE_FILTERS}
          onChange={setTypeFilter}
        />
        <FilterSelect
          label="وضعیت"
          value={statusFilter}
          options={STATUS_FILTERS}
          onChange={setStatusFilter}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-right text-sm">
            <thead className="bg-zinc-50 text-xs font-bold text-zinc-600">
              <tr>
                <th className="border-b border-zinc-200 px-4 py-3">نوع</th>
                <th className="border-b border-zinc-200 px-4 py-3">عنوان</th>
                <th className="border-b border-zinc-200 px-4 py-3">امتیاز</th>
                <th className="border-b border-zinc-200 px-4 py-3">وضعیت</th>
                <th className="border-b border-zinc-200 px-4 py-3">ایجاد</th>
                <th className="border-b border-zinc-200 px-4 py-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    {loading
                      ? "در حال بارگذاری..."
                      : "هیچ فرصتی یافت نشد. روی «اسکن فرصت‌ها» کلیک کنید."}
                  </td>
                </tr>
              ) : (
                items.map((op) => {
                  const tmeta = TYPE_META[op.type] ?? {
                    fa: op.type,
                    icon: Target,
                    cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
                  };
                  const smeta = STATUS_META[op.status] ?? STATUS_META.NEW;
                  const TIcon = tmeta.icon;
                  const SIcon = smeta.icon;
                  return (
                    <tr
                      key={op.id}
                      className="border-b border-zinc-100 transition hover:bg-amber-50/40"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tmeta.cls}`}
                        >
                          <TIcon size={11} />
                          {tmeta.fa}
                        </span>
                      </td>
                      <td className="max-w-[360px] px-4 py-3">
                        <p className="truncate font-semibold text-zinc-800">
                          {op.title}
                        </p>
                        {op.description && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
                            {op.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-200">
                            <div
                              className="h-full bg-[#F58220]"
                              style={{
                                width: `${Math.round(op.score * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-zinc-600">
                            {op.score.toLocaleString("fa-IR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${smeta.cls}`}
                        >
                          <SIcon size={11} />
                          {smeta.fa}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-zinc-500">
                        {new Date(op.createdAt).toLocaleDateString("fa-IR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {op.status !== "SEEN" && (
                            <button
                              onClick={() => changeStatus(op.id, "SEEN")}
                              disabled={updatingId === op.id}
                              className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                            >
                              <Eye size={11} />
                              دیده‌شد
                            </button>
                          )}
                          {op.status !== "ACTED_ON" && (
                            <button
                              onClick={() => changeStatus(op.id, "ACTED_ON")}
                              disabled={updatingId === op.id}
                              className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <CheckCircle2 size={11} />
                              اقدام
                            </button>
                          )}
                          {op.status !== "DISMISSED" && (
                            <button
                              onClick={() => changeStatus(op.id, "DISMISSED")}
                              disabled={updatingId === op.id}
                              className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
                            >
                              <XCircle size={11} />
                              رد
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <span>
          اسکن، شناساگرها را به‌صورت موازی اجرا می‌کند و فرصت‌های تکراری (بر اساس
          نوع + موجودیت) را به‌روزرسانی می‌کند نه اینکه رکورد جدید بسازد. هر اسکن
          در لاگ ممیزی ثبت می‌شود.
        </span>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs">
      <span className="font-semibold text-zinc-600">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs text-zinc-700 outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
