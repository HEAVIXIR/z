"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Loader2,
  RefreshCw,
  Sparkles,
  Award,
  Ban,
  Archive,
  CheckCircle2,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import Link from "next/link";
import { toFa, timeAgo, formatCompactPrice, faDate } from "@/lib/format";

/* ============================================================
   /admin/procurement — manage B2B procurement tenders.
   List + bulk status + per-row edit/delete.
   ============================================================ */

type Procurement = {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  budgetMin: string | null;
  budgetMax: string | null;
  deadline: string | null;
  status: string;
  statusLabel: string;
  createdAt: string;
  quoteCount: number;
  company: { id: string; name: string; slug: string } | null;
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  QUOTING: "bg-blue-100 text-blue-700",
  AWARDED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-zinc-100 text-zinc-600",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشرشده",
  QUOTING: "در حال پیشنهاد",
  AWARDED: "تأییدشده",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغوشده",
};

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
const LABEL_CLS = "mb-1.5 block text-xs font-bold text-zinc-500";
const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function AdminProcurementPage() {
  const [items, setItems] = useState<Procurement[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Procurement | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/procurement?${params}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
        setStats(json.stats);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

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
      if (s.size === items.length) return new Set();
      return new Set(items.map((r) => r.id));
    });
  };

  const bulkStatus = async (status: string) => {
    if (selected.size === 0) return;
    setActing(true);
    try {
      await fetch("/api/admin/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), status }),
      });
      setSelected(new Set());
      flash("عملیات گروهی انجام شد");
      await load();
    } finally {
      setActing(false);
    }
  };

  const removeProcurement = async (r: Procurement) => {
    const msg = r.quoteCount > 0 ? `این مناقصه ${toFa(r.quoteCount)} پیشنهاد دارد که همراه با آن حذف می‌شود. ` : "";
    if (!confirm(`${msg}آیا مطمئن هستید؟`)) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/procurement/${r.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        flash("مناقصه حذف شد");
        await load();
      } else {
        flash(json.error || "خطا در حذف");
      }
    } catch {
      flash("خطای شبکه");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (r: Procurement) => {
    setEditing(r);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <ShoppingCart className="h-6 w-6 text-[#F58220]" />
            مدیریت خرید سازمانی (مناقصه)
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مشاهده و مدیریت مناقصات خرید ثبت‌شده توسط سازمان‌ها
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          به‌روزرسانی
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="کل" value={stats.total ?? 0} />
          <StatCard label="منتشرشده" value={stats.published ?? 0} tone="emerald" />
          <StatCard label="در حال پیشنهاد" value={stats.quoting ?? 0} tone="blue" />
          <StatCard label="تأییدشده" value={stats.awarded ?? 0} tone="amber" />
          <StatCard label="تکمیل‌شده" value={stats.completed ?? 0} />
          <StatCard label="لغوشده" value={stats.cancelled ?? 0} tone="red" />
          <StatCard label="کل پیشنهادها" value={stats.totalQuotes ?? 0} tone="violet" />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[300] -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی عنوان..."
          className="h-9 flex-1 min-w-[200px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white"
        />
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
          {["", "DRAFT", "PUBLISHED", "QUOTING", "AWARDED", "COMPLETED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === s ? "bg-white text-[#F58220] shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {s === ""
                ? "همه"
                : {
                    DRAFT: "پیش‌نویس",
                    PUBLISHED: "منتشرشده",
                    QUOTING: "در حال پیشنهاد",
                    AWARDED: "تأییدشده",
                    COMPLETED: "تکمیل‌شده",
                    CANCELLED: "لغوشده",
                  }[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#F58220]/30 bg-[#F58220]/5 p-3">
          <span className="text-xs font-bold text-[#F58220]">
            {toFa(selected.size)} مورد انتخاب شده:
          </span>
          <button
            onClick={() => bulkStatus("PUBLISHED")}
            disabled={acting}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            انتشار
          </button>
          <button
            onClick={() => bulkStatus("AWARDED")}
            disabled={acting}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            <Award className="h-3.5 w-3.5" />
            تأیید (Award)
          </button>
          <button
            onClick={() => bulkStatus("COMPLETED")}
            disabled={acting}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-60"
          >
            <Archive className="h-3.5 w-3.5" />
            تکمیل
          </button>
          <button
            onClick={() => bulkStatus("CANCELLED")}
            disabled={acting}
            className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-60"
          >
            <Ban className="h-3.5 w-3.5" />
            لغو
          </button>
          {acting && <Loader2 className="h-4 w-4 animate-spin text-[#F58220]" />}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            هنوز مناقصه‌ای ثبت نشده. سازمان‌ها از صفحه /procurement می‌توانند مناقصه ثبت کنند.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selected.size === items.length && items.length > 0}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-[#F58220]"
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-bold">عنوان</th>
                  <th className="px-4 py-3 text-center font-bold">سازمان</th>
                  <th className="px-4 py-3 text-center font-bold">تعداد</th>
                  <th className="px-4 py-3 text-center font-bold">بودجه</th>
                  <th className="px-4 py-3 text-center font-bold">پیشنهادها</th>
                  <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                  <th className="px-4 py-3 text-center font-bold">تاریخ</th>
                  <th className="px-4 py-3 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((r) => {
                  const isBusy = busyId === r.id;
                  return (
                    <tr key={r.id} className="align-top transition hover:bg-zinc-50">
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          className="h-4 w-4 accent-[#F58220]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/procurement/${r.id}`}
                          target="_blank"
                          className="flex items-center gap-1 font-bold text-zinc-800 hover:text-[#F58220]"
                        >
                          <Eye className="h-3 w-3 text-zinc-400" />
                          {r.title}
                        </Link>
                        {r.description && (
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400">{r.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-600">
                        {r.company?.name ?? "—"}
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
                          <div className="text-[10px] text-zinc-400">مهلت: {faDate(r.deadline)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            disabled={isBusy}
                            title="ویرایش"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220] disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeProcurement(r)}
                            disabled={isBusy}
                            title="حذف"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editOpen && editing && (
        <EditProcurementModal
          procurement={editing}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            load();
          }}
        />
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

function EditProcurementModal({
  procurement,
  onClose,
  onSaved,
}: {
  procurement: Procurement;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(procurement.title);
  const [description, setDescription] = useState(procurement.description ?? "");
  const [quantity, setQuantity] = useState(String(procurement.quantity ?? 1));
  const [budgetMin, setBudgetMin] = useState(procurement.budgetMin ?? "");
  const [budgetMax, setBudgetMax] = useState(procurement.budgetMax ?? "");
  const [deadline, setDeadline] = useState(toLocalInputValue(procurement.deadline));
  const [status, setStatus] = useState(procurement.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!title.trim()) {
      setError("عنوان الزامی است");
      return;
    }
    const q = Number(onlyDigits(quantity)) || 1;
    if (q < 1) {
      setError("تعداد باید حداقل ۱ باشد");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/procurement/${procurement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          quantity: q,
          budgetMin: budgetMin ? onlyDigits(budgetMin) : null,
          budgetMax: budgetMax ? onlyDigits(budgetMax) : null,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          status,
        }),
      });
      const json = await res.json();
      if (json.success) onSaved();
      else setError(json.error ?? "خطا در ذخیره");
    } catch {
      setError("خطای شبکه");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <h2 className="text-lg font-black text-zinc-900">ویرایش مناقصه خرید</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">⚠ {error}</div>
          )}
          <div className="rounded-xl bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
            سازمان: <span className="font-bold text-zinc-800">{procurement.company?.name ?? "—"}</span>
            {" · "}
            {toFa(procurement.quoteCount)} پیشنهاد ثبت‌شده
          </div>
          <div>
            <label className={LABEL_CLS}>عنوان *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>توضیحات</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL_CLS}>تعداد</label>
              <input value={quantity} onChange={(e) => setQuantity(onlyDigits(e.target.value))} dir="ltr" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>بودجه کمینه (تومان)</label>
              <input value={budgetMin} onChange={(e) => setBudgetMin(onlyDigits(e.target.value))} dir="ltr" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>بودجه بیشینه (تومان)</label>
              <input value={budgetMax} onChange={(e) => setBudgetMax(onlyDigits(e.target.value))} dir="ltr" className={INPUT_CLS} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLS}>مهلت نهایی</label>
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} dir="ltr" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>وضعیت</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT_CLS}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">
            انصراف
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
