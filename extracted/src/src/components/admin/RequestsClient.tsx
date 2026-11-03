"use client";

import { useState } from "react";
import {
  Loader2,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Save,
  Target,
} from "lucide-react";
import { toFa, formatCompactPrice, faDate } from "@/lib/format";

type BuyRequest = {
  id: string;
  title: string;
  description: string;
  category: string;
  brandPref: string;
  transaction: string;
  budgetMin: string | null;
  budgetMax: string | null;
  city: string;
  province: string;
  deadline: string;
  status: string;
  verified: boolean;
  viewCount: number;
  requesterName: string;
  requesterPhone: string;
  adminNotes: string;
  createdAt: string;
};

const TRANSACTION_LABELS: Record<string, string> = {
  SALE: "خرید",
  RENT: "اجاره",
  SALE_AND_RENT: "خرید/اجاره",
};

export default function RequestsClient({
  requests,
  stats,
}: {
  requests: BuyRequest[];
  stats: { total: number; active: number; verified: number; closed: number };
}) {
  const [list, setList] = useState<BuyRequest[]>(requests);
  const [editing, setEditing] = useState<BuyRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (id: string, action: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [id] }),
      });
      if (!res.ok) throw new Error("عملیات ناموفق بود.");
      setList(
        list.map((r) => {
          if (r.id !== id) return r;
          if (action === "verify") return { ...r, verified: true };
          if (action === "unverify") return { ...r, verified: false };
          if (action === "close") return { ...r, status: "CLOSED" };
          if (action === "fulfill") return { ...r, status: "FULFILLED" };
          return r;
        }),
      );
    } catch (e: any) {
      setError(e?.message ?? "خطا.");
    } finally {
      setLoading(false);
    }
  };

  const save = async (r: BuyRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/requests/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: r.title,
          description: r.description,
          category: r.category,
          brandPref: r.brandPref,
          transaction: r.transaction,
          budgetMin: r.budgetMin ? Number(r.budgetMin) : undefined,
          budgetMax: r.budgetMax ? Number(r.budgetMax) : undefined,
          city: r.city,
          province: r.province,
          deadline: r.deadline,
          status: r.status,
          verified: r.verified,
          adminNotes: r.adminNotes,
        }),
      });
      if (!res.ok) throw new Error("ذخیره ناموفق بود.");
      setList(list.map((x) => (x.id === r.id ? r : x)));
      setEditing(null);
    } catch (e: any) {
      setError(e?.message ?? "خطا.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("آیا از حذف این درخواست مطمئن هستید؟")) return;
    try {
      await fetch(`/api/admin/requests/${id}`, { method: "DELETE" });
      setList(list.filter((x) => x.id !== id));
    } catch {
      setError("حذف ناموفق بود.");
    }
  };

  const statCards = [
    { label: "کل درخواست‌ها", value: stats.total, icon: Target, color: "text-[#F58220]", bg: "bg-[#F58220]/10" },
    { label: "فعال", value: stats.active, icon: Eye, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "تأییدشده", value: stats.verified, icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "بسته‌شده", value: stats.closed, icon: XCircle, color: "text-zinc-600", bg: "bg-zinc-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">درخواست‌های خرید</h1>
        <p className="mt-1 text-sm text-zinc-500">مدیریت درخواست‌های خرید خریداران</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                <p className="mt-1 text-2xl font-black text-zinc-900">{toFa(s.value)}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-right font-bold">عنوان</th>
                <th className="px-4 py-3 text-right font-bold">معامله</th>
                <th className="px-4 py-3 text-right font-bold">بودجه</th>
                <th className="px-4 py-3 text-right font-bold">شهر</th>
                <th className="px-4 py-3 text-right font-bold">درخواست‌کننده</th>
                <th className="px-4 py-3 text-right font-bold">وضعیت</th>
                <th className="px-4 py-3 text-right font-bold">تاریخ</th>
                <th className="px-4 py-3 text-center font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="truncate font-bold text-zinc-900">{r.title}</p>
                    {r.category && (
                      <p className="text-[11px] text-zinc-400">{r.category}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {TRANSACTION_LABELS[r.transaction] ?? r.transaction}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {r.budgetMin || r.budgetMax
                      ? `${r.budgetMin ? formatCompactPrice(Number(r.budgetMin)) : "—"} - ${r.budgetMax ? formatCompactPrice(Number(r.budgetMax)) : "—"}`
                      : "توافقی"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{r.city || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-zinc-700">{r.requesterName || "—"}</p>
                    <p className="text-[11px] text-zinc-400" dir="ltr">
                      {r.requesterPhone}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          r.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "CLOSED"
                              ? "bg-zinc-100 text-zinc-600"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {r.status === "ACTIVE" ? "فعال" : r.status === "CLOSED" ? "بسته" : r.status}
                      </span>
                      {r.verified && (
                        <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                          تأییدشده
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{faDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {!r.verified ? (
                        <button
                          type="button"
                          onClick={() => updateStatus(r.id, "verify")}
                          disabled={loading}
                          title="تأیید"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateStatus(r.id, "unverify")}
                          disabled={loading}
                          title="لغو تأیید"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    درخواستی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <RequestModal
          request={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          loading={loading}
        />
      )}
    </div>
  );
}

function RequestModal({
  request,
  onClose,
  onSave,
  loading,
}: {
  request: BuyRequest;
  onClose: () => void;
  onSave: (r: BuyRequest) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<BuyRequest>(request);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-5 text-xl font-black text-zinc-900">ویرایش درخواست</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">عنوان</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">توضیحات</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">دسته</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">برند پیشنهادی</label>
              <input
                type="text"
                value={form.brandPref}
                onChange={(e) => setForm({ ...form, brandPref: e.target.value })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">حداقل بودجه</label>
              <input
                type="number"
                value={form.budgetMin ?? ""}
                onChange={(e) => setForm({ ...form, budgetMin: e.target.value || null })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">حداکثر بودجه</label>
              <input
                type="number"
                value={form.budgetMax ?? ""}
                onChange={(e) => setForm({ ...form, budgetMax: e.target.value || null })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">نوع معامله</label>
              <select
                value={form.transaction}
                onChange={(e) => setForm({ ...form, transaction: e.target.value })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              >
                <option value="SALE">خرید</option>
                <option value="RENT">اجاره</option>
                <option value="SALE_AND_RENT">خرید/اجاره</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">شهر</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-700">استان</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-zinc-700">یادداشت مدیر</label>
            <textarea
              value={form.adminNotes}
              onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-zinc-700">وضعیت:</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 outline-none focus:border-[#F58220]"
            >
              <option value="ACTIVE">فعال</option>
              <option value="CLOSED">بسته</option>
              <option value="FULFILLED">تأمین‌شده</option>
            </select>
            <label className="mr-auto inline-flex items-center gap-2 text-xs font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(e) => setForm({ ...form, verified: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              تأییدشده
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => onSave(form)}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
