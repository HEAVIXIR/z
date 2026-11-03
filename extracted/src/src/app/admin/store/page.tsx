"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { toFa, formatCompactPrice } from "@/lib/format";

/* ============================================================
   /admin/store — HEAVIX store dashboard
   ============================================================ */

type Stats = {
  totalParts: number;
  activeParts: number;
  lowStockParts: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalMechanics: number;
  pendingPayments: number;
  approvedRevenueIrr: number;
  todayRate: number;
  marginPercent: number;
  autoUpdateEnabled: boolean;
  lastAutoStatus: string | null;
  lastAutoFetchAt: string | null;
  ordersByStatus: { status: string; count: number }[];
  paymentsByStatus: { status: string; count: number }[];
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تأییدشده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  RETURNED: "مرجوع‌شده",
};

const PAY_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
  REFUNDED: "بازگشت‌خورده",
};

export default function StoreDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/store/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const json = await res.json();
      if (json.success) setStats(json.data);
      else throw new Error(json.error || "خطا");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#F58220] to-amber-500 text-white shadow-lg">
              <Wrench size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900">فروشگاه هویکس</h1>
              <p className="text-sm text-zinc-500">داشبورد مدیریت قطعات خودرو و ماشین‌آلات سنگین</p>
            </div>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          به‌روزرسانی
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="کل قطعات"
          value={stats ? toFa(stats.totalParts) : "—"}
          sub={stats ? `${toFa(stats.activeParts)} فعال` : ""}
          icon={<Package size={20} />}
          color="from-orange-500 to-amber-500"
          href="/admin/store/parts"
        />
        <StatCard
          title="سفارش‌ها"
          value={stats ? toFa(stats.totalOrders) : "—"}
          sub={stats ? `${toFa(stats.pendingOrders)} در انتظار` : ""}
          icon={<ShoppingCart size={20} />}
          color="from-emerald-500 to-green-500"
          href="/admin/store/orders"
        />
        <StatCard
          title="مشتریان"
          value={stats ? toFa(stats.totalCustomers) : "—"}
          sub={stats ? `${toFa(stats.totalMechanics)} مکانیک` : ""}
          icon={<Users size={20} />}
          color="from-violet-500 to-purple-500"
          href="/admin/store/customers"
        />
        <StatCard
          title="درآمد تأییدشده"
          value={stats ? formatCompactPrice(stats.approvedRevenueIrr) : "—"}
          sub={stats ? `${toFa(stats.pendingPayments)} پرداخت در انتظار` : ""}
          icon={<Wallet size={20} />}
          color="from-sky-500 to-blue-500"
          href="/admin/store/payments"
        />
      </div>

      {/* Currency + low stock warning */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:col-span-1">
          <div className="flex items-center gap-2 text-zinc-700">
            <TrendingUp size={18} className="text-[#F58220]" />
            <h3 className="font-bold">نرخ ارز امروز</h3>
          </div>
          {stats ? (
            <div className="mt-4 space-y-2">
              <div className="text-3xl font-extrabold text-zinc-900">
                {toFa(stats.todayRate.toLocaleString("en-US"))}
                <span className="mr-1 text-sm font-normal text-zinc-500">تومان / دلار</span>
              </div>
              <div className="text-xs text-zinc-500">
                حاشیه سود: {toFa(stats.marginPercent)}٪
              </div>
              {stats.autoUpdateEnabled && stats.lastAutoStatus && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  بروزرسانی خودکار فعال — وضعیت تلگرام: {stats.lastAutoStatus}
                </div>
              )}
              <Link
                href="/admin/store/currency"
                className="block rounded-lg bg-zinc-100 px-3 py-2 text-center text-xs font-bold text-zinc-700 transition hover:bg-zinc-200"
              >
                مدیریت نرخ ارز
              </Link>
            </div>
          ) : (
            <div className="mt-4 text-sm text-zinc-400">در حال بارگذاری…</div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 md:col-span-1">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={18} />
            <h3 className="font-bold">هشدار موجودی کم</h3>
          </div>
          {stats ? (
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-amber-700">{toFa(stats.lowStockParts)}</div>
              <div className="mt-1 text-xs text-amber-600">قطعه با موجودی کم (۵ یا کمتر)</div>
              <Link
                href="/admin/store/parts?lowStock=1"
                className="mt-3 block rounded-lg bg-amber-100 px-3 py-2 text-center text-xs font-bold text-amber-800 transition hover:bg-amber-200"
              >
                مشاهده قطعات کم‌موجودی
              </Link>
            </div>
          ) : (
            <div className="mt-4 text-sm text-amber-400">در حال بارگذاری…</div>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:col-span-1">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={18} />
            <h3 className="font-bold">میانبرها</h3>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href="/admin/store/parts" className="rounded-lg bg-white px-3 py-2 text-center font-bold text-zinc-700 transition hover:bg-emerald-100">قطعات</Link>
            <Link href="/admin/store/orders" className="rounded-lg bg-white px-3 py-2 text-center font-bold text-zinc-700 transition hover:bg-emerald-100">سفارشات</Link>
            <Link href="/admin/store/payments" className="rounded-lg bg-white px-3 py-2 text-center font-bold text-zinc-700 transition hover:bg-emerald-100">پرداخت‌ها</Link>
            <Link href="/admin/store/mechanics" className="rounded-lg bg-white px-3 py-2 text-center font-bold text-zinc-700 transition hover:bg-emerald-100">مکانیک‌ها</Link>
            <Link href="/admin/store/categories" className="rounded-lg bg-white px-3 py-2 text-center font-bold text-zinc-700 transition hover:bg-emerald-100">دسته‌ها</Link>
            <Link href="/admin/store/brands" className="rounded-lg bg-white px-3 py-2 text-center font-bold text-zinc-700 transition hover:bg-emerald-100">برندها</Link>
            <Link href="/admin/store/car-models" className="rounded-lg bg-white px-3 py-2 text-center font-bold text-zinc-700 transition hover:bg-emerald-100">خودروها</Link>
            <Link href="/admin/store/customers" className="rounded-lg bg-white px-3 py-2 text-center font-bold text-zinc-700 transition hover:bg-emerald-100">مشتریان</Link>
          </div>
        </div>
      </div>

      {/* Order + payment status breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-zinc-700">وضعیت سفارش‌ها</h3>
          {stats && stats.ordersByStatus.length > 0 ? (
            <div className="space-y-2">
              {stats.ordersByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                  <span className="text-zinc-600">{ORDER_STATUS_LABELS[s.status] ?? s.status}</span>
                  <span className="font-bold text-zinc-900">{toFa(s.count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">سفارشی ثبت نشده است</div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-zinc-700">وضعیت پرداخت‌ها</h3>
          {stats && stats.paymentsByStatus.length > 0 ? (
            <div className="space-y-2">
              {stats.paymentsByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                  <span className="text-zinc-600">{PAY_STATUS_LABELS[s.status] ?? s.status}</span>
                  <span className="font-bold text-zinc-900">{toFa(s.count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">پرداختی ثبت نشده است</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  color,
  href,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className={`absolute -left-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${color} opacity-10 transition group-hover:opacity-20`} />
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-md`}>
        {icon}
      </div>
      <div className="text-xs font-medium text-zinc-500">{title}</div>
      <div className="mt-1 text-2xl font-extrabold text-zinc-900">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-zinc-400">{sub}</div>}
    </Link>
  );
}
