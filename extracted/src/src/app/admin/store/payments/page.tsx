"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Loader2,
  RefreshCw,
  Check,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
} from "lucide-react";
import { toFa, formatCompactPrice, timeAgo } from "@/lib/format";

/* ============================================================
   /admin/store/payments — HEAVIX payments list + verify
   ============================================================ */

type Payment = {
  id: string;
  amountIrr: string;
  amountUsd: string;
  method: string;
  methodLabel: string;
  status: string;
  statusLabel: string;
  receiptImageUrl: string | null;
  referenceCode: string | null;
  payerName: string | null;
  payerCard: string | null;
  note: string | null;
  gateway: string | null;
  authority: string | null;
  refId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  order: { id: string; orderNumber: string; totalIrr: string; status: string } | null;
  customer: { id: string; name: string; family: string; phone: string } | null;
};

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  REFUNDED: "bg-zinc-100 text-zinc-500",
};

export default function StorePaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (methodFilter) params.set("method", methodFilter);
      const res = await fetch(`/api/admin/store/payments?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else throw new Error(json.error || "خطا");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, methodFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (p: Payment, status: "APPROVED" | "REJECTED" | "REFUNDED") => {
    if (status !== "REFUNDED" && !confirm(`تأیید پرداخت به وضعیت «${status === "APPROVED" ? "تأییدشده" : "ردشده"}»؟`)) return;
    setBusy(p.id);
    try {
      const res = await fetch(`/api/admin/store/payments/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "خطا");
      setToast("وضعیت پرداخت به‌روزرسانی شد");
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const INPUT_CLS =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">پرداخت‌های فروشگاه هویکس</h1>
          <p className="text-sm text-zinc-500">بررسی و تأیید رسیدهای پرداخت</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="جستجوی کد پیگیری، نام پرداخت‌کننده، شماره سفارش…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={INPUT_CLS}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه وضعیت‌ها</option>
            <option value="PENDING">در انتظار بررسی</option>
            <option value="APPROVED">تأییدشده</option>
            <option value="REJECTED">ردشده</option>
            <option value="REFUNDED">بازگشت‌خورده</option>
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه روش‌ها</option>
            <option value="CARD">کارت به کارت</option>
            <option value="GATEWAY">درگاه آنلاین</option>
            <option value="WALLET">کیف پول</option>
            <option value="CASH">نقدی</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="max-h-[65vh] overflow-y-auto">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-bold">سفارش / مشتری</th>
                <th className="px-4 py-3 font-bold">مبلغ</th>
                <th className="px-4 py-3 font-bold">روش</th>
                <th className="px-4 py-3 font-bold">پرداخت‌کننده</th>
                <th className="px-4 py-3 font-bold">کد پیگیری</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">تاریخ</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                    <Loader2 size={20} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                    <Wallet size={28} className="mx-auto mb-2 opacity-50" />
                    پرداختی یافت نشد
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-bold text-zinc-900">{p.order?.orderNumber ?? "—"}</div>
                      {p.customer && (
                        <div className="text-xs text-zinc-500">{p.customer.name} {p.customer.family}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900">{formatCompactPrice(Number(p.amountIrr))}</div>
                      <div className="text-[11px] text-zinc-400">${toFa(Number(p.amountUsd))}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{p.methodLabel}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-zinc-700">{p.payerName ?? "—"}</div>
                      {p.payerCard && <div className="font-mono text-[11px] text-zinc-500" dir="ltr">{p.payerCard}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600" dir="ltr">
                      {p.referenceCode || p.refId || p.authority || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${STATUS_CLS[p.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                        {p.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{timeAgo(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => updateStatus(p, "APPROVED")}
                              disabled={busy === p.id}
                              title="تأیید"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => updateStatus(p, "REJECTED")}
                              disabled={busy === p.id}
                              title="رد"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {p.status === "APPROVED" && (
                          <button
                            onClick={() => updateStatus(p, "REFUNDED")}
                            disabled={busy === p.id}
                            title="بازگشت وجه"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 disabled:opacity-50"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {p.receiptImageUrl && (
                          <a
                            href={p.receiptImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
                          >
                            <Eye size={14} />
                          </a>
                        )}
                        {busy === p.id && <Loader2 size={14} className="animate-spin text-zinc-400" />}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
