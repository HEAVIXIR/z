"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Loader2, RefreshCw, Ban, Phone, MapPin } from "lucide-react";
import { toFa, timeAgo, formatCompactPrice } from "@/lib/format";

type Customer = {
  id: string;
  phone: string;
  name: string;
  family: string;
  nationalCode: string | null;
  address: string | null;
  status: string;
  totalOrders: number;
  totalSpentIrr: string;
  walletBalanceIrr: string;
  notes: string | null;
  createdAt: string;
  orderCount: number;
};

export default function StoreCustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/store/customers?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else throw new Error(json.error || "خطا");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const INPUT_CLS =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">مشتریان فروشگاه هویکس</h1>
          <p className="text-sm text-zinc-500">مشتریان ثبت‌نام‌شده در فروشگاه قطعات</p>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="جستجوی نام، تلفن یا کد ملی…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={INPUT_CLS}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">همه</option>
            <option value="ACTIVE">فعال</option>
            <option value="BLOCKED">مسدود</option>
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
                <th className="px-4 py-3 font-bold">نام</th>
                <th className="px-4 py-3 font-bold">تلفن</th>
                <th className="px-4 py-3 font-bold">سفارش‌ها</th>
                <th className="px-4 py-3 font-bold">خرج کل</th>
                <th className="px-4 py-3 font-bold">کیف پول</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">عضویت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                    <Loader2 size={20} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                    <Users size={28} className="mx-auto mb-2 opacity-50" />
                    مشتری‌ای یافت نشد
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900">{c.name} {c.family}</div>
                      {c.nationalCode && <div className="text-xs text-zinc-500">کد ملی: {toFa(c.nationalCode)}</div>}
                      {c.address && (
                        <div className="mt-1 flex items-start gap-1 text-[11px] text-zinc-500">
                          <MapPin size={10} className="mt-0.5 shrink-0" /> {c.address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 font-mono text-xs text-zinc-700" dir="ltr">
                        <Phone size={11} /> {c.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-zinc-900">{toFa(c.orderCount)}</td>
                    <td className="px-4 py-3 font-bold text-zinc-900">{formatCompactPrice(Number(c.totalSpentIrr))}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{toFa(Number(c.walletBalanceIrr).toLocaleString("en-US"))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {c.status === "ACTIVE" ? "فعال" : "مسدود"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{timeAgo(c.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
