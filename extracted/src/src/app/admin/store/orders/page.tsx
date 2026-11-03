"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Loader2,
  RefreshCw,
  Eye,
  X,
  Save,
  Phone,
  MapPin,
} from "lucide-react";
import { toFa, formatCompactPrice, timeAgo } from "@/lib/format";

/* ============================================================
   /admin/store/orders — HEAVIX orders list + status management
   ============================================================ */

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  subtotalUsd: string;
  shippingUsd: string;
  discountIrr: string;
  totalUsd: string;
  totalIrr: string;
  currencyRateAtOrder: string;
  couponCode: string | null;
  shippingAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  customer: { id: string; name: string; family: string; phone: string } | null;
  mechanic: { id: string; name: string; family: string; shopName: string } | null;
};

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-600",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-amber-100 text-amber-700",
  SHIPPED: "bg-violet-100 text-violet-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-orange-100 text-orange-700",
};

const PAY_CLS: Record<string, string> = {
  UNPAID: "bg-red-50 text-red-600",
  PARTIAL: "bg-amber-50 text-amber-600",
  PAID: "bg-emerald-50 text-emerald-600",
  REFUNDED: "bg-zinc-100 text-zinc-500",
};

const ALLOWED_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تأییدشده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  RETURNED: "مرجوع‌شده",
};

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";

export default function StoreOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (payFilter) params.set("paymentStatus", payFilter);
      const res = await fetch(`/api/admin/store/orders?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else throw new Error(json.error || "خطا");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, payFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (o: Order) => {
    setDetailLoading(true);
    setDetail(null);
    setEditStatus(o.status);
    setEditNotes(o.notes ?? "");
    try {
      const res = await fetch(`/api/admin/store/orders/${o.id}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setDetail(json.data);
    } catch {}
    setDetailLoading(false);
  };

  const save = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/store/orders/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, notes: editNotes }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "خطا");
      setToast("سفارش به‌روزرسانی شد");
      setDetail(null);
      await load();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">سفارش‌های فروشگاه هویکس</h1>
          <p className="text-sm text-zinc-500">مدیریت و پیگیری سفارشات قطعات</p>
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
            placeholder="جستجو شماره سفارش یا تلفن مشتری…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={INPUT_CLS}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه وضعیت‌ها</option>
            {ALLOWED_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه پرداخت‌ها</option>
            <option value="UNPAID">پرداخت‌نشده</option>
            <option value="PARTIAL">پرداخت جزئی</option>
            <option value="PAID">پرداخت‌شده</option>
            <option value="REFUNDED">بازگشت‌خورده</option>
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
                <th className="px-4 py-3 font-bold">شماره سفارش</th>
                <th className="px-4 py-3 font-bold">مشتری</th>
                <th className="px-4 py-3 font-bold">مبلغ (تومان)</th>
                <th className="px-4 py-3 font-bold">آیتم‌ها</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">پرداخت</th>
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
                    <ShoppingCart size={28} className="mx-auto mb-2 opacity-50" />
                    سفارشی یافت نشد
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-bold text-zinc-900">{o.orderNumber}</div>
                      {o.couponCode && <div className="mt-0.5 text-[11px] text-emerald-600">کوپن: {o.couponCode}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {o.customer ? (
                        <>
                          <div className="font-medium text-zinc-900">{o.customer.name} {o.customer.family}</div>
                          <div className="font-mono text-[11px] text-zinc-500" dir="ltr">{o.customer.phone}</div>
                        </>
                      ) : "—"}
                      {o.mechanic && (
                        <div className="mt-1 text-[11px] text-violet-600">مکانیک: {o.mechanic.name} {o.mechanic.family}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-900">
                      {formatCompactPrice(Number(o.totalIrr))}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-zinc-700">{toFa(o.itemCount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${STATUS_CLS[o.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                        {o.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${PAY_CLS[o.paymentStatus] ?? "bg-zinc-100 text-zinc-500"}`}>
                        {o.paymentStatusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{timeAgo(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(o)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">سفارش {detail.orderNumber}</h2>
                <p className="text-xs text-zinc-500">{timeAgo(detail.createdAt)}</p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-10 text-center"><Loader2 className="mx-auto animate-spin" size={24} /></div>
            ) : (
              <div className="space-y-4">
                {/* Customer */}
                {detail.customer && (
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <h3 className="mb-2 text-xs font-bold text-zinc-500">مشتری</h3>
                    <div className="font-bold text-zinc-900">{detail.customer.name} {detail.customer.family}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600" dir="ltr">
                      <Phone size={12} /> {detail.customer.phone}
                    </div>
                    {detail.customer.address && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-zinc-600">
                        <MapPin size={12} className="mt-0.5 shrink-0" /> {detail.customer.address}
                      </div>
                    )}
                  </div>
                )}

                {/* Items */}
                <div>
                  <h3 className="mb-2 text-xs font-bold text-zinc-500">اقلام سفارش</h3>
                  <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                    {(detail.items || []).map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium text-zinc-800">{it.partNameSnapshot}</div>
                          <div className="text-xs text-zinc-500">{toFa(it.quantity)} × {toFa(Number(it.unitPriceUsd))} دلار</div>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-zinc-900">{formatCompactPrice(Number(it.lineTotalIrr))}</div>
                          <div className="text-[11px] text-zinc-400">${toFa(Number(it.lineTotalUsd))}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-xs text-zinc-500">جمع کل (USD)</div>
                    <div className="font-bold">${toFa(Number(detail.totalUsd))}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-xs text-zinc-500">جمع کل (تومان)</div>
                    <div className="font-bold">{formatCompactPrice(Number(detail.totalIrr))}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-xs text-zinc-500">نرخ ارز</div>
                    <div className="font-bold">{toFa(Number(detail.currencyRateAtOrder).toLocaleString("en-US"))}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <div className="text-xs text-zinc-500">تخفیف</div>
                    <div className="font-bold">{toFa(Number(detail.discountIrr).toLocaleString("en-US"))} تومان</div>
                  </div>
                </div>

                {/* Payments */}
                {(detail.payments || []).length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold text-zinc-500">پرداخت‌ها</h3>
                    <div className="space-y-2">
                      {detail.payments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                          <div>
                            <div className="font-medium">{p.method === "CARD" ? "کارت" : p.method === "GATEWAY" ? "درگاه" : p.method === "CASH" ? "نقدی" : "کیف پول"}</div>
                            <div className="text-xs text-zinc-500">{p.referenceCode || p.authority || "—"}</div>
                          </div>
                          <div className="text-left">
                            <div className="font-bold">{formatCompactPrice(Number(p.amountIrr))}</div>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${p.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : p.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {p.status === "APPROVED" ? "تأییدشده" : p.status === "REJECTED" ? "ردشده" : "در انتظار"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit */}
                <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-zinc-500">تغییر وضعیت</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={INPUT_CLS}>
                      {ALLOWED_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-zinc-500">یادداشت</label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setDetail(null)} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                      بستن
                    </button>
                    <button onClick={save} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white hover:bg-[#e0701a] disabled:opacity-50">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      ذخیره
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
