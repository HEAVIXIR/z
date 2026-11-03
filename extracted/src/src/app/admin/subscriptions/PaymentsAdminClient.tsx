"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  Plus,
  AlertCircle,
} from "lucide-react";
import { toFa, formatCompactPrice, faDate } from "@/lib/format";

/* ============================================================
   PaymentsAdminClient — interactive payments panel used on the
   /admin/subscriptions page (FIX-GAPS-2).

   • Table of recent payments (amount, type, status, user, date)
   • "تأیید پرداخت" button per PENDING payment → POST
     /api/payments/[id]/verify { status: "PAID" }
   • "رد پرداخت" button per PENDING payment → POST verify
     { status: "FAILED" }
   • "ایجاد پرداخت دستی" form → POST /api/admin/payments
     { userId, amount, type, subscriptionId?, trackingCode?,
       markPaid: true }
   ============================================================ */

type Payment = {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: string;
  currency: string;
  type: string;
  status: string;
  gateway: string | null;
  trackingCode: string | null;
  paidAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    mobile: string | null;
    email: string | null;
  } | null;
};

const TYPE_FA: Record<string, string> = {
  SUBSCRIPTION: "اشتراک",
  FEATURED_LISTING: "آگهی ویژه",
  PROMOTION: "پیشنهاد ویژه",
  LEAD_FEE: "کمیسیون سرنخ",
  INSPECTION_FEE: "هزینه بازرسی",
};

const STATUS_FA: Record<string, { fa: string; cls: string }> = {
  PENDING: { fa: "در انتظار", cls: "bg-amber-100 text-amber-700" },
  PAID: { fa: "پرداخت‌شده", cls: "bg-emerald-100 text-emerald-700" },
  FAILED: { fa: "ناموفق", cls: "bg-rose-100 text-rose-700" },
  REFUNDED: { fa: "بازگشت‌خورده", cls: "bg-zinc-200 text-zinc-700" },
};

export default function PaymentsAdminClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // payment id during verify
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // manual payment form
  const [form, setForm] = useState({
    userId: "",
    amount: "",
    type: "SUBSCRIPTION",
    subscriptionId: "",
    trackingCode: "",
    gateway: "MANUAL",
    markPaid: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments?take=100", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          setError("برای مشاهدهٔ پرداخت‌ها باید وارد شوید.");
        } else {
          setError(`خطا در بارگذاری پرداخت‌ها (HTTP ${res.status})`);
        }
        setPayments([]);
        return;
      }
      const data = await res.json();
      setPayments(data.payments ?? []);
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function verify(id: string, status: "PAID" | "FAILED") {
    setBusy(id);
    try {
      const res = await fetch(`/api/payments/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? `HTTP ${res.status}`);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userId.trim() || !form.amount.trim()) {
      alert("شناسه کاربر و مبلغ الزامی است.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: form.userId.trim(),
          amount: form.amount.replace(/[^\d]/g, ""),
          type: form.type,
          subscriptionId: form.subscriptionId.trim() || undefined,
          trackingCode: form.trackingCode.trim() || undefined,
          gateway: form.gateway,
          markPaid: form.markPaid,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setForm({
        userId: "",
        amount: "",
        type: "SUBSCRIPTION",
        subscriptionId: "",
        trackingCode: "",
        gateway: "MANUAL",
        markPaid: true,
      });
      setShowForm(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  const pending = payments.filter((p) => p.status === "PENDING");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-zinc-900">
            پرداخت‌ها
          </h2>
          <p className="text-xs text-zinc-500">
            مدیریت پرداخت‌های اشتراک، آگهی ویژه و سایر تراکنش‌ها
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            به‌روزرسانی
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e07418]"
          >
            <Plus className="h-3.5 w-3.5" />
            ایجاد پرداخت دستی
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submitManual}
          className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-zinc-700">
                شناسه کاربر *
              </label>
              <input
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                placeholder="cuid..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-zinc-700">
                مبلغ (ریال) *
              </label>
              <input
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="مثلاً ۴۹۹۰۰۰"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-zinc-700">
                نوع
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs"
              >
                <option value="SUBSCRIPTION">اشتراک</option>
                <option value="FEATURED_LISTING">آگهی ویژه</option>
                <option value="PROMOTION">پیشنهاد ویژه</option>
                <option value="LEAD_FEE">کمیسیون سرنخ</option>
                <option value="INSPECTION_FEE">هزینه بازرسی</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-zinc-700">
                شناسه اشتراک (اختیاری)
              </label>
              <input
                value={form.subscriptionId}
                onChange={(e) =>
                  setForm({ ...form, subscriptionId: e.target.value })
                }
                placeholder="cuid..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-zinc-700">
                کد پیگیری (اختیاری)
              </label>
              <input
                value={form.trackingCode}
                onChange={(e) =>
                  setForm({ ...form, trackingCode: e.target.value })
                }
                placeholder="شماره رسید بانکی"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-zinc-700">
                درگاه
              </label>
              <select
                value={form.gateway}
                onChange={(e) => setForm({ ...form, gateway: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs"
              >
                <option value="MANUAL">دستی / آفلاین</option>
                <option value="ZARINPAL">زرین‌پال</option>
                <option value="PAYIR">پی‌یار</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <input
              type="checkbox"
              checked={form.markPaid}
              onChange={(e) => setForm({ ...form, markPaid: e.target.checked })}
              className="h-3.5 w-3.5"
            />
            پرداخت را به‌عنوان «پرداخت‌شده» ثبت کن
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e07418] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              ثبت پرداخت
            </button>
          </div>
        </form>
      )}

      {/* Pending payments quick-verify strip */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-xs font-bold text-amber-800">
            {toFa(pending.length)} پرداخت در انتظار تأیید
          </p>
          <div className="flex flex-wrap gap-2">
            {pending.slice(0, 6).map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[11px] text-amber-800"
              >
                <span dir="ltr">{formatCompactPrice(p.amount)}</span>
                <span className="text-amber-500">•</span>
                <span>{TYPE_FA[p.type] ?? p.type}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-right font-bold">کاربر</th>
                <th className="px-4 py-3 text-right font-bold">مبلغ</th>
                <th className="px-4 py-3 text-right font-bold">نوع</th>
                <th className="px-4 py-3 text-right font-bold">وضعیت</th>
                <th className="px-4 py-3 text-right font-bold">درگاه</th>
                <th className="px-4 py-3 text-right font-bold">تاریخ</th>
                <th className="px-4 py-3 text-right font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.map((p) => {
                const st = STATUS_FA[p.status] ?? {
                  fa: p.status,
                  cls: "bg-zinc-100 text-zinc-600",
                };
                const user = p.user;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-zinc-900">
                        {user?.firstName ?? "—"} {user?.lastName ?? ""}
                      </p>
                      <p className="text-[11px] text-zinc-400" dir="ltr">
                        {user?.mobile ?? user?.email ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-700">
                      {formatCompactPrice(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {TYPE_FA[p.type] ?? p.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}
                      >
                        {st.fa}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500">
                      {p.gateway ?? "—"}
                      {p.trackingCode && (
                        <span
                          className="mt-0.5 block text-[10px] text-zinc-400"
                          dir="ltr"
                        >
                          {p.trackingCode}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {faDate(p.createdAt)}
                      {p.paidAt && (
                        <span className="mt-0.5 block text-[10px] text-emerald-600">
                          پرداخت: {faDate(p.paidAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "PENDING" ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => verify(p.id, "PAID")}
                            disabled={busy === p.id}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busy === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            تأیید پرداخت
                          </button>
                          <button
                            onClick={() => verify(p.id, "FAILED")}
                            disabled={busy === p.id}
                            className="rounded-md border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            رد
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    پرداختی ثبت نشده است.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
