"use client";

import Link from "next/link";
import { Package, ChevronLeft, CreditCard, Truck } from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /dashboard — "سفارشات فروشگاه" section
   Renders the user's HEAVIX store orders inside their HEAVIX
   dashboard. Server-fetched in page.tsx (via the storeDb Prisma
   client) and passed in as serialized props.
   ============================================================ */

const ORDER_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تایید شده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل شده",
  CANCELLED: "لغو شده",
};

const PAYMENT_STATUS_FA: Record<string, string> = {
  UNPAID: "پرداخت‌نشده",
  PARTIAL: "بخشی پرداخت شده",
  PAID: "پرداخت شده",
  REFUNDED: "بازگردانده شده",
};

export interface StoreOrderItem {
  id: string;
  partNameSnapshot: string;
  quantity: number;
  lineTotalIrr: number;
}

export interface StoreOrderPayment {
  id: string;
  amountIrr: number;
  status: string;
  method: string;
}

export interface StoreOrderLite {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalIrr: number;
  currencyRateAtOrder: number;
  createdAt: string | null;
  items: StoreOrderItem[];
  payments: StoreOrderPayment[];
}

function formatIrr(n: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

export function StoreOrdersSection({ orders }: { orders: StoreOrderLite[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Package className="size-5 text-[#F58220]" />
            سفارش‌های فروشگاه هویکس
          </h2>
          <p className="mt-1 text-xs text-white/40">
            {toFa(orders.length)} سفارش ثبت شده در فروشگاه قطعات
          </p>
        </div>
        <Link
          href="/store"
          className="rounded-full border border-[#F58220]/40 px-4 py-2 text-xs font-bold text-[#F58220] transition hover:bg-[#F58220]/10"
        >
          رفتان به فروشگاه ←
        </Link>
      </div>

      <div className="mt-5">
        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/30 px-6 py-10 text-center">
            <p className="text-sm text-white/45">
              هنوز سفارشی در فروشگاه هویکس ثبت نکرده‌اید.
            </p>
            <Link
              href="/store"
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#F58220]"
            >
              مشاهده قطعات و خرید ←
            </Link>
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            <ul className="divide-y divide-white/5">
              {orders.map((o) => {
                const isPaid = o.paymentStatus === "PAID";
                const isDelivered = o.status === "DELIVERED";
                return (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {o.orderNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            isDelivered
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : o.status === "CANCELLED"
                                ? "border-red-500/30 bg-red-500/10 text-red-400"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {ORDER_STATUS_FA[o.status] ?? o.status}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            isPaid
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-white/10 bg-white/5 text-white/60"
                          }`}
                        >
                          <CreditCard className="size-3" />
                          {PAYMENT_STATUS_FA[o.paymentStatus] ?? o.paymentStatus}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-white/45">
                        {o.items
                          .slice(0, 3)
                          .map((it) => `${it.partNameSnapshot} ×${toFa(it.quantity)}`)
                          .join("، ")}
                        {o.items.length > 3
                          ? ` +${toFa(o.items.length - 3)}`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/35">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString("fa-IR") : "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="num-fa text-xs font-bold text-[#F58220]">
                        {formatIrr(o.totalIrr)} تومان
                      </span>
                      <Link
                        href="/store"
                        className="inline-flex items-center gap-0.5 text-[10px] text-white/50 transition hover:text-[#F58220]"
                      >
                        جزئیات
                        <ChevronLeft className="size-3" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-white/40">
        <Truck className="size-3.5" />
        سفارش‌های فروشگاه هویکس با همان حساب کاربری هویکس شما ثبت می‌شوند.
      </div>
    </section>
  );
}
